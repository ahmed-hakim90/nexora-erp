import type { InventoryProductStatus } from "./inventory-products";

export type InventoryRecordStatus = InventoryProductStatus;

export const INVENTORY_LOT_SOURCE_TYPES = [
  "supplier",
  "manufacturing",
  "repack",
  "return",
  "adjustment",
  "internal",
  "import",
] as const;

export const INVENTORY_LOT_QC_STATUSES = [
  "not_required",
  "pending",
  "passed",
  "failed",
  "hold",
  "released",
] as const;

export const INVENTORY_LOT_LIFECYCLE_STATES = [
  "draft",
  "active",
  "qc_pending",
  "qc_hold",
  "released",
  "blocked",
  "consumed",
  "expired",
  "archived",
] as const;

export type InventoryLotSourceType = (typeof INVENTORY_LOT_SOURCE_TYPES)[number];
export type InventoryLotQcStatus = (typeof INVENTORY_LOT_QC_STATUSES)[number];
export type InventoryLotLifecycleState = (typeof INVENTORY_LOT_LIFECYCLE_STATES)[number];

export type InventoryLotRecord = Readonly<{
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string | null;
  productId: string;
  productVariantId: string | null;
  lotNumber: string;
  sourceType: InventoryLotSourceType;
  sourceReferenceType: string | null;
  sourceReferenceId: string | null;
  supplierPartyId: string | null;
  supplierLotNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  qcStatus: InventoryLotQcStatus;
  lifecycleState: InventoryLotLifecycleState;
  status: InventoryRecordStatus;
  barcode: string;
  qrPayload: Readonly<Record<string, unknown>>;
  notes: string | null;
  traceabilityReady: boolean;
  sourceMetadata: Readonly<Record<string, unknown>>;
  productLabel: string;
  productTrackingMode: string;
  variantLabel: string | null;
  supplierLabel: string | null;
  issueBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventoryLotProductPolicy = Readonly<{
  trackingMode: string;
  lotSupplierSupported: boolean;
  lotInternalSupported: boolean;
  lotExpirySupported: boolean;
  lotManufacturingDateSupported: boolean;
  lotQcRequired: boolean;
  name: string;
}>;

export type InventoryLotWorkspaceData = Readonly<{
  records: readonly InventoryLotRecord[];
  nextCursor: string | null;
  pageSize: number;
  products: readonly { id: string; label: string; trackingMode: string; lotSupplierSupported: boolean; lotInternalSupported: boolean; lotExpirySupported: boolean; lotManufacturingDateSupported: boolean; lotQcRequired: boolean }[];
  variants: readonly { id: string; label: string; productId: string }[];
  suppliers: readonly { id: string; label: string }[];
}>;
