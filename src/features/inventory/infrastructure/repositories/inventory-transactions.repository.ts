import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { InventoryListQuery, StockPostingLineInput } from "../../application/types";
import type {
  InventoryCycleCountLineRecord,
  InventoryCycleCountRecord,
  InventoryTransactionDetail,
  InventoryTransactionLineInput,
  InventoryTransactionLineRecord,
  InventoryTransactionMutationInput,
  InventoryTransactionPostingRecord,
  InventoryTransactionRecord,
  InventoryTransactionRepository,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from "../../application/types/inventory-transactions";

const TRANSACTION_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "business_document_id",
  "transaction_type",
  "status",
  "title",
  "transaction_date",
  "source_warehouse_id",
  "source_location_id",
  "destination_warehouse_id",
  "destination_location_id",
  "reason",
  "submitted_at",
  "posted_at",
  "cancelled_at",
  "reversed_at",
  "reversal_of_transaction_id",
  "metadata",
  "created_at",
  "updated_at",
  "version",
].join(", ");

const LINE_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "transaction_id",
  "line_number",
  "product_id",
  "unit_id",
  "source_warehouse_id",
  "source_location_id",
  "destination_warehouse_id",
  "destination_location_id",
  "quantity",
  "quantity_delta",
  "unit_cost",
  "reason",
  "metadata",
  "created_at",
].join(", ");

const POSTING_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "transaction_id",
  "posting_batch_id",
  "posting_kind",
  "idempotency_key",
  "metadata",
  "created_at",
].join(", ");

const CYCLE_COUNT_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "transaction_id",
  "business_document_id",
  "status",
  "count_date",
  "warehouse_id",
  "location_id",
  "notes",
  "posted_at",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

const CYCLE_COUNT_LINE_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "cycle_count_id",
  "transaction_line_id",
  "line_number",
  "product_id",
  "unit_id",
  "expected_quantity",
  "counted_quantity",
  "difference_quantity",
  "reason",
  "metadata",
  "created_at",
].join(", ");

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function encodeCursor(record: { createdAt: string; id: string } | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

function mapTransaction(row: Record<string, unknown>): InventoryTransactionRecord {
  return {
    branchId: row.branch_id as string,
    businessDocumentId: row.business_document_id as string,
    cancelledAt: row.cancelled_at as string | null,
    createdAt: row.created_at as string,
    destinationLocationId: row.destination_location_id as string | null,
    destinationWarehouseId: row.destination_warehouse_id as string | null,
    id: row.id as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    postedAt: row.posted_at as string | null,
    reason: row.reason as string | null,
    reversalOfTransactionId: row.reversal_of_transaction_id as string | null,
    reversedAt: row.reversed_at as string | null,
    sourceLocationId: row.source_location_id as string | null,
    sourceWarehouseId: row.source_warehouse_id as string | null,
    status: row.status as InventoryTransactionStatus,
    submittedAt: row.submitted_at as string | null,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    transactionDate: row.transaction_date as string,
    transactionType: row.transaction_type as InventoryTransactionType,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapLine(row: Record<string, unknown>): InventoryTransactionLineRecord {
  return {
    branchId: row.branch_id as string,
    createdAt: row.created_at as string,
    destinationLocationId: row.destination_location_id as string | null,
    destinationWarehouseId: row.destination_warehouse_id as string | null,
    id: row.id as string,
    lineNumber: Number(row.line_number),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    productId: row.product_id as string,
    quantity: row.quantity == null ? null : toNumber(row.quantity),
    quantityDelta: row.quantity_delta == null ? null : toNumber(row.quantity_delta),
    reason: row.reason as string | null,
    sourceLocationId: row.source_location_id as string | null,
    sourceWarehouseId: row.source_warehouse_id as string | null,
    tenantId: row.tenant_id as string,
    transactionId: row.transaction_id as string,
    unitCost: toNumber(row.unit_cost),
    unitId: row.unit_id as string,
  };
}

function mapPosting(row: Record<string, unknown>): InventoryTransactionPostingRecord {
  return {
    branchId: row.branch_id as string,
    createdAt: row.created_at as string,
    id: row.id as string,
    idempotencyKey: row.idempotency_key as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    postingBatchId: row.posting_batch_id as string,
    postingKind: row.posting_kind as "post" | "reversal",
    tenantId: row.tenant_id as string,
    transactionId: row.transaction_id as string,
  };
}

function mapCycleCount(row: Record<string, unknown>): InventoryCycleCountRecord {
  return {
    branchId: row.branch_id as string,
    businessDocumentId: row.business_document_id as string,
    countDate: row.count_date as string,
    createdAt: row.created_at as string,
    id: row.id as string,
    locationId: row.location_id as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    notes: row.notes as string | null,
    postedAt: row.posted_at as string | null,
    status: row.status as InventoryTransactionStatus,
    tenantId: row.tenant_id as string,
    transactionId: row.transaction_id as string,
    updatedAt: row.updated_at as string,
    warehouseId: row.warehouse_id as string,
  };
}

function mapCycleCountLine(row: Record<string, unknown>): InventoryCycleCountLineRecord {
  return {
    branchId: row.branch_id as string,
    countedQuantity: toNumber(row.counted_quantity),
    createdAt: row.created_at as string,
    cycleCountId: row.cycle_count_id as string,
    differenceQuantity: toNumber(row.difference_quantity),
    expectedQuantity: toNumber(row.expected_quantity),
    id: row.id as string,
    lineNumber: Number(row.line_number),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    productId: row.product_id as string,
    reason: row.reason as string | null,
    tenantId: row.tenant_id as string,
    transactionLineId: row.transaction_line_id as string | null,
    unitId: row.unit_id as string,
  };
}

export class SupabaseInventoryTransactionRepository implements InventoryTransactionRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async listTransactions(query: InventoryListQuery) {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.supabase
      .from("inventory_transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .limit(pageSize + 1);

    if (query.status) request = request.eq("status", query.status);
    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term) request = request.or(`title.ilike.%${term}%,reason.ilike.%${term}%,transaction_type.ilike.%${term}%`);
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

    const { data, error } = await request.order("created_at", { ascending: false }).order("id", { ascending: false });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not list inventory transactions.", cause: error });

    const records = ((data ?? []) as unknown as Record<string, unknown>[]).map(mapTransaction);
    const visibleRecords = records.slice(0, pageSize);
    return {
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
      records: visibleRecords,
    };
  }

  async findTransactionDetail(id: string): Promise<InventoryTransactionDetail | null> {
    const { data, error } = await this.supabase
      .from("inventory_transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read inventory transaction.", cause: error });
    if (!data) return null;

    return this.loadDetail(mapTransaction(data as unknown as Record<string, unknown>));
  }

  async createTransaction(input: {
    transaction: InventoryTransactionMutationInput;
    businessDocumentId: string;
  }): Promise<InventoryTransactionDetail> {
    const payload = this.transactionPayload(input.transaction, input.businessDocumentId);
    const { data, error } = await this.supabase.from("inventory_transactions").insert(payload).select(TRANSACTION_COLUMNS).single();
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create inventory transaction.", cause: error });

    const transaction = mapTransaction(data as unknown as Record<string, unknown>);
    await this.replaceLines(transaction, input.transaction.lines);
    return this.loadDetail(transaction);
  }

  async updateTransaction(id: string, input: InventoryTransactionMutationInput): Promise<InventoryTransactionDetail> {
    const detail = await this.findTransactionDetail(id);
    if (!detail) throw new ApplicationError({ code: "NOT_FOUND", message: "Inventory transaction was not found." });

    const payload = this.transactionPayload(input, detail.transaction.businessDocumentId);
    const { data, error } = await this.supabase
      .from("inventory_transactions")
      .update({ ...payload, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(TRANSACTION_COLUMNS)
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update inventory transaction.", cause: error });

    const transaction = mapTransaction(data as unknown as Record<string, unknown>);
    await this.softDeleteLines(transaction.id);
    await this.replaceLines(transaction, input.lines);
    return this.loadDetail(transaction);
  }

  async changeTransactionStatus(input: {
    id: string;
    status: InventoryTransactionStatus;
    businessDocumentStatus: string;
    metadata?: Record<string, unknown>;
  }): Promise<InventoryTransactionRecord> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      metadata: input.metadata ?? {},
      status: input.status,
      updated_by: this.context.userId,
    };

    if (input.status === "submitted") Object.assign(payload, { submitted_at: now, submitted_by: this.context.userId });
    if (input.status === "posted") Object.assign(payload, { posted_at: now, posted_by: this.context.userId });
    if (input.status === "cancelled") Object.assign(payload, { cancelled_at: now, cancelled_by: this.context.userId });
    if (input.status === "reversed") Object.assign(payload, { reversed_at: now, reversed_by: this.context.userId });

    const { data, error } = await this.supabase
      .from("inventory_transactions")
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.id)
      .is("deleted_at", null)
      .select(TRANSACTION_COLUMNS)
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not change inventory transaction status.", cause: error });

    const transaction = mapTransaction(data as unknown as Record<string, unknown>);
    if (transaction.transactionType === "cycle_count") {
      await this.supabase
        .from("inventory_cycle_counts")
        .update({
          posted_at: input.status === "posted" ? now : null,
          posted_by: input.status === "posted" ? this.context.userId : null,
          status: input.status,
          updated_by: this.context.userId,
        })
        .eq("tenant_id", this.context.tenantId)
        .eq("transaction_id", transaction.id)
        .is("deleted_at", null);
    }

    return transaction;
  }

  async recordPosting(input: {
    branchId: string;
    transactionId: string;
    postingBatchId: string;
    postingKind: "post" | "reversal";
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<InventoryTransactionPostingRecord> {
    const { data, error } = await this.supabase.rpc("record_inventory_transaction_posting", {
      input_branch_id: input.branchId,
      input_idempotency_key: input.idempotencyKey,
      input_metadata: input.metadata ?? {},
      input_posting_batch_id: input.postingBatchId,
      input_posting_kind: input.postingKind,
      input_tenant_id: this.context.tenantId,
      input_transaction_id: input.transactionId,
    });

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not record inventory transaction posting.", cause: error });
    return mapPosting(data as unknown as Record<string, unknown>);
  }

  async assertPostingScope(input: StockPostingLineInput & { branchId: string }): Promise<void> {
    const [product, warehouse, location, unit] = await Promise.all([
      this.supabase
        .from("inventory_products")
        .select("id, product_kind")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.productId)
        .neq("product_kind", "service")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_warehouses")
        .select("id, branch_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.warehouseId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_locations")
        .select("id, branch_id, warehouse_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.locationId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_uoms")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.unitId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    for (const result of [product, warehouse, location, unit]) {
      if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate transaction line scope.", cause: result.error });
    }

    if (!product.data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction product must be active and stockable." });
    if (!warehouse.data || (warehouse.data.branch_id as string) !== input.branchId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction warehouse must belong to the branch." });
    }
    if (!location.data || (location.data.branch_id as string) !== input.branchId || (location.data.warehouse_id as string) !== input.warehouseId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction location must belong to the warehouse and branch." });
    }
    if (!unit.data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Inventory transaction unit must belong to the tenant." });
  }

  private transactionPayload(input: InventoryTransactionMutationInput, businessDocumentId: string) {
    return {
      branch_id: input.branchId,
      business_document_id: businessDocumentId,
      created_by: this.context.userId,
      destination_location_id: normalizeText(input.destinationLocationId),
      destination_warehouse_id: normalizeText(input.destinationWarehouseId),
      metadata: {},
      reason: normalizeText(input.reason),
      source_location_id: normalizeText(input.sourceLocationId),
      source_warehouse_id: normalizeText(input.sourceWarehouseId),
      tenant_id: this.context.tenantId,
      title: input.title.trim(),
      transaction_date: input.transactionDate || new Date().toISOString().slice(0, 10),
      transaction_type: input.transactionType,
      updated_by: this.context.userId,
    };
  }

  private async replaceLines(transaction: InventoryTransactionRecord, lines: readonly InventoryTransactionLineInput[]) {
    const payload = lines.map((line, index) => ({
      branch_id: transaction.branchId,
      created_by: this.context.userId,
      destination_location_id: normalizeText(line.destinationLocationId ?? transaction.destinationLocationId),
      destination_warehouse_id: normalizeText(line.destinationWarehouseId ?? transaction.destinationWarehouseId),
      line_number: index + 1,
      metadata: {},
      product_id: line.productId,
      quantity: line.quantity ?? null,
      quantity_delta: line.quantityDelta ?? null,
      reason: normalizeText(line.reason ?? transaction.reason),
      source_location_id: normalizeText(line.sourceLocationId ?? transaction.sourceLocationId),
      source_warehouse_id: normalizeText(line.sourceWarehouseId ?? transaction.sourceWarehouseId),
      tenant_id: this.context.tenantId,
      transaction_id: transaction.id,
      unit_cost: line.unitCost ?? 0,
      unit_id: line.unitId,
      updated_by: this.context.userId,
    }));

    const { data, error } = await this.supabase.from("inventory_transaction_lines").insert(payload).select(LINE_COLUMNS);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save inventory transaction lines.", cause: error });

    if (transaction.transactionType === "cycle_count") {
      await this.upsertCycleCount(transaction, lines, (data ?? []) as unknown as Record<string, unknown>[]);
    }
  }

  private async softDeleteLines(transactionId: string) {
    const { error } = await this.supabase
      .from("inventory_transaction_lines")
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("transaction_id", transactionId)
      .is("deleted_at", null);

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not replace inventory transaction lines.", cause: error });
  }

  private async upsertCycleCount(
    transaction: InventoryTransactionRecord,
    lines: readonly InventoryTransactionLineInput[],
    transactionLineRows: readonly Record<string, unknown>[],
  ) {
    const warehouseId = transaction.destinationWarehouseId ?? transaction.sourceWarehouseId;
    const locationId = transaction.destinationLocationId ?? transaction.sourceLocationId;
    if (!warehouseId || !locationId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Cycle count requires a warehouse and location." });
    }

    await this.supabase
      .from("inventory_cycle_counts")
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("transaction_id", transaction.id)
      .is("deleted_at", null);

    const { data: count, error: countError } = await this.supabase
      .from("inventory_cycle_counts")
      .insert({
        branch_id: transaction.branchId,
        business_document_id: transaction.businessDocumentId,
        count_date: transaction.transactionDate,
        created_by: this.context.userId,
        location_id: locationId,
        metadata: {},
        notes: transaction.reason,
        tenant_id: this.context.tenantId,
        transaction_id: transaction.id,
        updated_by: this.context.userId,
        warehouse_id: warehouseId,
      })
      .select(CYCLE_COUNT_COLUMNS)
      .single();

    if (countError) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save cycle count header.", cause: countError });

    const cycleCount = mapCycleCount(count as unknown as Record<string, unknown>);
    const linePayload = lines.map((line, index) => ({
      branch_id: transaction.branchId,
      counted_quantity: line.countedQuantity ?? Math.max(line.quantityDelta ?? 0, 0),
      created_by: this.context.userId,
      cycle_count_id: cycleCount.id,
      expected_quantity: line.expectedQuantity ?? 0,
      line_number: index + 1,
      metadata: {},
      product_id: line.productId,
      reason: normalizeText(line.reason),
      tenant_id: this.context.tenantId,
      transaction_line_id: transactionLineRows[index]?.id as string | undefined,
      unit_id: line.unitId,
      updated_by: this.context.userId,
    }));

    const { error: lineError } = await this.supabase.from("inventory_cycle_count_lines").insert(linePayload);
    if (lineError) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save cycle count lines.", cause: lineError });
  }

  private async loadDetail(transaction: InventoryTransactionRecord): Promise<InventoryTransactionDetail> {
    const [lines, postings, cycleCounts] = await Promise.all([
      this.supabase
        .from("inventory_transaction_lines")
        .select(LINE_COLUMNS)
        .eq("tenant_id", this.context.tenantId)
        .eq("transaction_id", transaction.id)
        .is("deleted_at", null)
        .order("line_number", { ascending: true }),
      this.supabase
        .from("inventory_transaction_postings")
        .select(POSTING_COLUMNS)
        .eq("tenant_id", this.context.tenantId)
        .eq("transaction_id", transaction.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      this.supabase
        .from("inventory_cycle_counts")
        .select(CYCLE_COUNT_COLUMNS)
        .eq("tenant_id", this.context.tenantId)
        .eq("transaction_id", transaction.id)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    for (const result of [lines, postings, cycleCounts]) {
      if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory transaction detail.", cause: result.error });
    }

    const cycleCount = cycleCounts.data ? mapCycleCount(cycleCounts.data as unknown as Record<string, unknown>) : null;
    const cycleCountLines = cycleCount ? await this.loadCycleCountLines(cycleCount.id) : [];

    return {
      cycleCount,
      cycleCountLines,
      lines: ((lines.data ?? []) as unknown as Record<string, unknown>[]).map(mapLine),
      postings: ((postings.data ?? []) as unknown as Record<string, unknown>[]).map(mapPosting),
      transaction,
    };
  }

  private async loadCycleCountLines(cycleCountId: string): Promise<readonly InventoryCycleCountLineRecord[]> {
    const { data, error } = await this.supabase
      .from("inventory_cycle_count_lines")
      .select(CYCLE_COUNT_LINE_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("cycle_count_id", cycleCountId)
      .is("deleted_at", null)
      .order("line_number", { ascending: true });

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load cycle count lines.", cause: error });
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCycleCountLine);
  }
}
