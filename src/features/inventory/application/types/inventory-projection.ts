import type {
  InventoryInventoryStatus,
  InventoryObjectType,
  InventoryProjectionKind,
} from "./inventory-documents";
import type { InventoryLedgerEntryDefinition, InventoryLedgerProjectionEventName } from "./inventory-ledger";

export const INVENTORY_PROJECTION_REBUILD_STATUSES = ["idle", "rebuilding", "failed"] as const;

export const INVENTORY_PROJECTION_SHELL_STATUS_MAP = {
  available: "availability",
  reserved: "reserved_quantity",
  picked: "picked_quantity",
  shipped: "shipped_quantity",
} as const satisfies Partial<Record<InventoryInventoryStatus, InventoryProjectionKind>>;

export type InventoryProjectionRebuildStatus = (typeof INVENTORY_PROJECTION_REBUILD_STATUSES)[number];
export type InventoryProjectionShellStatus = keyof typeof INVENTORY_PROJECTION_SHELL_STATUS_MAP;

export type InventoryProjectionRow = Readonly<{
  anchorKey: string;
  projectionKind: InventoryProjectionKind;
  objectType: InventoryObjectType;
  productId: string | null;
  variantId: string | null;
  lotId: string | null;
  serialId: string | null;
  handlingUnitId: string | null;
  warehouseId: string | null;
  locationId: string | null;
  inventoryStatus: InventoryInventoryStatus | null;
  quantity: number;
  uomId: string | null;
  custodian: Readonly<Record<string, unknown>>;
  derivedFromDocumentId: string | null;
  derivedFromLedgerEntryId: string;
  correlationId: string | null;
  causationId: string | null;
  projectionVersion: number;
  projectedAt: string;
}>;

export type InventorySerialIdentityProjection = Readonly<{
  serialId: string;
  currentHandlingUnitId: string | null;
  currentWarehouseId: string | null;
  currentLocationId: string | null;
  currentCustodian: Readonly<Record<string, unknown>>;
  inventoryStatus: InventoryInventoryStatus | null;
  derivedFromLedgerEntryId: string;
  correlationId: string | null;
  causationId: string | null;
}>;

export type InventoryHandlingUnitIdentityProjection = Readonly<{
  handlingUnitId: string;
  warehouseId: string | null;
  locationId: string | null;
  currentCustodian: Readonly<Record<string, unknown>>;
  inventoryStatus: InventoryInventoryStatus | null;
  derivedFromLedgerEntryId: string;
  correlationId: string | null;
  causationId: string | null;
}>;

export type InventoryProjectionRuntimeState = Readonly<{
  projectionVersion: number;
  lastProcessedLedgerEntryId: string | null;
  lastProcessedPostingTimestamp: string | null;
  rebuildStatus: InventoryProjectionRebuildStatus;
  rebuildStartedAt: string | null;
  rebuildCompletedAt: string | null;
  rebuildMetadata: Readonly<Record<string, unknown>>;
}>;

export type InventoryProjectionEngineState = Readonly<{
  rows: ReadonlyMap<string, InventoryProjectionRow>;
  appliedLedgerEntryIds: ReadonlySet<string>;
  runtime: InventoryProjectionRuntimeState;
  serialIdentity: ReadonlyMap<string, InventorySerialIdentityProjection>;
  handlingUnitIdentity: ReadonlyMap<string, InventoryHandlingUnitIdentityProjection>;
}>;

export type InventoryProjectionApplyResult = Readonly<{
  applied: boolean;
  skippedReason?: "already_applied" | "ignored_event_type";
  state: InventoryProjectionEngineState;
  updatedRows: readonly InventoryProjectionRow[];
  serialIdentityUpdates: readonly InventorySerialIdentityProjection[];
  handlingUnitIdentityUpdates: readonly InventoryHandlingUnitIdentityProjection[];
}>;

export type InventoryProjectionRebuildResult = Readonly<{
  state: InventoryProjectionEngineState;
  processedCount: number;
  skippedCount: number;
}>;

export type InventoryCurrentStockQuery = Readonly<{
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: InventoryInventoryStatus | null;
}>;

export type InventoryAvailabilitySnapshotQuery = Readonly<{
  productId?: string | null;
  lotId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
}>;

export type InventoryLedgerBackedCurrentStateQuery = Readonly<{
  productId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
}>;

export type InventoryProjectionEventInput = Readonly<{
  eventName: InventoryLedgerProjectionEventName;
  ledgerEntry: InventoryLedgerEntryDefinition;
}>;
