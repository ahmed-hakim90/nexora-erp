import type { CursorPage, InventoryListQuery, StockPostingLineInput } from "../types";

export type InventoryTransactionType =
  | "stock_adjustment"
  | "warehouse_transfer"
  | "goods_receipt"
  | "goods_issue"
  | "cycle_count";

export type InventoryTransactionStatus = "draft" | "submitted" | "posted" | "cancelled" | "reversed";

export type InventoryTransactionRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  businessDocumentId: string;
  transactionType: InventoryTransactionType;
  status: InventoryTransactionStatus;
  title: string;
  transactionDate: string;
  sourceWarehouseId: string | null;
  sourceLocationId: string | null;
  destinationWarehouseId: string | null;
  destinationLocationId: string | null;
  reason: string | null;
  submittedAt: string | null;
  postedAt: string | null;
  cancelledAt: string | null;
  reversedAt: string | null;
  reversalOfTransactionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryTransactionLineRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  transactionId: string;
  lineNumber: number;
  productId: string;
  unitId: string;
  sourceWarehouseId: string | null;
  sourceLocationId: string | null;
  destinationWarehouseId: string | null;
  destinationLocationId: string | null;
  quantity: number | null;
  quantityDelta: number | null;
  unitCost: number;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type InventoryTransactionPostingRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  transactionId: string;
  postingBatchId: string;
  postingKind: "post" | "reversal";
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type InventoryCycleCountRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  transactionId: string;
  businessDocumentId: string;
  status: InventoryTransactionStatus;
  countDate: string;
  warehouseId: string;
  locationId: string;
  notes: string | null;
  postedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}>;

export type InventoryCycleCountLineRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  cycleCountId: string;
  transactionLineId: string | null;
  lineNumber: number;
  productId: string;
  unitId: string;
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type InventoryTransactionDetail = Readonly<{
  transaction: InventoryTransactionRecord;
  lines: readonly InventoryTransactionLineRecord[];
  postings: readonly InventoryTransactionPostingRecord[];
  cycleCount: InventoryCycleCountRecord | null;
  cycleCountLines: readonly InventoryCycleCountLineRecord[];
}>;

export type InventoryTransactionLineInput = Readonly<{
  productId: string;
  unitId: string;
  sourceWarehouseId?: string | null;
  sourceLocationId?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  quantity?: number | null;
  quantityDelta?: number | null;
  unitCost?: number;
  reason?: string | null;
  expectedQuantity?: number;
  countedQuantity?: number;
}>;

export type InventoryTransactionMutationInput = Readonly<{
  branchId: string;
  transactionType: InventoryTransactionType;
  title: string;
  transactionDate?: string;
  sourceWarehouseId?: string | null;
  sourceLocationId?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  reason?: string | null;
  idempotencyKey?: string | null;
  lines: readonly InventoryTransactionLineInput[];
}>;

export type InventoryTransactionRepository = Readonly<{
  listTransactions(query: InventoryListQuery): Promise<CursorPage<InventoryTransactionRecord>>;
  findTransactionDetail(id: string): Promise<InventoryTransactionDetail | null>;
  createTransaction(input: {
    transaction: InventoryTransactionMutationInput;
    businessDocumentId: string;
  }): Promise<InventoryTransactionDetail>;
  updateTransaction(id: string, input: InventoryTransactionMutationInput): Promise<InventoryTransactionDetail>;
  changeTransactionStatus(input: {
    id: string;
    status: InventoryTransactionStatus;
    businessDocumentStatus: string;
    metadata?: Record<string, unknown>;
  }): Promise<InventoryTransactionRecord>;
  recordPosting(input: {
    branchId: string;
    transactionId: string;
    postingBatchId: string;
    postingKind: "post" | "reversal";
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<InventoryTransactionPostingRecord>;
  assertPostingScope(input: StockPostingLineInput & { branchId: string }): Promise<void>;
}>;
