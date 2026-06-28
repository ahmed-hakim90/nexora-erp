import { randomUUID } from "node:crypto";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/public-api";
import { recordAuditEvent } from "@/platform/audit/server";
import type { BusinessDocumentService } from "@/features/business-documents/public-api";
import {
  createDomainEvent,
  createEventMetadata,
  defineEventName,
  type EnqueueEventOutboxInput,
  type EventName,
} from "@/platform/integration/public-api";
import { requirePermission } from "@/platform/permissions/server";

import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import type { StockPostingService } from "./stock-posting.service";
import type { StockPostingLineInput } from "../types";
import type {
  InventoryTransactionDetail,
  InventoryTransactionMutationInput,
  InventoryTransactionRecord,
  InventoryTransactionRepository,
  InventoryTransactionType,
} from "../types/inventory-transactions";

const DOCUMENT_TYPE_BY_TRANSACTION: Record<InventoryTransactionType, string> = {
  cycle_count: "inventory_cycle_count",
  goods_issue: "inventory_issue",
  goods_receipt: "inventory_receipt",
  stock_adjustment: "inventory_adjustment",
  warehouse_transfer: "inventory_transfer",
};

const TRANSACTION_CREATED_EVENT = defineEventName("inventory.transaction.created");
const TRANSACTION_SUBMITTED_EVENT = defineEventName("inventory.transaction.submitted");
const TRANSACTION_POSTED_EVENT = defineEventName("inventory.transaction.posted");
const TRANSACTION_CANCELLED_EVENT = defineEventName("inventory.transaction.cancelled");
const TRANSACTION_REVERSED_EVENT = defineEventName("inventory.transaction.reversed");
const CYCLE_COUNT_POSTED_EVENT = defineEventName("inventory.cycle-count.posted");

type InventoryTransactionOutbox = Readonly<{
  enqueue(input: EnqueueEventOutboxInput): Promise<unknown>;
}>;

export class InventoryTransactionService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: InventoryTransactionRepository,
    private readonly stockPostingService: StockPostingService,
    private readonly documentService: BusinessDocumentService,
    private readonly outbox: InventoryTransactionOutbox,
  ) {}

  async list(query: Parameters<InventoryTransactionRepository["listTransactions"]>[0]) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.transactionView });
    return this.repository.listTransactions(query);
  }

  async read(id: string): Promise<InventoryTransactionDetail> {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.transactionView });
    return this.requireDetail(id);
  }

  async create(input: InventoryTransactionMutationInput): Promise<InventoryTransactionDetail> {
    await requirePermission({ context: this.context, permission: this.managePermission(input.transactionType, "create") });
    await this.validateMutation(input);

    const document = await this.documentService.createShell({
      branchId: input.branchId,
      documentTypeKey: DOCUMENT_TYPE_BY_TRANSACTION[input.transactionType],
      metadata: { transactionType: input.transactionType },
      sourceModule: "inventory",
      sourceEntityType: "inventory_transaction",
      status: "draft",
      title: input.title,
    });

    const detail = await this.repository.createTransaction({
      businessDocumentId: document.id,
      transaction: input,
    });

    await this.recordAudit(detail.transaction, "created");
    await this.publishTransactionEvent(detail.transaction, TRANSACTION_CREATED_EVENT, "created");
    return detail;
  }

  async update(id: string, input: InventoryTransactionMutationInput): Promise<InventoryTransactionDetail> {
    await requirePermission({ context: this.context, permission: this.managePermission(input.transactionType, "update") });
    const detail = await this.requireDetail(id);
    this.assertStatus(detail.transaction, ["draft"], "Only draft inventory transactions can be edited.");
    await this.validateMutation(input);

    const updated = await this.repository.updateTransaction(id, input);
    await this.documentService.updateMetadata(detail.transaction.businessDocumentId, {
      metadata: { transactionType: input.transactionType },
      title: input.title,
    });
    await this.recordAudit(updated.transaction, "updated");
    return updated;
  }

  async submit(id: string): Promise<InventoryTransactionRecord> {
    const detail = await this.requireDetail(id);
    await requirePermission({ context: this.context, permission: this.managePermission(detail.transaction.transactionType, "submit") });
    this.assertStatus(detail.transaction, ["draft"], "Only draft inventory transactions can be submitted.");
    await this.validatePostingDetail(detail);

    await this.documentService.changeStatus(detail.transaction.businessDocumentId, { status: "submitted" });
    const transaction = await this.repository.changeTransactionStatus({
      businessDocumentStatus: "submitted",
      id,
      metadata: detail.transaction.metadata,
      status: "submitted",
    });
    await this.recordAudit(transaction, "submitted");
    await this.publishTransactionEvent(transaction, TRANSACTION_SUBMITTED_EVENT, "submitted");
    return transaction;
  }

  async cancel(id: string): Promise<InventoryTransactionRecord> {
    const detail = await this.requireDetail(id);
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.transactionCancel });
    this.assertStatus(detail.transaction, ["draft", "submitted"], "Only draft or submitted inventory transactions can be cancelled.");

    await this.documentService.changeStatus(detail.transaction.businessDocumentId, { status: "cancelled" });
    const transaction = await this.repository.changeTransactionStatus({
      businessDocumentStatus: "cancelled",
      id,
      metadata: detail.transaction.metadata,
      status: "cancelled",
    });
    await this.recordAudit(transaction, "cancelled");
    await this.publishTransactionEvent(transaction, TRANSACTION_CANCELLED_EVENT, "cancelled");
    return transaction;
  }

  async post(id: string, input: { idempotencyKey: string }): Promise<InventoryTransactionRecord> {
    const detail = await this.requireDetail(id);
    await requirePermission({ context: this.context, permission: this.managePermission(detail.transaction.transactionType, "post") });
    this.assertStatus(detail.transaction, ["submitted"], "Only submitted inventory transactions can be posted.");
    if (!input.idempotencyKey.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Posting requires an idempotency key." });
    }
    if (detail.postings.some((posting) => posting.postingKind === "post")) {
      throw new ApplicationError({ code: "CONFLICT", message: "Inventory transaction has already been posted." });
    }

    await this.validatePostingDetail(detail);
    const postingLines = this.toPostingLines(detail);
    const batch = await this.stockPostingService.post({
      branchId: detail.transaction.branchId,
      correlationId: this.context.correlationId,
      documentId: detail.transaction.businessDocumentId,
      idempotencyKey: input.idempotencyKey,
      lines: postingLines,
      metadata: {
        inventoryTransactionId: id,
        transactionType: detail.transaction.transactionType,
      },
    });

    await this.repository.recordPosting({
      branchId: detail.transaction.branchId,
      idempotencyKey: input.idempotencyKey,
      metadata: { transactionType: detail.transaction.transactionType },
      postingBatchId: batch.id,
      postingKind: "post",
      transactionId: id,
    });
    await this.documentService.changeStatus(detail.transaction.businessDocumentId, { status: "posted" });
    const transaction = await this.repository.changeTransactionStatus({
      businessDocumentStatus: "posted",
      id,
      metadata: { ...detail.transaction.metadata, postingBatchId: batch.id },
      status: "posted",
    });

    await this.recordAudit(transaction, "posted", { postingBatchId: batch.id });
    await this.publishTransactionEvent(transaction, TRANSACTION_POSTED_EVENT, "posted", { postingBatchId: batch.id });
    if (transaction.transactionType === "cycle_count") {
      await this.publishTransactionEvent(transaction, CYCLE_COUNT_POSTED_EVENT, "cycle-count.posted", { postingBatchId: batch.id });
    }
    return transaction;
  }

  async reverse(id: string, input: { idempotencyKey: string }): Promise<InventoryTransactionRecord> {
    const detail = await this.requireDetail(id);
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.transactionReverse });
    this.assertStatus(detail.transaction, ["posted"], "Only posted inventory transactions can be reversed.");
    if (!input.idempotencyKey.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Reversal requires an idempotency key." });
    }
    if (detail.postings.some((posting) => posting.postingKind === "reversal")) {
      throw new ApplicationError({ code: "CONFLICT", message: "Inventory transaction has already been reversed." });
    }

    const originalPosting = detail.postings.find((posting) => posting.postingKind === "post");
    if (!originalPosting) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction has no posting batch to reverse." });
    }

    const batch = await this.stockPostingService.reverse({
      correlationId: this.context.correlationId,
      documentId: detail.transaction.businessDocumentId,
      idempotencyKey: input.idempotencyKey,
      metadata: { inventoryTransactionId: id },
      postingBatchId: originalPosting.postingBatchId,
    });

    await this.repository.recordPosting({
      branchId: detail.transaction.branchId,
      idempotencyKey: input.idempotencyKey,
      metadata: { reversedPostingBatchId: originalPosting.postingBatchId },
      postingBatchId: batch.id,
      postingKind: "reversal",
      transactionId: id,
    });
    await this.documentService.changeStatus(detail.transaction.businessDocumentId, { status: "reversed" });
    const transaction = await this.repository.changeTransactionStatus({
      businessDocumentStatus: "reversed",
      id,
      metadata: { ...detail.transaction.metadata, reversalPostingBatchId: batch.id },
      status: "reversed",
    });
    await this.recordAudit(transaction, "reversed", { postingBatchId: batch.id });
    await this.publishTransactionEvent(transaction, TRANSACTION_REVERSED_EVENT, "reversed", { postingBatchId: batch.id });
    return transaction;
  }

  protected async requireDetail(id: string): Promise<InventoryTransactionDetail> {
    const detail = await this.repository.findTransactionDetail(id);
    if (!detail) throw new ApplicationError({ code: "NOT_FOUND", message: "Inventory transaction was not found." });
    return detail;
  }

  private async validateMutation(input: InventoryTransactionMutationInput): Promise<void> {
    if (!this.context.tenantId) throw new ApplicationError({ code: "AUTHORIZATION_ERROR", message: "Inventory transaction requires tenant context." });
    if (!input.branchId.trim()) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction requires branch context." });
    if (input.lines.length === 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction requires at least one line." });
    if (input.transactionType === "stock_adjustment" && !input.reason?.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock adjustment requires a reason." });
    }
    if (input.transactionType === "warehouse_transfer" && input.sourceLocationId === input.destinationLocationId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Warehouse transfer cannot use the same source and destination location." });
    }
  }

  private async validatePostingDetail(detail: InventoryTransactionDetail): Promise<void> {
    const postingLines = this.toPostingLines(detail);
    if (postingLines.length === 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction has no posting lines." });
    await Promise.all(postingLines.map((line) => this.repository.assertPostingScope({ ...line, branchId: detail.transaction.branchId })));
  }

  private toPostingLines(detail: InventoryTransactionDetail): readonly StockPostingLineInput[] {
    const transaction = detail.transaction;
    if (transaction.transactionType === "cycle_count") {
      return detail.cycleCountLines
        .filter((line) => line.differenceQuantity !== 0)
        .map((line) => this.adjustmentLine(transaction, {
          productId: line.productId,
          quantityDelta: line.differenceQuantity,
          reason: line.reason,
          unitCost: 0,
          unitId: line.unitId,
        }));
    }

    return detail.lines.flatMap((line) => {
      if (transaction.transactionType === "stock_adjustment") {
        return [this.adjustmentLine(transaction, line)];
      }
      if (transaction.transactionType === "warehouse_transfer") {
        const quantity = line.quantity ?? 0;
        return [
          {
            direction: "out" as const,
            locationId: line.sourceLocationId ?? transaction.sourceLocationId ?? "",
            metadata: { inventoryTransactionLineId: line.id },
            movementTypeKey: "transfer",
            productId: line.productId,
            quantity,
            unitCost: line.unitCost,
            unitId: line.unitId,
            warehouseId: line.sourceWarehouseId ?? transaction.sourceWarehouseId ?? "",
          },
          {
            direction: "in" as const,
            locationId: line.destinationLocationId ?? transaction.destinationLocationId ?? "",
            metadata: { inventoryTransactionLineId: line.id },
            movementTypeKey: "transfer",
            productId: line.productId,
            quantity,
            unitCost: line.unitCost,
            unitId: line.unitId,
            warehouseId: line.destinationWarehouseId ?? transaction.destinationWarehouseId ?? "",
          },
        ];
      }
      if (transaction.transactionType === "goods_receipt") {
        return [{
          direction: "in" as const,
          locationId: line.destinationLocationId ?? transaction.destinationLocationId ?? "",
          metadata: { inventoryTransactionLineId: line.id },
          movementTypeKey: "receipt",
          productId: line.productId,
          quantity: line.quantity ?? 0,
          unitCost: line.unitCost,
          unitId: line.unitId,
          warehouseId: line.destinationWarehouseId ?? transaction.destinationWarehouseId ?? "",
        }];
      }
      return [{
        direction: "out" as const,
        locationId: line.sourceLocationId ?? transaction.sourceLocationId ?? "",
        metadata: { inventoryTransactionLineId: line.id },
        movementTypeKey: "issue",
        productId: line.productId,
        quantity: line.quantity ?? 0,
        unitCost: line.unitCost,
        unitId: line.unitId,
        warehouseId: line.sourceWarehouseId ?? transaction.sourceWarehouseId ?? "",
      }];
    });
  }

  private adjustmentLine(transaction: InventoryTransactionRecord, line: {
    productId: string;
    quantityDelta: number | null | undefined;
    reason?: string | null;
    unitCost: number;
    unitId: string;
  }): StockPostingLineInput {
    const quantityDelta = line.quantityDelta ?? 0;
    if (quantityDelta === 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock adjustment quantity delta cannot be zero." });

    return {
      direction: quantityDelta > 0 ? "in" : "out",
      locationId: transaction.destinationLocationId ?? transaction.sourceLocationId ?? "",
      metadata: { reason: line.reason ?? transaction.reason },
      movementTypeKey: "adjustment",
      productId: line.productId,
      quantity: Math.abs(quantityDelta),
      unitCost: line.unitCost,
      unitId: line.unitId,
      warehouseId: transaction.destinationWarehouseId ?? transaction.sourceWarehouseId ?? "",
    };
  }

  private assertStatus(transaction: InventoryTransactionRecord, allowed: readonly string[], message: string): void {
    if (!allowed.includes(transaction.status)) throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message });
  }

  private managePermission(type: InventoryTransactionType, action: "create" | "update" | "submit" | "post") {
    if (type === "cycle_count") {
      if (action === "post") return INVENTORY_PERMISSIONS.cycleCountPost;
      return INVENTORY_PERMISSIONS.cycleCountManage;
    }
    if (action === "create") return INVENTORY_PERMISSIONS.transactionCreate;
    if (action === "update") return INVENTORY_PERMISSIONS.transactionUpdate;
    if (action === "submit") return INVENTORY_PERMISSIONS.transactionSubmit;
    return INVENTORY_PERMISSIONS.transactionPost;
  }

  private async publishTransactionEvent(
    transaction: InventoryTransactionRecord,
    eventName: EventName,
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const event = createDomainEvent({
      metadata: createEventMetadata({
        aggregateId: transaction.id,
        aggregateType: "inventory_transaction",
        context: this.context,
        eventId: randomUUID(),
        eventKind: "domain",
        eventName,
        eventVersion: 1,
        idempotencyKey: `inventory.transaction.${action}:${transaction.id}:${transaction.version}`,
        sourceModule: "inventory",
      }),
      payload: {
        ...payload,
        businessDocumentId: transaction.businessDocumentId,
        status: transaction.status,
        tenantId: transaction.tenantId,
        transactionId: transaction.id,
        transactionType: transaction.transactionType,
      },
    });

    await this.outbox.enqueue({ event, idempotencyKey: event.metadata.idempotencyKey });
  }

  private async recordAudit(transaction: InventoryTransactionRecord, action: string, metadata: Record<string, unknown> = {}) {
    await recordAuditEvent({
      action: defineAuditAction(`inventory.transaction.${action}`),
      context: this.context,
      entityId: transaction.id,
      entityType: "inventory_transaction",
      metadata: {
        ...metadata,
        businessDocumentId: transaction.businessDocumentId,
        transactionType: transaction.transactionType,
      },
      module: "inventory",
    });
  }
}

export class StockAdjustmentService extends InventoryTransactionService {}
export class WarehouseTransferService extends InventoryTransactionService {}
export class GoodsReceiptService extends InventoryTransactionService {}
export class GoodsIssueService extends InventoryTransactionService {}
export class CycleCountService extends InventoryTransactionService {}
