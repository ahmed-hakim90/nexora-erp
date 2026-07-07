import type { InventoryInventoryStatus, InventoryObjectType } from "./inventory-documents";
import type { InventoryProjectionEngineState } from "./inventory-projection";

export const INVENTORY_RESERVATION_DEMAND_SOURCES = [
  "sales",
  "manufacturing",
  "service",
  "internal_transfer",
  "rental",
  "project",
  "manual_inventory",
  "fleet",
] as const;

export const INVENTORY_RESERVATION_FOUNDATION_STATUSES = [
  "draft",
  "requested",
  "partially_reserved",
  "reserved",
  "released",
  "expired",
  "cancelled",
  "failed",
] as const;

export const INVENTORY_RESERVATION_ALLOCATION_STRATEGIES = [
  "strict_serial",
  "strict_lot",
  "any_available",
  "fifo",
  "fefo",
  "location_priority",
  "manual",
] as const;

export const INVENTORY_RESERVATION_FOUNDATION_EVENT_NAMES = [
  "InventoryReservationRequested",
  "InventoryReservationCreated",
  "InventoryReservationPartiallyReserved",
  "InventoryReservationCompleted",
  "InventoryReservationReleased",
  "InventoryReservationExpired",
  "InventoryReservationFailed",
] as const;

export type InventoryReservationDemandSource = (typeof INVENTORY_RESERVATION_DEMAND_SOURCES)[number];
export type InventoryReservationFoundationStatus = (typeof INVENTORY_RESERVATION_FOUNDATION_STATUSES)[number];
export type InventoryReservationAllocationStrategy = (typeof INVENTORY_RESERVATION_ALLOCATION_STRATEGIES)[number];
export type InventoryReservationFoundationEventName = (typeof INVENTORY_RESERVATION_FOUNDATION_EVENT_NAMES)[number];

export type InventoryReservationLineDefinition = Readonly<{
  lineNumber: number;
  objectType: InventoryObjectType;
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  quantity?: number | null;
  uomId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: InventoryInventoryStatus | null;
  requestedQuantity: number;
  allocationStrategy?: InventoryReservationAllocationStrategy | null;
  validationMetadata?: Readonly<Record<string, unknown>>;
  snapshotMetadata?: Readonly<Record<string, unknown>>;
  objectLabel?: string | null;
}>;

export type InventoryReservationDefinition = Readonly<{
  reservationId: string;
  reservationNumber: string;
  sourceModule: InventoryReservationDemandSource;
  sourceDocumentType: string;
  sourceDocumentId?: string | null;
  sourceDocumentLineId?: string | null;
  demandStatus: InventoryReservationFoundationStatus;
  priority?: number;
  expiresAt?: string | null;
  correlationId: string;
  releaseReason?: string | null;
  lines: readonly InventoryReservationLineDefinition[];
}>;

export type InventoryReservableAvailabilityQuery = Readonly<{
  productId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: InventoryInventoryStatus | null;
}>;

export type InventoryReservableAvailability = Readonly<{
  anchorKey: string;
  availableQuantity: number;
  objectType: InventoryObjectType;
  productId: string | null;
  lotId: string | null;
  serialId: string | null;
  handlingUnitId: string | null;
  warehouseId: string | null;
  locationId: string | null;
  inventoryStatus: InventoryInventoryStatus | null;
}>;

export type InventoryReservationLineAllocation = Readonly<{
  lineNumber: number;
  requestedQuantity: number;
  reservedQuantity: number;
  shortageQuantity: number;
  allocationStrategy: InventoryReservationAllocationStrategy | null;
}>;

export type InventoryReservationAllocationResult = Readonly<{
  demandStatus: InventoryReservationFoundationStatus;
  eventName: InventoryReservationFoundationEventName;
  lines: readonly InventoryReservationLineAllocation[];
  allocations: readonly InventoryReservationAllocationRecord[];
}>;

export type InventoryReservationAllocationRecord = Readonly<{
  allocationId: string;
  reservationId: string;
  lineNumber: number;
  allocatedQuantity: number;
  projectionAnchorKey: string;
  objectType: InventoryObjectType;
  productId: string | null;
  lotId: string | null;
  serialId: string | null;
  handlingUnitId: string | null;
  warehouseId: string | null;
  locationId: string | null;
}>;

export type InventoryReservationEngineState = Readonly<{
  projectionState: InventoryProjectionEngineState;
  activeSerialReservations: ReadonlyMap<string, string>;
  activeHandlingUnitReservations: ReadonlyMap<string, string>;
  activeLotReservedQuantity: ReadonlyMap<string, number>;
  reservations: ReadonlyMap<string, InventoryReservationDefinition>;
  allocations: ReadonlyMap<string, InventoryReservationAllocationRecord>;
}>;

export type InventoryReservationSnapshot = Readonly<{
  reservation: InventoryReservationDefinition;
  lines: readonly InventoryReservationLineAllocation[];
  totalRequested: number;
  totalReserved: number;
  totalShortage: number;
}>;

export type InventoryReservationWorkspaceRecord = Readonly<{
  id: string;
  reservationNumber: string;
  sourceModule: string;
  demandStatus: string | null;
  status: string;
  priority: number;
  expiresAt: string | null;
  sourceDocumentType: string | null;
  sourceDocumentReference: string | null;
  correlationId: string;
  requestedQuantity: number;
  reservedQuantity: number;
  shortageQuantity: number;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
}>;

export type InventoryReservationWorkspaceData = Readonly<{
  records: readonly InventoryReservationWorkspaceRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;
