export type InventorySortDirection = "asc" | "desc";

export type InventoryListQuery = Readonly<{
  cursor?: string | null;
  pageSize: number;
  search?: string;
  status?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: InventorySortDirection;
}>;

export type CursorPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;

export type InventoryEventDefinitionRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  eventKey: string;
  name: string;
  direction: string;
  sourceScope: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryIntegrationEndpointRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  endpointKey: string;
  name: string;
  direction: string;
  transport: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryEventRouteRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  routeKey: string;
  eventDefinitionId: string;
  endpointId: string;
  deliveryModePlaceholder: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryIntegrationMessageRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  messageKey: string;
  eventDefinitionId: string | null;
  endpointId: string | null;
  direction: string;
  status: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  externalReference: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryOverview = Readonly<{
  eventDefinitions: CursorPage<InventoryEventDefinitionRecord>;
  endpoints: CursorPage<InventoryIntegrationEndpointRecord>;
  messages: CursorPage<InventoryIntegrationMessageRecord>;
}>;

export type StockLedgerDirection = "in" | "out" | "neutral";
export type StockPostingBatchStatus = "posted" | "reversed";
export type StockMovementTypeKey = "receipt" | "issue" | "adjustment" | "transfer" | (string & {});

export type StockLedgerEntryRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  postingBatchId: string;
  documentId: string;
  documentTypeKey: string;
  movementTypeKey: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  lotId: string | null;
  serialId: string | null;
  unitId: string;
  quantityDelta: number;
  unitCost: number;
  totalCost: number;
  direction: StockLedgerDirection;
  postedAt: string;
  postedBy: string;
  reversalOfEntryId: string | null;
  correlationId: string;
  causationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type StockBalanceRecord = Readonly<{
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  lotId: string | null;
  serialId: string | null;
  unitId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lastMovementAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type StockPostingBatchRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  documentId: string;
  status: StockPostingBatchStatus;
  postedAt: string;
  postedBy: string;
  reversedAt: string | null;
  reversedBy: string | null;
  idempotencyKey: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}>;

export type StockPostingLineInput = Readonly<{
  movementTypeKey: StockMovementTypeKey;
  productId: string;
  warehouseId: string;
  locationId: string;
  lotId?: string | null;
  serialId?: string | null;
  unitId: string;
  quantity: number;
  direction: StockLedgerDirection;
  unitCost?: number;
  totalCost?: number;
  metadata?: Record<string, unknown>;
}>;

export type PostStockInput = Readonly<{
  branchId?: string | null;
  documentId: string;
  idempotencyKey: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  lines: readonly StockPostingLineInput[];
}>;

export type ReverseStockPostingInput = Readonly<{
  postingBatchId: string;
  documentId: string;
  idempotencyKey: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}>;

export type StockPostingRpcLine = Readonly<{
  movement_type_key: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  lot_id: string | null;
  serial_id: string | null;
  unit_id: string;
  quantity_delta: number;
  unit_cost: number;
  total_cost: number;
  direction: StockLedgerDirection;
  reversal_of_entry_id?: string | null;
  causation_id?: string | null;
  metadata: Record<string, unknown>;
}>;

export type StockPostingRpcInput = Readonly<{
  branchId?: string | null;
  documentId: string;
  idempotencyKey: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  entries: readonly StockPostingRpcLine[];
}>;

export type StockPostingValidationContext = Readonly<{
  document: {
    id: string;
    tenantId: string;
    branchId: string | null;
    documentTypeKey: string;
    sourceModule: string;
  } | null;
  allowNegativeStock: boolean;
}>;
