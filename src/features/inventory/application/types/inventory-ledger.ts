export const INVENTORY_LEDGER_OBJECT_TYPES = [
  "product_quantity",
  "lot_quantity",
  "serial",
  "handling_unit",
  "child_handling_unit",
] as const;

export const INVENTORY_LEDGER_MOVEMENT_DIRECTIONS = ["IN", "OUT", "INTERNAL"] as const;

export const INVENTORY_LEDGER_MOVEMENT_TYPES = [
  "goods_receipt",
  "goods_issue",
  "transfer",
  "adjustment",
  "cycle_count",
  "production_receipt",
  "material_issue",
  "return",
  "scrap",
  "repack",
] as const;

export const INVENTORY_LEDGER_EVENT_TYPES = ["created", "posted", "reversed"] as const;

export const INVENTORY_LEDGER_BUSINESS_MODULES = [
  "inventory",
  "purchasing",
  "sales",
  "manufacturing",
  "service",
  "warranty",
  "rental",
  "fleet",
] as const;

export const INVENTORY_LEDGER_PROJECTION_EVENT_NAMES = [
  "LedgerEntryCreated",
  "LedgerEntryReversed",
  "LedgerPostingCompleted",
] as const;

export type InventoryLedgerObjectType = (typeof INVENTORY_LEDGER_OBJECT_TYPES)[number];
export type InventoryLedgerMovementDirection = (typeof INVENTORY_LEDGER_MOVEMENT_DIRECTIONS)[number];
export type InventoryLedgerMovementType = (typeof INVENTORY_LEDGER_MOVEMENT_TYPES)[number];
export type InventoryLedgerEventType = (typeof INVENTORY_LEDGER_EVENT_TYPES)[number];
export type InventoryLedgerBusinessModule = (typeof INVENTORY_LEDGER_BUSINESS_MODULES)[number];
export type InventoryLedgerProjectionEventName = (typeof INVENTORY_LEDGER_PROJECTION_EVENT_NAMES)[number];

export type InventoryLedgerEntryRecord = Readonly<{
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string | null;
  inventoryObjectType: InventoryLedgerObjectType;
  productId: string | null;
  variantId: string | null;
  lotId: string | null;
  serialId: string | null;
  handlingUnitId: string | null;
  childHandlingUnitId: string | null;
  warehouseId: string | null;
  locationId: string | null;
  inventoryStatus: string | null;
  quantityDelta: number;
  uomId: string | null;
  movementDirection: InventoryLedgerMovementDirection;
  movementType: InventoryLedgerMovementType;
  documentType: string;
  documentId: string | null;
  documentLineId: string | null;
  businessModule: InventoryLedgerBusinessModule;
  eventType: InventoryLedgerEventType;
  parentEntryId: string | null;
  postingTimestamp: string;
  correlationId: string;
  causationId: string | null;
  eventMetadata: Readonly<Record<string, unknown>>;
  createdBy: string | null;
  createdAt: string;
  productLabel: string | null;
  lotLabel: string | null;
  serialLabel: string | null;
  handlingUnitLabel: string | null;
  warehouseLabel: string | null;
  locationLabel: string | null;
  documentNumberSnapshot: string | null;
  objectLabelSnapshot: string | null;
}>;

export type InventoryLedgerEntryDefinition = Readonly<{
  ledgerEntryId: string;
  inventoryObjectType: InventoryLedgerObjectType;
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  childHandlingUnitId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: string | null;
  quantityDelta: number;
  uomId?: string | null;
  movementDirection: InventoryLedgerMovementDirection;
  movementType: InventoryLedgerMovementType;
  documentType: string;
  documentId?: string | null;
  documentLineId?: string | null;
  businessModule: InventoryLedgerBusinessModule;
  eventType: InventoryLedgerEventType;
  parentEntryId?: string | null;
  postingTimestamp: string;
  correlationId: string;
  causationId?: string | null;
  eventMetadata?: Readonly<Record<string, unknown>>;
}>;

export type InventoryLedgerWorkspaceData = Readonly<{
  records: readonly InventoryLedgerEntryRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;
