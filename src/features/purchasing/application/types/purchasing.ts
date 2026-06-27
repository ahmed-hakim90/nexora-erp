import type { CursorPage } from "@/features/inventory/public-api";

export type PurchaseDocumentKind = "request" | "rfq" | "order" | "receipt";
export type PurchaseRequestStatus = "draft" | "submitted" | "approved" | "rejected" | "closed" | "cancelled";
export type PurchaseRfqStatus = "draft" | "sent" | "quoted" | "closed" | "cancelled";
export type PurchaseOrderStatus = "draft" | "submitted" | "approved" | "confirmed" | "partially_received" | "received" | "closed" | "cancelled";
export type PurchaseReceiptStatus = "draft" | "submitted" | "posted" | "reversed" | "cancelled";
export type PurchaseStatus = PurchaseRequestStatus | PurchaseRfqStatus | PurchaseOrderStatus | PurchaseReceiptStatus;

export type PurchasingListQuery = Readonly<{
  cursor?: string | null;
  pageSize: number;
  search?: string;
  status?: string;
}>;

export type PurchaseDocumentRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  businessDocumentId: string;
  kind: PurchaseDocumentKind;
  status: PurchaseStatus;
  title: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  inventoryTransactionId: string | null;
  documentDate: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  metadata: Record<string, unknown>;
}>;

export type PurchaseLineRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string;
  documentId: string;
  lineNumber: number;
  productId: string;
  unitId: string;
  quantity: number;
  receivedQuantity: number | null;
  unitPrice: number;
  purchaseOrderLineId: string | null;
  note: string | null;
  createdAt: string;
}>;

export type PurchaseDocumentDetail = Readonly<{
  document: PurchaseDocumentRecord;
  lines: readonly PurchaseLineRecord[];
}>;

export type PurchaseLineInput = Readonly<{
  productId: string;
  unitId: string;
  quantity: number;
  unitPrice?: number;
  purchaseOrderLineId?: string | null;
  note?: string | null;
}>;

export type PurchaseDocumentMutationInput = Readonly<{
  branchId: string;
  title: string;
  supplierId?: string | null;
  purchaseRequestId?: string | null;
  purchaseRfqId?: string | null;
  purchaseOrderId?: string | null;
  neededBy?: string | null;
  documentDate?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  lines: readonly PurchaseLineInput[];
}>;

export type ReceiptPostingInput = Readonly<{
  idempotencyKey: string;
}>;

export type PurchasingRepository = Readonly<{
  list(kind: PurchaseDocumentKind, query: PurchasingListQuery): Promise<CursorPage<PurchaseDocumentRecord>>;
  findDetail(kind: PurchaseDocumentKind, id: string): Promise<PurchaseDocumentDetail | null>;
  create(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput & { businessDocumentId: string }): Promise<PurchaseDocumentDetail>;
  update(kind: PurchaseDocumentKind, id: string, input: PurchaseDocumentMutationInput): Promise<PurchaseDocumentDetail>;
  changeStatus(kind: PurchaseDocumentKind, id: string, status: PurchaseStatus, metadata?: Record<string, unknown>): Promise<PurchaseDocumentRecord>;
  attachReceiptInventoryTransaction(receiptId: string, inventoryTransactionId: string): Promise<void>;
  applyReceiptToOrder(receiptId: string): Promise<PurchaseOrderStatus>;
  reverseReceiptFromOrder(receiptId: string): Promise<PurchaseOrderStatus>;
  hasPostedReceipts(orderId: string): Promise<boolean>;
  assertPurchasingScope(kind: PurchaseDocumentKind, input: PurchaseDocumentMutationInput): Promise<void>;
}>;
