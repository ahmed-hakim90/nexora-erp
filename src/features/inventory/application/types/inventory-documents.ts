export const INVENTORY_FOUNDATION_DOCUMENT_KINDS = [
  "goods_receipt",
  "goods_issue",
  "inventory_transfer",
  "inventory_adjustment",
  "material_request",
  "material_issue",
  "production_receipt",
  "return_receipt",
  "scrap_document",
  "repack_document",
  "cycle_count_document",
] as const;

export const INVENTORY_OBJECT_TYPES = [
  "product_quantity",
  "lot_quantity",
  "serial",
  "handling_unit",
  "child_handling_unit",
] as const;

export const INVENTORY_INVENTORY_STATUSES = [
  "available",
  "reserved",
  "picked",
  "packed",
  "shipped",
  "sold",
  "returned",
  "qc_hold",
  "damaged",
  "scrap",
  "service",
  "blocked",
  "in_transit",
] as const;

export const INVENTORY_DOCUMENT_LIFECYCLE_STATES = [
  "draft",
  "submitted",
  "pending_approval",
  "approved",
  "confirmed",
  "posted",
  "completed",
  "cancelled",
  "archived",
] as const;

export const INVENTORY_DOCUMENT_STATUSES = [
  "draft",
  "active",
  "inactive",
  "locked",
  "archived",
] as const;

export const INVENTORY_PROJECTION_KINDS = [
  "product_quantity",
  "lot_quantity",
  "serial_state",
  "handling_unit_state",
  "availability",
  "reserved_quantity",
  "picked_quantity",
  "shipped_quantity",
] as const;

export type InventoryFoundationDocumentKind = (typeof INVENTORY_FOUNDATION_DOCUMENT_KINDS)[number];
export type InventoryObjectType = (typeof INVENTORY_OBJECT_TYPES)[number];
export type InventoryInventoryStatus = (typeof INVENTORY_INVENTORY_STATUSES)[number];
export type InventoryDocumentLifecycleState = (typeof INVENTORY_DOCUMENT_LIFECYCLE_STATES)[number];
export type InventoryProjectionKind = (typeof INVENTORY_PROJECTION_KINDS)[number];

export type InventoryObjectRef = Readonly<{
  objectType: InventoryObjectType;
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  childHandlingUnitId?: string | null;
  quantity?: number | null;
  uomId?: string | null;
  label?: string | null;
  traceabilityReady?: boolean;
}>;

export type InventoryDocumentLineDefinition = Readonly<{
  lineNumber: number;
  objectRef: InventoryObjectRef;
  sourceWarehouseId?: string | null;
  sourceLocationId?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  inventoryStatus: InventoryInventoryStatus;
  reasonCodeMetadata?: Readonly<Record<string, unknown>>;
  snapshotMetadata?: Readonly<Record<string, unknown>>;
  validationMetadata?: Readonly<Record<string, unknown>>;
}>;

export type InventoryDocumentSnapshotDefinition = Readonly<{
  objectIdentity: Readonly<Record<string, unknown>>;
  productLabel?: string | null;
  lotLabel?: string | null;
  serialLabel?: string | null;
  handlingUnitLabel?: string | null;
  huContentsSnapshot?: Readonly<Record<string, unknown>>;
  sourceLocationLabel?: string | null;
  destinationLocationLabel?: string | null;
  quantity?: number | null;
  uomLabel?: string | null;
  actorLabel?: string | null;
  capturedAt: string;
  correlationId?: string | null;
}>;

export type InventoryCurrentStateProjectionDefinition = Readonly<{
  projectionKind: InventoryProjectionKind;
  objectType: InventoryObjectType;
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: InventoryInventoryStatus | null;
  quantity?: number | null;
  uomId?: string | null;
  custodian?: Readonly<Record<string, unknown>>;
  derivedFromDocumentId?: string | null;
  correlationId?: string | null;
}>;

export type InventoryProjectionOnlyFieldDescriptor = Readonly<{
  table: string;
  column: string;
  projectionKind: InventoryProjectionKind | "serial_state" | "handling_unit_state";
}>;
