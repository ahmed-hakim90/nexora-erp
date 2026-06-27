import { randomUUID } from "node:crypto";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";
import type { BusinessDocumentService } from "@/features/business-documents/public-api";
import { createInventoryTransactionServices } from "@/features/inventory/public-api";
import {
  createDomainEvent,
  createEventMetadata,
  defineEventName,
  type EnqueueEventOutboxInput,
  type EventName,
} from "@/platform/integration/public-api";
import { requirePermission } from "@/platform/permissions/server";

import { PURCHASING_PERMISSIONS } from "../../permissions/permission-registry";
import type {
  PurchaseDocumentDetail,
  PurchaseDocumentKind,
  PurchaseDocumentMutationInput,
  PurchaseDocumentRecord,
  PurchaseOrderStatus,
  PurchaseStatus,
  PurchasingRepository,
  ReceiptPostingInput,
} from "../types/purchasing";

const DOCUMENT_TYPE_BY_KIND: Record<PurchaseDocumentKind, string> = {
  order: "purchase_order",
  receipt: "purchase_receipt",
  request: "purchase_request",
  rfq: "purchase_rfq",
};

const REQUEST_CREATED_EVENT = defineEventName("purchasing.request.created");
const REQUEST_APPROVED_EVENT = defineEventName("purchasing.request.approved");
const RFQ_SENT_EVENT = defineEventName("purchasing.rfq.sent");
const ORDER_CONFIRMED_EVENT = defineEventName("purchasing.order.confirmed");
const ORDER_PARTIALLY_RECEIVED_EVENT = defineEventName("purchasing.order.partially_received");
const ORDER_RECEIVED_EVENT = defineEventName("purchasing.order.received");
const RECEIPT_POSTED_EVENT = defineEventName("purchasing.receipt.posted");

type PurchasingOutbox = Readonly<{
  enqueue(input: EnqueueEventOutboxInput): Promise<unknown>;
}>;

export class PurchasingService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: PurchasingRepository,
    private readonly documentService: BusinessDocumentService,
    private readonly outbox: PurchasingOutbox,
  ) {}

  async list(kind: PurchaseDocumentKind, query: Parameters<PurchasingRepository["list"]>[1]) {
    await requirePermission({ context: this.context, permission: PURCHASING_PERMISSIONS.view });
    return this.repository.list(kind, query);
  }

  async read(kind: PurchaseDocumentKind, id: string): Promise<PurchaseDocumentDetail> {
    await requirePermission({ context: this.context, permission: PURCHASING_PERMISSIONS.view });
    return this.requireDetail(kind, id);
  }

  async create(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput): Promise<PurchaseDocumentDetail> {
    await requirePermission({ context: this.context, permission: this.createPermission(kind) });
    await this.validateMutation(kind, input);

    const document = await this.documentService.createShell({
      branchId: input.branchId,
      documentTypeKey: DOCUMENT_TYPE_BY_KIND[kind],
      metadata: { purchaseDocumentKind: kind },
      sourceModule: "purchasing",
      sourceEntityType: `purchase_${kind}`,
      status: "draft",
      title: input.title,
    });

    const detail = await this.repository.create(kind, { ...input, businessDocumentId: document.id });
    if (kind === "request") await this.publish(detail.document, REQUEST_CREATED_EVENT, "created");
    return detail;
  }

  async update(kind: PurchaseDocumentKind, id: string, input: PurchaseDocumentMutationInput): Promise<PurchaseDocumentDetail> {
    await requirePermission({ context: this.context, permission: this.createPermission(kind) });
    const detail = await this.requireDetail(kind, id);
    this.assertStatus(detail.document, ["draft"], "Only draft purchasing documents can be edited.");
    await this.validateMutation(kind, input);
    const updated = await this.repository.update(kind, id, input);
    await this.documentService.updateMetadata(detail.document.businessDocumentId, {
      metadata: { purchaseDocumentKind: kind },
      title: input.title,
    });
    return updated;
  }

  async transition(kind: PurchaseDocumentKind, id: string, status: PurchaseStatus): Promise<PurchaseDocumentRecord> {
    const detail = await this.requireDetail(kind, id);
    await requirePermission({ context: this.context, permission: this.transitionPermission(kind, status) });
    this.assertTransition(kind, detail.document.status, status);
    if (kind === "order" && status === "cancelled" && await this.repository.hasPostedReceipts(id)) {
      throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message: "Purchase orders with posted receipts cannot be cancelled until receipts are reversed." });
    }

    await this.documentService.changeStatus(detail.document.businessDocumentId, { status });
    const document = await this.repository.changeStatus(kind, id, status, detail.document.metadata);
    await this.publishTransitionEvent(document, status);
    return document;
  }

  async postReceipt(id: string, input: ReceiptPostingInput): Promise<PurchaseDocumentRecord> {
    const detail = await this.requireDetail("receipt", id);
    await requirePermission({ context: this.context, permission: PURCHASING_PERMISSIONS.receiptPost });
    this.assertStatus(detail.document, ["submitted"], "Only submitted purchase receipts can be posted.");
    if (!input.idempotencyKey.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt posting requires an idempotency key." });
    }
    if (!detail.document.purchaseOrderId || !detail.document.supplierId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt requires a purchase order and supplier." });
    }
    const destinationWarehouseId = String(detail.document.metadata.destinationWarehouseId ?? "");
    const destinationLocationId = String(detail.document.metadata.destinationLocationId ?? "");
    if (!destinationWarehouseId || !destinationLocationId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt requires destination warehouse and location." });
    }

    const { transactionService } = await createInventoryTransactionServices();
    let inventoryTransactionId = detail.document.inventoryTransactionId;
    if (!inventoryTransactionId) {
      const inventoryDetail = await transactionService.create({
        branchId: detail.document.branchId,
        destinationLocationId,
        destinationWarehouseId,
        lines: detail.lines.map((line) => ({
          destinationLocationId,
          destinationWarehouseId,
          productId: line.productId,
          quantity: line.quantity,
          unitCost: line.unitPrice,
          unitId: line.unitId,
        })),
        reason: `Purchase receipt ${detail.document.id}`,
        title: `Inventory receipt for ${detail.document.title}`,
        transactionDate: detail.document.documentDate ?? new Date().toISOString().slice(0, 10),
        transactionType: "goods_receipt",
      });
      inventoryTransactionId = inventoryDetail.transaction.id;
      await this.repository.attachReceiptInventoryTransaction(id, inventoryTransactionId);
    }

    const currentInventoryDetail = await transactionService.read(inventoryTransactionId);
    if (currentInventoryDetail.transaction.status === "draft") {
      await transactionService.submit(inventoryTransactionId);
    }
    const inventoryAfterSubmit = await transactionService.read(inventoryTransactionId);
    if (inventoryAfterSubmit.transaction.status === "submitted") {
      await transactionService.post(inventoryTransactionId, { idempotencyKey: input.idempotencyKey });
    }
    const inventoryAfterPost = await transactionService.read(inventoryTransactionId);
    if (inventoryAfterPost.transaction.status !== "posted") {
      throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message: "Purchase receipt inventory transaction must be posted before receipt posting completes." });
    }

    const orderStatus = await this.repository.applyReceiptToOrder(id);
    await this.documentService.changeStatus(detail.document.businessDocumentId, { status: "posted" });
    const receipt = await this.repository.changeStatus("receipt", id, "posted", {
      ...detail.document.metadata,
      inventoryTransactionId,
      orderQuantitiesApplied: true,
    });
    await this.publish(receipt, RECEIPT_POSTED_EVENT, "posted", { inventoryTransactionId });

    if (orderStatus === "partially_received") {
      await this.publishOrderReceiptState(detail.document.purchaseOrderId, ORDER_PARTIALLY_RECEIVED_EVENT, orderStatus);
    }
    if (orderStatus === "received") {
      await this.publishOrderReceiptState(detail.document.purchaseOrderId, ORDER_RECEIVED_EVENT, orderStatus);
    }
    return receipt;
  }

  async reverseReceipt(id: string, input: ReceiptPostingInput): Promise<PurchaseDocumentRecord> {
    const detail = await this.requireDetail("receipt", id);
    await requirePermission({ context: this.context, permission: PURCHASING_PERMISSIONS.receiptPost });
    this.assertStatus(detail.document, ["posted"], "Only posted purchase receipts can be reversed.");
    if (!input.idempotencyKey.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt reversal requires an idempotency key." });
    }
    if (!detail.document.inventoryTransactionId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt has no inventory transaction to reverse." });
    }

    const { transactionService } = await createInventoryTransactionServices();
    const inventoryDetail = await transactionService.read(detail.document.inventoryTransactionId);
    if (inventoryDetail.transaction.status === "posted") {
      await transactionService.reverse(detail.document.inventoryTransactionId, { idempotencyKey: input.idempotencyKey });
    }
    const reversedInventory = await transactionService.read(detail.document.inventoryTransactionId);
    if (reversedInventory.transaction.status !== "reversed") {
      throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message: "Purchase receipt inventory transaction must be reversed before receipt reversal completes." });
    }

    const orderStatus = await this.repository.reverseReceiptFromOrder(id);
    await this.documentService.changeStatus(detail.document.businessDocumentId, { status: "reversed" });
    const receipt = await this.repository.changeStatus("receipt", id, "reversed", {
      ...detail.document.metadata,
      orderQuantitiesApplied: true,
      orderQuantitiesReversed: true,
    });
    if (detail.document.purchaseOrderId && orderStatus === "partially_received") {
      await this.publishOrderReceiptState(detail.document.purchaseOrderId, ORDER_PARTIALLY_RECEIVED_EVENT, orderStatus);
    }
    return receipt;
  }

  private async requireDetail(kind: PurchaseDocumentKind, id: string): Promise<PurchaseDocumentDetail> {
    const detail = await this.repository.findDetail(kind, id);
    if (!detail) throw new ApplicationError({ code: "NOT_FOUND", message: "Purchasing document was not found." });
    return detail;
  }

  private async validateMutation(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput): Promise<void> {
    if (!this.context.tenantId) throw new ApplicationError({ code: "AUTHORIZATION_ERROR", message: "Purchasing requires tenant context." });
    if (kind === "request" && input.supplierId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase requests must not reference a supplier." });
    }
    if (["order", "receipt"].includes(kind) && !input.supplierId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase orders and receipts require a supplier." });
    }
    if (kind === "receipt" && (!input.purchaseOrderId || !input.destinationWarehouseId || !input.destinationLocationId)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipts require order, warehouse, and location references." });
    }
    await this.repository.assertPurchasingScope(kind, input);
  }

  private createPermission(kind: PurchaseDocumentKind) {
    if (kind === "request") return PURCHASING_PERMISSIONS.requestCreate;
    if (kind === "rfq") return PURCHASING_PERMISSIONS.rfqManage;
    if (kind === "order") return PURCHASING_PERMISSIONS.orderCreate;
    return PURCHASING_PERMISSIONS.receiptCreate;
  }

  private transitionPermission(kind: PurchaseDocumentKind, status: PurchaseStatus) {
    if (status === "cancelled") return PURCHASING_PERMISSIONS.cancel;
    if (kind === "request" && ["approved", "rejected"].includes(status)) return PURCHASING_PERMISSIONS.requestApprove;
    if (kind === "rfq") return PURCHASING_PERMISSIONS.rfqManage;
    if (kind === "order" && status === "approved") return PURCHASING_PERMISSIONS.orderApprove;
    if (kind === "order" && status === "confirmed") return PURCHASING_PERMISSIONS.orderConfirm;
    return this.createPermission(kind);
  }

  private assertStatus(document: PurchaseDocumentRecord, allowed: readonly string[], message: string): void {
    if (!allowed.includes(document.status)) throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message });
  }

  private assertTransition(kind: PurchaseDocumentKind, current: PurchaseStatus, next: PurchaseStatus): void {
    const allowed: Record<PurchaseDocumentKind, Record<string, readonly string[]>> = {
      order: {
        approved: ["confirmed", "cancelled"],
        confirmed: ["closed", "cancelled"],
        draft: ["submitted", "cancelled"],
        partially_received: ["closed", "cancelled"],
        received: ["closed"],
        submitted: ["approved", "cancelled"],
      },
      receipt: {
        draft: ["submitted", "cancelled"],
        submitted: ["cancelled"],
      },
      request: {
        approved: ["closed", "cancelled"],
        draft: ["submitted", "cancelled"],
        rejected: ["closed", "cancelled"],
        submitted: ["approved", "rejected", "cancelled"],
      },
      rfq: {
        draft: ["sent", "cancelled"],
        quoted: ["closed", "cancelled"],
        sent: ["quoted", "closed", "cancelled"],
      },
    };
    if (!allowed[kind][current]?.includes(next)) {
      throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message: `Invalid purchasing lifecycle transition from ${current} to ${next}.` });
    }
  }

  private async publishTransitionEvent(document: PurchaseDocumentRecord, status: PurchaseStatus) {
    if (document.kind === "request" && status === "approved") await this.publish(document, REQUEST_APPROVED_EVENT, "approved");
    if (document.kind === "rfq" && status === "sent") await this.publish(document, RFQ_SENT_EVENT, "sent");
    if (document.kind === "order" && status === "confirmed") await this.publish(document, ORDER_CONFIRMED_EVENT, "confirmed");
  }

  private async publishOrderReceiptState(orderId: string, eventName: EventName, status: PurchaseOrderStatus) {
    await this.publish({
      branchId: "",
      businessDocumentId: orderId,
      createdAt: new Date().toISOString(),
      documentDate: null,
      id: orderId,
      inventoryTransactionId: null,
      kind: "order",
      metadata: {},
      purchaseOrderId: null,
      status,
      supplierId: null,
      tenantId: this.context.tenantId,
      title: "Purchase order receipt state",
      updatedAt: new Date().toISOString(),
      version: 1,
    }, eventName, status);
  }

  private async publish(
    document: PurchaseDocumentRecord,
    eventName: EventName,
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const event = createDomainEvent({
      metadata: createEventMetadata({
        aggregateId: document.id,
        aggregateType: `purchase_${document.kind}`,
        context: this.context,
        eventId: randomUUID(),
        eventKind: "domain",
        eventName,
        eventVersion: 1,
        idempotencyKey: `purchasing.${document.kind}.${action}:${document.id}:${document.version}`,
        sourceModule: "purchasing",
      }),
      payload: {
        ...payload,
        businessDocumentId: document.businessDocumentId,
        documentId: document.id,
        kind: document.kind,
        status: document.status,
        tenantId: document.tenantId,
      },
    });
    await this.outbox.enqueue({ event, idempotencyKey: event.metadata.idempotencyKey });
  }
}
