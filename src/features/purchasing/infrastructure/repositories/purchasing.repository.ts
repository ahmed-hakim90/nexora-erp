import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type {
  PurchaseDocumentDetail,
  PurchaseDocumentKind,
  PurchaseDocumentMutationInput,
  PurchaseDocumentRecord,
  PurchaseLineInput,
  PurchaseLineRecord,
  PurchaseOrderStatus,
  PurchaseStatus,
  PurchasingListQuery,
  PurchasingRepository,
} from "../../application/types/purchasing";

const HEADER_COLUMNS = "id, tenant_id, branch_id, business_document_id, status, title, supplier_id, purchase_order_id, inventory_transaction_id, created_at, updated_at, version, metadata";
const REQUEST_COLUMNS = "id, tenant_id, branch_id, business_document_id, status, title, needed_by, created_at, updated_at, version, metadata";
const ORDER_COLUMNS = "id, tenant_id, branch_id, business_document_id, supplier_id, status, title, order_date, created_at, updated_at, version, metadata";
const RECEIPT_COLUMNS = "id, tenant_id, branch_id, business_document_id, purchase_order_id, supplier_id, inventory_transaction_id, status, title, receipt_date, created_at, updated_at, version, metadata";

const TABLE_BY_KIND = {
  order: "purchase_orders",
  receipt: "purchase_receipts",
  request: "purchase_requests",
  rfq: "purchase_rfqs",
} as const;

const LINE_TABLE_BY_KIND = {
  order: "purchase_order_lines",
  receipt: "purchase_receipt_lines",
  request: "purchase_request_lines",
  rfq: "purchase_rfq_lines",
} as const;

type SupabaseUntyped = {
  // Supabase generated types cannot represent this module's dynamic table map.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNumber(value: unknown) {
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

function mapDocument(kind: PurchaseDocumentKind, row: Record<string, unknown>): PurchaseDocumentRecord {
  return {
    branchId: row.branch_id as string,
    businessDocumentId: row.business_document_id as string,
    createdAt: row.created_at as string,
    documentDate: (row.needed_by ?? row.rfq_date ?? row.order_date ?? row.receipt_date ?? null) as string | null,
    id: row.id as string,
    inventoryTransactionId: (row.inventory_transaction_id ?? null) as string | null,
    kind,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    purchaseOrderId: (row.purchase_order_id ?? null) as string | null,
    status: row.status as PurchaseStatus,
    supplierId: (row.supplier_id ?? null) as string | null,
    tenantId: row.tenant_id as string,
    title: row.title as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapLine(kind: PurchaseDocumentKind, row: Record<string, unknown>): PurchaseLineRecord {
  return {
    branchId: row.branch_id as string,
    createdAt: row.created_at as string,
    documentId: (row.purchase_request_id ?? row.purchase_rfq_id ?? row.purchase_order_id ?? row.purchase_receipt_id) as string,
    id: row.id as string,
    lineNumber: Number(row.line_number),
    note: row.note as string | null,
    productId: row.product_id as string,
    purchaseOrderLineId: (row.purchase_order_line_id ?? null) as string | null,
    quantity: toNumber(row.quantity ?? row.ordered_quantity ?? row.received_quantity),
    receivedQuantity: kind === "order" ? toNumber(row.received_quantity) : null,
    tenantId: row.tenant_id as string,
    unitId: row.unit_id as string,
    unitPrice: toNumber(row.unit_price ?? row.quoted_unit_price),
  };
}

export class SupabasePurchasingRepository implements PurchasingRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async list(kind: PurchaseDocumentKind, query: PurchasingListQuery) {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.from(TABLE_BY_KIND[kind])
      .select(this.columnsFor(kind))
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .limit(pageSize + 1);

    if (query.status) request = request.eq("status", query.status);
    if (query.search?.trim()) {
      const term = query.search.replaceAll("%", "").trim();
      request = request.ilike("title", `%${term}%`);
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

    const { data, error } = await request.order("created_at", { ascending: false }).order("id", { ascending: false });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not list purchasing documents.", cause: error });

    const records = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => mapDocument(kind, row));
    const visibleRecords = records.slice(0, pageSize);
    return { nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null, pageSize, records: visibleRecords };
  }

  async findDetail(kind: PurchaseDocumentKind, id: string): Promise<PurchaseDocumentDetail | null> {
    const { data, error } = await this.from(TABLE_BY_KIND[kind])
      .select(this.columnsFor(kind))
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read purchasing document.", cause: error });
    if (!data) return null;

    const document = mapDocument(kind, data as unknown as Record<string, unknown>);
    return { document, lines: await this.loadLines(kind, id) };
  }

  async create(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput & { businessDocumentId: string }): Promise<PurchaseDocumentDetail> {
    const { data, error } = await this.from(TABLE_BY_KIND[kind])
      .insert(this.headerPayload(kind, input))
      .select(this.columnsFor(kind))
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create purchasing document.", cause: error });
    const document = mapDocument(kind, data as unknown as Record<string, unknown>);
    await this.insertLines(kind, document, input.lines);
    return { document, lines: await this.loadLines(kind, document.id) };
  }

  async update(kind: PurchaseDocumentKind, id: string, input: PurchaseDocumentMutationInput): Promise<PurchaseDocumentDetail> {
    const detail = await this.findDetail(kind, id);
    if (!detail) throw new ApplicationError({ code: "NOT_FOUND", message: "Purchasing document was not found." });

    const { data, error } = await this.from(TABLE_BY_KIND[kind])
      .update({ ...this.headerPayload(kind, { ...input, businessDocumentId: detail.document.businessDocumentId }), updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(this.columnsFor(kind))
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update purchasing document.", cause: error });
    const document = mapDocument(kind, data as unknown as Record<string, unknown>);
    await this.softDeleteLines(kind, id);
    await this.insertLines(kind, document, input.lines);
    return { document, lines: await this.loadLines(kind, id) };
  }

  async changeStatus(kind: PurchaseDocumentKind, id: string, status: PurchaseStatus, metadata: Record<string, unknown> = {}): Promise<PurchaseDocumentRecord> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { metadata, status, updated_by: this.context.userId };
    if (status === "submitted") Object.assign(payload, { submitted_at: now, submitted_by: this.context.userId });
    if (status === "approved") Object.assign(payload, { approval_status: "approved", approved_at: now, approved_by: this.context.userId });
    if (status === "rejected") Object.assign(payload, { approval_status: "rejected", rejected_at: now, rejected_by: this.context.userId });
    if (status === "sent") Object.assign(payload, { sent_at: now, sent_by: this.context.userId });
    if (status === "quoted") Object.assign(payload, { quoted_at: now, quoted_by: this.context.userId });
    if (status === "confirmed") Object.assign(payload, { confirmed_at: now, confirmed_by: this.context.userId });
    if (status === "received") Object.assign(payload, { received_at: now });
    if (status === "closed") Object.assign(payload, { closed_at: now, closed_by: this.context.userId });
    if (status === "cancelled") Object.assign(payload, { cancelled_at: now, cancelled_by: this.context.userId });
    if (status === "posted") Object.assign(payload, { posted_at: now, posted_by: this.context.userId });
    if (status === "reversed") Object.assign(payload, { reversed_at: now, reversed_by: this.context.userId });

    const { data, error } = await this.from(TABLE_BY_KIND[kind])
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(this.columnsFor(kind))
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not change purchasing document status.", cause: error });
    return mapDocument(kind, data as unknown as Record<string, unknown>);
  }

  async attachReceiptInventoryTransaction(receiptId: string, inventoryTransactionId: string): Promise<void> {
    const { error } = await this.supabase
      .from("purchase_receipts")
      .update({ inventory_transaction_id: inventoryTransactionId, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", receiptId)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not attach receipt inventory transaction.", cause: error });
  }

  async applyReceiptToOrder(receiptId: string): Promise<PurchaseOrderStatus> {
    const { data, error } = await this.supabase.rpc("apply_purchase_receipt_to_order", {
      input_receipt_id: receiptId,
      input_tenant_id: this.context.tenantId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not apply purchase receipt quantities.", cause: error });
    return data as PurchaseOrderStatus;
  }

  async reverseReceiptFromOrder(receiptId: string): Promise<PurchaseOrderStatus> {
    const { data, error } = await this.supabase.rpc("reverse_purchase_receipt_from_order", {
      input_receipt_id: receiptId,
      input_tenant_id: this.context.tenantId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reverse purchase receipt quantities.", cause: error });
    return data as PurchaseOrderStatus;
  }

  async hasPostedReceipts(orderId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("purchase_receipts")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("purchase_order_id", orderId)
      .eq("status", "posted")
      .is("deleted_at", null)
      .limit(1);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not check purchase order receipts.", cause: error });
    return (data ?? []).length > 0;
  }

  async assertPurchasingScope(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput): Promise<void> {
    await this.assertBranch(input.branchId);
    await this.assertAllProductsPurchasable(input.lines.map((line) => line.productId));
    await this.assertAllUnits(input.lines.map((line) => line.unitId));
    if (kind !== "request" && input.supplierId) await this.assertSupplier(input.supplierId);
    if (kind === "receipt") await this.assertReceiptScope(input);
  }

  private columnsFor(kind: PurchaseDocumentKind) {
    if (kind === "request") return REQUEST_COLUMNS;
    if (kind === "order") return ORDER_COLUMNS;
    if (kind === "receipt") return RECEIPT_COLUMNS;
    return HEADER_COLUMNS;
  }

  private headerPayload(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput & { businessDocumentId: string }) {
    const common = {
      branch_id: input.branchId,
      business_document_id: input.businessDocumentId,
      created_by: this.context.userId,
      metadata: {},
      tenant_id: this.context.tenantId,
      title: input.title.trim(),
      updated_by: this.context.userId,
    };
    if (kind === "request") return { ...common, needed_by: normalizeText(input.neededBy), requested_by: this.context.userId };
    if (kind === "rfq") return { ...common, purchase_request_id: normalizeText(input.purchaseRequestId), response_due_date: normalizeText(input.neededBy), rfq_date: normalizeText(input.documentDate) ?? new Date().toISOString().slice(0, 10), supplier_id: normalizeText(input.supplierId) };
    if (kind === "order") return { ...common, expected_receipt_date: normalizeText(input.neededBy), order_date: normalizeText(input.documentDate) ?? new Date().toISOString().slice(0, 10), purchase_request_id: normalizeText(input.purchaseRequestId), purchase_rfq_id: normalizeText(input.purchaseRfqId), supplier_id: normalizeText(input.supplierId) };
    return {
      ...common,
      destination_location_id: normalizeText(input.destinationLocationId),
      destination_warehouse_id: normalizeText(input.destinationWarehouseId),
      metadata: {
        destinationLocationId: normalizeText(input.destinationLocationId),
        destinationWarehouseId: normalizeText(input.destinationWarehouseId),
      },
      purchase_order_id: normalizeText(input.purchaseOrderId),
      receipt_date: normalizeText(input.documentDate) ?? new Date().toISOString().slice(0, 10),
      supplier_id: normalizeText(input.supplierId),
    };
  }

  private async insertLines(kind: PurchaseDocumentKind, document: PurchaseDocumentRecord, lines: readonly PurchaseLineInput[]) {
    const foreignKey = `${TABLE_BY_KIND[kind].slice(0, -1)}_id`;
    const quantityColumn = kind === "order" ? "ordered_quantity" : kind === "receipt" ? "received_quantity" : "quantity";
    const priceColumn = kind === "rfq" ? "quoted_unit_price" : "unit_price";
    const payload = lines.map((line, index) => ({
      [foreignKey]: document.id,
      [priceColumn]: line.unitPrice ?? 0,
      [quantityColumn]: line.quantity,
      branch_id: document.branchId,
      created_by: this.context.userId,
      line_number: index + 1,
      metadata: {},
      note: normalizeText(line.note),
      product_id: line.productId,
      purchase_order_line_id: kind === "receipt" ? normalizeText(line.purchaseOrderLineId) : undefined,
      tenant_id: this.context.tenantId,
      unit_id: line.unitId,
      updated_by: this.context.userId,
    }));

    const { error } = await this.from(LINE_TABLE_BY_KIND[kind]).insert(payload);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save purchasing document lines.", cause: error });
  }

  private async softDeleteLines(kind: PurchaseDocumentKind, id: string) {
    const foreignKey = `${TABLE_BY_KIND[kind].slice(0, -1)}_id`;
    const { error } = await this.from(LINE_TABLE_BY_KIND[kind])
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq(foreignKey, id)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not replace purchasing document lines.", cause: error });
  }

  private async loadLines(kind: PurchaseDocumentKind, id: string): Promise<readonly PurchaseLineRecord[]> {
    const foreignKey = `${TABLE_BY_KIND[kind].slice(0, -1)}_id`;
    const { data, error } = await this.from(LINE_TABLE_BY_KIND[kind])
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq(foreignKey, id)
      .is("deleted_at", null)
      .order("line_number", { ascending: true });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load purchasing document lines.", cause: error });
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => mapLine(kind, row));
  }

  private from(table: string) {
    return (this.supabase as unknown as SupabaseUntyped).from(table);
  }

  private async assertBranch(branchId: string) {
    const { data, error } = await this.supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", branchId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchasing branch.", cause: error });
    if ((data ?? []).length !== 1) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchasing branch must be active and tenant-scoped." });
  }

  private async assertSupplier(supplierId: string) {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", supplierId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchasing supplier.", cause: error });
    if ((data ?? []).length !== 1) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchasing supplier must be active and tenant-scoped." });
  }

  private async assertAllProductsPurchasable(productIds: readonly string[]) {
    const distinctIds = Array.from(new Set(productIds));
    const { data, error } = await this.supabase
      .from("products")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .in("id", distinctIds)
      .eq("is_purchasable", true)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchasing products.", cause: error });
    this.assertAllIdsPresent("Purchasing products must be active, tenant-scoped, and purchasable.", distinctIds, data);
  }

  private async assertAllUnits(unitIds: readonly string[]) {
    const distinctIds = Array.from(new Set(unitIds));
    const { data, error } = await this.supabase
      .from("units")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .in("id", distinctIds)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchasing units.", cause: error });
    this.assertAllIdsPresent("Purchasing units must be active and tenant-scoped.", distinctIds, data);
  }

  private async assertReceiptScope(input: PurchaseDocumentMutationInput) {
    if (!input.purchaseOrderId || !input.supplierId || !input.destinationWarehouseId || !input.destinationLocationId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipts require order, supplier, warehouse, and location references." });
    }

    const [order, warehouse, location] = await Promise.all([
      this.from("purchase_orders")
        .select("id, branch_id, supplier_id, status")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.purchaseOrderId)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("warehouses")
        .select("id, branch_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.destinationWarehouseId)
        .eq("branch_id", input.branchId)
        .eq("is_active", true)
        .is("deleted_at", null),
      this.supabase
        .from("warehouse_locations")
        .select("id, warehouse_id, branch_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.destinationLocationId)
        .eq("warehouse_id", input.destinationWarehouseId)
        .eq("branch_id", input.branchId)
        .eq("is_active", true)
        .is("deleted_at", null),
    ]);

    for (const result of [order, warehouse, location]) {
      if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchase receipt references.", cause: result.error });
    }
    const orderRow = order.data as { branch_id: string; supplier_id: string; status: string } | null;
    if (!orderRow || orderRow.branch_id !== input.branchId || orderRow.supplier_id !== input.supplierId || !["confirmed", "partially_received"].includes(orderRow.status)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt order must be confirmed, tenant-scoped, same branch, and same supplier." });
    }
    if (!warehouse.data?.length || !location.data?.length) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt destination must be active and match the branch." });
    }

    const lineIds = input.lines.map((line) => line.purchaseOrderLineId).filter((id): id is string => Boolean(id));
    if (lineIds.length !== input.lines.length) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt lines require purchase order line references." });
    }
    const { data: orderLines, error: lineError } = await this.from("purchase_order_lines")
      .select("id, product_id, unit_id, ordered_quantity, received_quantity")
      .eq("tenant_id", this.context.tenantId)
      .eq("purchase_order_id", input.purchaseOrderId)
      .in("id", lineIds)
      .is("deleted_at", null);
    if (lineError) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate purchase receipt lines.", cause: lineError });

    const rows = (orderLines ?? []) as Array<{ id: string; product_id: string; unit_id: string; ordered_quantity: unknown; received_quantity: unknown }>;
    this.assertAllIdsPresent("Purchase receipt order lines must belong to the selected order.", Array.from(new Set(lineIds)), rows);
    const byId = new Map(rows.map((line) => [line.id, line]));
    for (const line of input.lines) {
      const orderLine = line.purchaseOrderLineId ? byId.get(line.purchaseOrderLineId) : null;
      if (!orderLine || orderLine.product_id !== line.productId || orderLine.unit_id !== line.unitId) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt lines must match order line product and unit." });
      }
      const remaining = toNumber(orderLine.ordered_quantity) - toNumber(orderLine.received_quantity);
      if (line.quantity > remaining) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt quantity cannot exceed remaining order quantity." });
      }
    }
  }

  private assertAllIdsPresent(message: string, expectedIds: readonly string[], rows: unknown) {
    const rowIds = new Set((Array.isArray(rows) ? rows : []).map((row) => String((row as { id: unknown }).id)));
    if (expectedIds.some((id) => !rowIds.has(id))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message });
    }
  }
}
