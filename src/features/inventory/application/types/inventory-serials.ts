import type { InventoryProductStatus } from "./inventory-products";

export type InventoryRecordStatus = InventoryProductStatus;

export const INVENTORY_SERIAL_SOURCES = [
  "nexora_generated",
  "supplier",
  "manual",
  "imported",
] as const;

export const INVENTORY_SERIAL_GENERATION_METHODS = [
  "policy_range",
  "manual_entry",
  "supplier_import",
  "bulk_import",
] as const;

export const INVENTORY_SERIAL_LIFECYCLE_STATES = [
  "draft",
  "generated",
  "imported",
  "packed",
  "available",
  "reserved",
  "picked",
  "shipped",
  "sold",
  "returned",
  "service",
  "repaired",
  "scrapped",
  "revoked",
  "archived",
] as const;

export const INVENTORY_SERIAL_STATUSES = [
  "active",
  "blocked",
  "damaged",
  "missing",
  "duplicate_suspected",
  "counterfeit_suspected",
  "archived",
] as const;

export const INVENTORY_SERIAL_VERIFICATION_STATUSES = [
  "not_required",
  "pending",
  "valid",
  "invalid",
  "suspected_duplicate",
  "revoked",
] as const;

export const INVENTORY_SERIAL_POLICY_RESET_SCOPES = [
  "global",
  "company",
  "branch",
  "product",
  "lot",
] as const;

export const INVENTORY_SERIAL_POLICY_PATTERN_TOKENS = [
  "{PREFIX}",
  "{COMPANY}",
  "{BRANCH}",
  "{PRODUCT}",
  "{LOT}",
  "{YEAR}",
  "{MONTH}",
  "{NUMBER}",
] as const;

export const INVENTORY_SERIAL_RESERVATION_STATUSES = [
  "pending",
  "reserved",
  "consumed",
  "expired",
  "cancelled",
] as const;

export type InventorySerialSource = (typeof INVENTORY_SERIAL_SOURCES)[number];
export type InventorySerialGenerationMethod = (typeof INVENTORY_SERIAL_GENERATION_METHODS)[number];
export type InventorySerialLifecycleState = (typeof INVENTORY_SERIAL_LIFECYCLE_STATES)[number];
export type InventorySerialStatus = (typeof INVENTORY_SERIAL_STATUSES)[number];
export type InventorySerialVerificationStatus = (typeof INVENTORY_SERIAL_VERIFICATION_STATUSES)[number];
export type InventorySerialPolicyResetScope = (typeof INVENTORY_SERIAL_POLICY_RESET_SCOPES)[number];
export type InventorySerialReservationStatus = (typeof INVENTORY_SERIAL_RESERVATION_STATUSES)[number];

export type InventorySerialRecord = Readonly<{
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string | null;
  productId: string;
  productVariantId: string | null;
  lotId: string | null;
  serialNumber: string;
  serialSource: InventorySerialSource;
  generationMethod: InventorySerialGenerationMethod;
  lifecycleState: InventorySerialLifecycleState;
  serialStatus: InventorySerialStatus;
  verificationStatus: InventorySerialVerificationStatus;
  verificationTokenHash: string | null;
  barcode: string;
  qrPayload: Readonly<Record<string, unknown>>;
  currentHandlingUnitId: string | null;
  currentWarehouseId: string | null;
  currentLocationId: string | null;
  currentCustodian: Readonly<Record<string, unknown>>;
  warrantyReady: boolean;
  serviceReady: boolean;
  firstActivationReady: boolean;
  traceabilityReady: boolean;
  notes: string | null;
  sourceMetadata: Readonly<Record<string, unknown>>;
  policyId: string | null;
  soldDocumentReference: string | null;
  serviceCaseReference: string | null;
  status: InventoryRecordStatus;
  productLabel: string;
  productTrackingMode: string;
  variantLabel: string | null;
  lotLabel: string | null;
  handlingUnitLabel: string | null;
  locationLabel: string | null;
  warehouseLabel: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type InventorySerialProductPolicy = Readonly<{
  trackingMode: string;
  serialSource: string | null;
  serialGenerationTiming: string | null;
  serialAllowManualOverride: boolean;
  serialDuplicateValidation: boolean;
  name: string;
}>;

export type InventorySerialPolicyRecord = Readonly<{
  id: string;
  policyCode: string;
  pattern: string;
  prefix: string | null;
  digits: number;
  resetScope: InventorySerialPolicyResetScope;
  startNumber: number;
  allowManualOverride: boolean;
  duplicateValidation: boolean;
  generationTiming: string;
  productId: string | null;
  label: string;
}>;

export type InventorySerialWorkspaceData = Readonly<{
  records: readonly InventorySerialRecord[];
  nextCursor: string | null;
  pageSize: number;
  products: readonly { id: string; label: string; trackingMode: string; serialSource: string | null; serialGenerationTiming: string | null; serialAllowManualOverride: boolean; serialDuplicateValidation: boolean }[];
  variants: readonly { id: string; label: string; productId: string }[];
  lots: readonly { id: string; label: string; productId: string }[];
  policies: readonly InventorySerialPolicyRecord[];
  handlingUnits: readonly { id: string; label: string }[];
  warehouses: readonly { id: string; label: string }[];
  locations: readonly { id: string; label: string }[];
}>;

export type InventorySerialSequenceReservationContract = Readonly<{
  sequenceKey: string;
  policyId: string;
  currentNumber: number;
  reservedFrom: number;
  reservedTo: number;
  reservationStatus: InventorySerialReservationStatus;
  idempotencyKey: string;
  correlationId?: string | null;
  expiresAt?: string | null;
}>;
