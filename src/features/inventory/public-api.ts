import {
  createCostDashboardIntegrationContract,
  createCostEventIntegrationContract,
  createCostExportIntegrationContract,
  createCostJobReadinessContract,
  createCostReportIntegrationContract,
  createCostSearchIntegrationContract,
  createExportDashboardIntegrationContract,
  createExportJobReadinessContract,
  createExportReportIntegrationContract,
  createExportSearchIntegrationContract,
  createImportJobReadinessContract,
  createImportSearchIndexingContract,
  createJobReadinessContract,
  defineAppKey,
  defineAuditAction,
  defineCostDefinition,
  defineDashboardTemplate,
  defineDashboardWidget,
  defineDocumentBehavior,
  defineDocumentLifecycle,
  defineDocumentType,
  defineDocumentTypeDefinition,
  defineExport,
  defineImport,
  definePlatformEventDefinition,
  definePlatformEventName,
  definePrintTemplate,
  defineReport,
  defineReportDataset,
  defineSearchProvider,
} from "@/platform/public-api";
import type { DocumentType } from "@/platform/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

import { createFinancePostingReadinessContract } from "@/features/finance/public-api";
import type {
  InventoryCurrentStateProjectionDefinition,
  InventoryDocumentLineDefinition,
  InventoryDocumentSnapshotDefinition,
  InventoryFoundationDocumentKind,
  InventoryInventoryStatus,
  InventoryObjectRef,
  InventoryObjectType,
  InventoryProjectionKind,
} from "./application/types/inventory-documents";
import type { InventoryLedgerEntryDefinition } from "./application/types/inventory-ledger";
import { inventoryAppManifest } from "./app.manifest";
import { inventoryModuleManifest } from "./module.manifest";
import { INVENTORY_PERMISSIONS, INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";

export { inventoryAppManifest } from "./app.manifest";
export { inventoryModuleManifest } from "./module.manifest";
export {
  getInventoryFoundationEntity,
  INVENTORY_FOUNDATION_ENTITIES,
  INVENTORY_FOUNDATION_RESOURCE_KEYS,
  isInventoryFoundationResourceKey,
} from "./application/foundation-entities";
export { buildInventoryFoundationMutationSchema } from "./application/schemas/inventory-foundation.schema";
export {
  assertChildHuCurrentUniqueness,
  assertSerialCurrentUniqueness,
  formatHandlingUnitLabel,
  INVENTORY_HANDLING_UNIT_CONTENT_TYPES,
  INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES,
  INVENTORY_HANDLING_UNIT_STATUSES,
  inventoryHandlingUnitContentMutationSchema,
  inventoryHandlingUnitMutationSchema,
  inventoryHandlingUnitTypeMutationSchema,
  isCurrentHandlingUnitContent,
  validateHandlingUnitContentPayload,
  validateHandlingUnitOpenClosedMetadata,
} from "./application/schemas/inventory-handling-units.schema";
export {
  INVENTORY_LOT_LIFECYCLE_STATES,
  INVENTORY_LOT_QC_STATUSES,
  INVENTORY_LOT_SOURCE_TYPES,
} from "./application/types/inventory-lots";
export {
  formatLotLabel,
  INVENTORY_LOT_TRACEABILITY_CHANNELS,
  inventoryLotMutationSchema,
  isLotIssueBlocked,
  productAllowsLots,
  validateLotAgainstProductPolicy,
  validateLotLifecycleMetadata,
  validateLotSourcePayload,
} from "./application/schemas/inventory-lots.schema";
export {
  assertSerialHandlingUnitReadiness,
  assertSerialWarrantyServiceReadiness,
  formatSerialLabel,
  inventorySerialMutationSchema,
  inventorySerialPolicyMutationSchema,
  inventorySerialSequenceReservationSchema,
  isSerialCurrentlyInHandlingUnit,
  productAllowsSerials,
  validateSerialAgainstProductPolicy,
  validateSerialLifecycleStatus,
  validateSerialPolicyPattern,
  validateSerialSourcePayload,
} from "./application/schemas/inventory-serials.schema";
export { inventoryProductMutationSchema } from "./application/schemas/inventory-products.schema";
export {
  INVENTORY_MANUFACTURING_ITEM_ROLE_OPTIONS,
  INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES,
  INVENTORY_PRODUCTION_WAREHOUSE_TYPE_OPTIONS,
  isInventoryManufacturingItemRole,
  type InventoryManufacturingItemRole,
} from "./domain/manufacturing-item-roles";
export {
  inventoryCurrentStateProjectionSchema,
  inventoryDocumentLineSchema,
  inventoryDocumentSnapshotSchema,
  inventoryFoundationDocumentKindSchema,
  inventoryObjectRefSchema,
  isProjectionOnlyIdentityField,
  validateDocumentSnapshot,
  validateInventoryDocumentLine,
  validateInventoryObjectRef,
  validateProjectionContract,
} from "./application/schemas/inventory-documents.schema";
export {
  buildLedgerAuditChain,
  inventoryLedgerEntrySchema,
  inventoryLedgerListQuerySchema,
  validateInventoryLedgerEntry,
  validateLedgerReversalPair,
} from "./application/schemas/inventory-ledger.schema";
export {
  inventoryProjectionReadQuerySchema,
  inventoryProjectionRuntimeStateSchema,
  validateProjectionEngineWriteBoundary,
  validateProjectionReadOnlyApi,
} from "./application/schemas/inventory-projection.schema";
export {
  inventoryReservationLineSchema,
  inventoryReservationListQuerySchema,
  inventoryReservationSchema,
  validateInventoryReservation,
  validateInventoryReservationLine,
  validateReservationEngineWriteBoundary,
} from "./application/schemas/inventory-reservation.schema";
export {
  allocateReservation,
  calculateShortage,
  createEmptyReservationEngineState,
  expireReservation,
  getReservableAvailability,
  getReservationSnapshot,
  isSerialAlreadyReserved,
  releaseReservation,
  validateReservationObjectRules,
} from "./application/services/inventory-reservation.engine";
export {
  applyLedgerEntryToProjectionState,
  buildProjectionAnchorKey,
  buildProjectionIdempotencyKey,
  createEmptyProjectionEngineState,
  getAvailabilitySnapshot,
  getCurrentStock,
  getHandlingUnitCurrentState,
  getLedgerBackedCurrentState,
  getSerialCurrentState,
  processInventoryProjectionEvent,
  rebuildProjectionFromLedger,
  sortLedgerEntriesForReplay,
} from "./application/services/inventory-projection.engine";
export {
  INVENTORY_LEDGER_BUSINESS_MODULES,
  INVENTORY_LEDGER_EVENT_TYPES,
  INVENTORY_LEDGER_MOVEMENT_DIRECTIONS,
  INVENTORY_LEDGER_MOVEMENT_TYPES,
  INVENTORY_LEDGER_OBJECT_TYPES,
  INVENTORY_LEDGER_PROJECTION_EVENT_NAMES,
} from "./application/types/inventory-ledger";
export type {
  InventoryLedgerBusinessModule,
  InventoryLedgerEntryDefinition,
  InventoryLedgerEntryRecord,
  InventoryLedgerEventType,
  InventoryLedgerMovementDirection,
  InventoryLedgerMovementType,
  InventoryLedgerObjectType,
  InventoryLedgerProjectionEventName,
} from "./application/types/inventory-ledger";
export {
  INVENTORY_SERIAL_GENERATION_METHODS,
  INVENTORY_SERIAL_LIFECYCLE_STATES,
  INVENTORY_SERIAL_POLICY_PATTERN_TOKENS,
  INVENTORY_SERIAL_POLICY_RESET_SCOPES,
  INVENTORY_SERIAL_RESERVATION_STATUSES,
  INVENTORY_SERIAL_SOURCES,
  INVENTORY_SERIAL_STATUSES,
  INVENTORY_SERIAL_VERIFICATION_STATUSES,
} from "./application/types/inventory-serials";
export {
  INVENTORY_RESERVATION_ALLOCATION_STRATEGIES,
  INVENTORY_RESERVATION_DEMAND_SOURCES,
  INVENTORY_RESERVATION_FOUNDATION_EVENT_NAMES,
  INVENTORY_RESERVATION_FOUNDATION_STATUSES,
} from "./application/types/inventory-reservation";
export type {
  InventoryReservationAllocationRecord,
  InventoryReservationAllocationResult,
  InventoryReservationDefinition,
  InventoryReservationDemandSource,
  InventoryReservationEngineState,
  InventoryReservationFoundationEventName,
  InventoryReservationFoundationStatus,
  InventoryReservationLineAllocation,
  InventoryReservationLineDefinition,
  InventoryReservationSnapshot,
  InventoryReservableAvailability,
  InventoryReservableAvailabilityQuery,
} from "./application/types/inventory-reservation";
export {
  INVENTORY_DOCUMENT_LIFECYCLE_STATES,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_FOUNDATION_DOCUMENT_KINDS,
  INVENTORY_INVENTORY_STATUSES,
  INVENTORY_OBJECT_TYPES,
  INVENTORY_PROJECTION_KINDS,
} from "./application/types/inventory-documents";
export {
  INVENTORY_PROJECTION_REBUILD_STATUSES,
  INVENTORY_PROJECTION_SHELL_STATUS_MAP,
} from "./application/types/inventory-projection";
export type {
  InventoryAvailabilitySnapshotQuery,
  InventoryCurrentStockQuery,
  InventoryHandlingUnitIdentityProjection,
  InventoryLedgerBackedCurrentStateQuery,
  InventoryProjectionApplyResult,
  InventoryProjectionEngineState,
  InventoryProjectionEventInput,
  InventoryProjectionRebuildResult,
  InventoryProjectionRebuildStatus,
  InventoryProjectionRow,
  InventoryProjectionRuntimeState,
  InventorySerialIdentityProjection,
} from "./application/types/inventory-projection";
export type {
  InventoryCurrentStateProjectionDefinition,
  InventoryDocumentLineDefinition,
  InventoryDocumentSnapshotDefinition,
  InventoryFoundationDocumentKind,
  InventoryInventoryStatus,
  InventoryObjectRef,
  InventoryObjectType,
  InventoryProjectionKind,
} from "./application/types/inventory-documents";
export type {
  InventoryFoundationDescriptor,
  InventoryFoundationField,
  InventoryFoundationResourceKey,
} from "./application/foundation-entities";
export { INVENTORY_PERMISSIONS, INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";
export { INVENTORY_PAGE_CONFIGS } from "./presentation/view-models/page-config";
export {
  createInventoryFoundationService,
  createInventoryProjectionService,
  createInventoryTransactionServices,
  createStockPostingService,
} from "./routes/service-factory";

export const INVENTORY_APP_KEY = defineAppKey("inventory");

export type InventoryRecordStatus = "draft" | "active" | "inactive" | "locked" | "archived";
export type InventoryProductKind = "stockable" | "consumable" | "service" | "asset" | "rental" | "kit";
export type InventoryTrackingMode = "none" | "quantity_only" | "lot" | "serial" | "lot_serial";
export type InventoryUomKind = "quantity" | "weight" | "volume" | "length" | "time" | "package" | "custom";
export type InventoryWarehouseType = "main" | "finished_goods" | "raw_materials" | "spare_parts" | "service" | "returns" | "scrap" | "qc" | "production_buffer" | "transit";
export type InventoryLocationKind = "zone" | "aisle" | "rack" | "shelf" | "bin" | "receiving" | "shipping" | "qc_hold" | "returns" | "scrap" | "production_input" | "production_output" | "transit";
export type InventoryMovementDirection = "in" | "out" | "internal" | "adjustment";
export type InventoryMovementDocumentKind = "movement" | "transfer" | "adjustment" | "opening_balance";
export type InventoryReservationPolicy = "none" | "soft" | "hard";
export type InventoryReservationKind =
  | "soft_hold"
  | "hard_reservation"
  | "transfer_reservation"
  | "manufacturing_reservation"
  | "sales_reservation"
  | "service_reservation"
  | "rental_reservation"
  | "project_reservation"
  | "custom";
export type InventoryReservationStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "reserved"
  | "picked"
  | "issued"
  | "in_transit"
  | "received"
  | "completed"
  | "rejected"
  | "cancelled"
  | "released"
  | "expired"
  | "consumed";
export type InventoryQuantityBucket =
  | "on_hand"
  | "reserved"
  | "pending_approval"
  | "in_transit"
  | "incoming"
  | "outgoing"
  | "damaged"
  | "quarantine";
export type InventoryReorderPolicy = "min_max" | "reorder_point" | "manual_review";
export type InventorySerialSource = "nexora_generated" | "supplier" | "manual" | "imported";
export type InventorySerialGenerationTiming = "on_receipt" | "on_production_completion" | "on_packing" | "manual";
export type InventoryWarrantyStartsFrom = "invoice_date" | "delivery_date" | "manual_activation";
export type InventoryCycleCountClass = "A" | "B" | "C";

export type InventoryScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type InventoryProductDefinition = InventoryScope & Readonly<{
  productKey: string;
  sku: string;
  name: string;
  commercialName?: string | null;
  barcode?: string | null;
  brand?: string | null;
  categoryKey?: string | null;
  baseUomKey: string;
  productKind: InventoryProductKind;
  trackingMode: InventoryTrackingMode;
  reservationPolicy: InventoryReservationPolicy;
  serialPolicy?: InventorySerialPolicyDefinition | null;
  lotPolicy?: InventoryLotPolicyDefinition | null;
  packagingPolicy?: InventoryPackagingPolicyDefinition | null;
  inventoryPolicy?: InventoryProductInventoryPolicyDefinition | null;
  warrantyPolicy?: InventoryWarrantyPolicyDefinition | null;
  searchKeywords?: readonly string[];
  costObjectKey?: string | null;
  financeDimensionKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventorySerialPolicyDefinition = Readonly<{
  source: InventorySerialSource;
  generationTiming: InventorySerialGenerationTiming;
  duplicateValidation: boolean;
  allowManualOverride: boolean;
  runtimeGenerationImplemented: false;
}>;

export type InventoryLotPolicyDefinition = Readonly<{
  supplierLot: boolean;
  internalLot: boolean;
  expirySupported: boolean;
  manufacturingDateSupported: boolean;
  qcRequired: boolean;
  shelfLifeSupported: boolean;
  runtimeGenerationImplemented: false;
}>;

export type InventoryPackagingPolicyDefinition = Readonly<{
  looseUnits: true;
  innerBoxQty?: number | null;
  cartonQty?: number | null;
  palletCartonQty?: number | null;
  handlingUnitsImplemented: false;
}>;

export type InventoryProductInventoryPolicyDefinition = Readonly<{
  allowNegativeStock: boolean;
  requiresReservation: boolean;
  requiresQcBeforeRelease: boolean;
  defaultWarehouseKey?: string | null;
  defaultPutawayStrategy?: string | null;
  defaultPickingStrategy?: string | null;
  cycleCountClass?: InventoryCycleCountClass | null;
  warehouseExecutionImplemented: false;
  ledgerImplemented: false;
}>;

export type InventoryWarrantyPolicyDefinition = Readonly<{
  eligible: boolean;
  durationDays?: number | null;
  startsFrom?: InventoryWarrantyStartsFrom | null;
  warrantyEngineImplemented: false;
}>;

export type InventoryProductMasterPolicyContract = Readonly<{
  key: string;
  canonicalSource: "inventory_products";
  trackingModes: readonly InventoryTrackingMode[];
  serialSources: readonly InventorySerialSource[];
  serialGenerationTimings: readonly InventorySerialGenerationTiming[];
  packagingLevels: readonly ["loose_units", "inner_box", "carton", "pallet"];
  cycleCountClasses: readonly InventoryCycleCountClass[];
  warrantyStartsFrom: readonly InventoryWarrantyStartsFrom[];
  searchFields: readonly ["sku", "barcode", "name", "commercialName", "searchKeywords"];
  appIntegrations: readonly ["app-registry", "search", "print", "reporting", "dashboard"];
  runtimeExecutionImplemented: false;
  implementsPurchasing: false;
  implementsSales: false;
  implementsManufacturing: false;
  implementsCosting: false;
  implementsWarrantyEngine: false;
  implementsWarehouseOperations: false;
  implementsInventoryLedger: false;
}>;

export type InventoryProductVariantDefinition = InventoryScope & Readonly<{
  productKey: string;
  variantKey: string;
  sku: string;
  name: string;
  attributes: Readonly<Record<string, string | number | boolean>>;
  trackingMode?: InventoryTrackingMode;
  status: InventoryRecordStatus;
}>;

export type InventoryProductCategoryDefinition = InventoryScope & Readonly<{
  categoryKey: string;
  name: string;
  parentCategoryKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventoryUomCategoryDefinition = InventoryScope & Readonly<{
  categoryKey: string;
  name: string;
  uomKind: InventoryUomKind;
  status: InventoryRecordStatus;
}>;

export type InventoryUomDefinition = InventoryScope & Readonly<{
  uomKey: string;
  categoryKey: string;
  name: string;
  symbol: string;
  conversionFactorToBase: number;
  precision: number;
  isBaseUom: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryWarehouseDefinition = InventoryScope & Readonly<{
  warehouseKey: string;
  name: string;
  warehouseType: InventoryWarehouseType;
  managerId?: string | null;
  costCenterId?: string | null;
  defaultReceivingLocationKey?: string | null;
  defaultShippingLocationKey?: string | null;
  defaultQcLocationKey?: string | null;
  defaultReturnsLocationKey?: string | null;
  operationalPolicies?: Readonly<Record<string, unknown>>;
  status: InventoryRecordStatus;
}>;

export type InventoryLocationDefinition = InventoryScope & Readonly<{
  warehouseKey: string;
  locationKey: string;
  name: string;
  locationKind: InventoryLocationKind;
  parentLocationKey?: string | null;
  barcode: string;
  capacityMetadata?: Readonly<Record<string, unknown>>;
  allowedProductCategories?: readonly string[];
  allowedInventoryStatuses?: readonly string[];
  pickable: boolean;
  receivable: boolean;
  shippable: boolean;
  qcRequired: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryWarehouseLocationArchitectureContract = Readonly<{
  key: string;
  warehouseTable: "inventory_warehouses";
  locationTable: "inventory_locations";
  warehouseTypes: readonly InventoryWarehouseType[];
  locationTypes: readonly InventoryLocationKind[];
  hierarchy: readonly ["warehouse", "zone", "aisle", "rack", "shelf", "bin"];
  operationalLocationTypes: readonly ["receiving", "shipping", "qc_hold", "returns", "scrap", "production_input", "production_output", "transit"];
  barcodeReady: true;
  quantityFieldsAllowed: false;
  stockBalanceFieldsAllowed: false;
  appIntegrations: readonly ["app-registry", "search", "reporting", "print", "dashboard", "import-export"];
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsHandlingUnits: false;
  implementsPickingPacking: false;
  implementsWarehouseExecution: false;
  implementsPurchasing: false;
  implementsSales: false;
  implementsManufacturing: false;
  implementsCosting: false;
}>;

export type InventoryLotDefinition = InventoryScope & Readonly<{
  lotNumber: string;
  productKey: string;
  variantKey?: string | null;
  sourceType: InventoryLotSourceType;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  supplierPartyKey?: string | null;
  supplierLotNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  receivedDate?: string | null;
  qcStatus: InventoryLotQcStatus;
  lifecycleState: InventoryLotLifecycleState;
  barcode: string;
  qrPayload?: Readonly<Record<string, unknown>>;
  notes?: string | null;
  traceabilityReady: boolean;
  sourceMetadata?: Readonly<Record<string, unknown>>;
  status: InventoryRecordStatus;
}>;

export type InventoryLotSourceType =
  | "supplier"
  | "manufacturing"
  | "repack"
  | "return"
  | "adjustment"
  | "internal"
  | "import";

export type InventoryLotQcStatus =
  | "not_required"
  | "pending"
  | "passed"
  | "failed"
  | "hold"
  | "released";

export type InventoryLotLifecycleState =
  | "draft"
  | "active"
  | "qc_pending"
  | "qc_hold"
  | "released"
  | "blocked"
  | "consumed"
  | "expired"
  | "archived";

export type InventoryLotArchitectureContract = Readonly<{
  key: string;
  lotTable: "inventory_lots";
  sourceTypes: readonly InventoryLotSourceType[];
  qcStatuses: readonly InventoryLotQcStatus[];
  lifecycleStates: readonly InventoryLotLifecycleState[];
  traceabilityChannels: readonly [
    "supplier_receipt",
    "production_order",
    "qc",
    "handling_units",
    "serials",
    "shipments",
    "customers",
    "service_cases",
    "recalls",
  ];
  barcodeReady: true;
  qrReady: true;
  printReady: true;
  handlingUnitIntegrationReady: true;
  serialIntegrationReady: true;
  handlingUnitContentCapabilities: readonly ["lot_quantity", "serials_in_lot", "cartons_in_lot", "mixed_lots_where_allowed"];
  quantityFieldsAllowed: false;
  stockBalanceFieldsAllowed: false;
  availabilityRuntimeImplemented: false;
  qcWorkflowRuntimeImplemented: false;
  expiryJobRuntimeImplemented: false;
  serialGenerationRuntimeImplemented: false;
  appIntegrations: readonly ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"];
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsReservations: false;
  implementsManufacturing: false;
  implementsPurchasing: false;
  implementsSales: false;
  implementsCosting: false;
  implementsWarranty: false;
  runtimeExecutionImplemented: false;
}>;

export type InventorySerialNumberDefinition = InventoryScope & Readonly<{
  serialNumber: string;
  productKey: string;
  variantKey?: string | null;
  lotKey?: string | null;
  serialSource: InventorySerialSource;
  generationMethod: "policy_range" | "manual_entry" | "supplier_import" | "bulk_import";
  lifecycleState:
    | "draft"
    | "generated"
    | "imported"
    | "packed"
    | "available"
    | "reserved"
    | "picked"
    | "shipped"
    | "sold"
    | "returned"
    | "service"
    | "repaired"
    | "scrapped"
    | "revoked"
    | "archived";
  serialStatus:
    | "active"
    | "blocked"
    | "damaged"
    | "missing"
    | "duplicate_suspected"
    | "counterfeit_suspected"
    | "archived";
  verificationStatus:
    | "not_required"
    | "pending"
    | "valid"
    | "invalid"
    | "suspected_duplicate"
    | "revoked";
  verificationTokenHash?: string | null;
  barcode: string;
  qrPayload?: Readonly<Record<string, unknown>>;
  currentHandlingUnitKey?: string | null;
  currentWarehouseKey?: string | null;
  currentLocationKey?: string | null;
  currentCustodian?: Readonly<Record<string, unknown>>;
  policyCode?: string | null;
  warrantyReady: boolean;
  serviceReady: boolean;
  firstActivationReady: boolean;
  traceabilityReady: boolean;
  soldDocumentReference?: string | null;
  serviceCaseReference?: string | null;
  sourceMetadata?: Readonly<Record<string, unknown>>;
  notes?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventorySerialEnginePolicyDefinition = InventoryScope & Readonly<{
  policyCode: string;
  pattern: string;
  prefix?: string | null;
  digits: number;
  resetScope: "global" | "company" | "branch" | "product" | "lot";
  startNumber: number;
  allowManualOverride: boolean;
  duplicateValidation: boolean;
  generationTiming: InventorySerialGenerationTiming;
  productKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventorySerialSequenceReservationDefinition = InventoryScope & Readonly<{
  sequenceKey: string;
  policyId: string;
  currentNumber: number;
  reservedFrom: number;
  reservedTo: number;
  reservedBy?: string | null;
  reservationStatus: "pending" | "reserved" | "consumed" | "expired" | "cancelled";
  expiresAt?: string | null;
  idempotencyKey: string;
  correlationId?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventorySerialEngineArchitectureContract = Readonly<{
  key: string;
  serialTable: "inventory_serial_numbers";
  policyTable: "inventory_serial_policies";
  sequenceReservationTable: "inventory_serial_sequence_reservations";
  serialSources: readonly InventorySerialSource[];
  generationMethods: readonly ["policy_range", "manual_entry", "supplier_import", "bulk_import"];
  lifecycleStates: readonly [
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
  ];
  serialStatuses: readonly [
    "active",
    "blocked",
    "damaged",
    "missing",
    "duplicate_suspected",
    "counterfeit_suspected",
    "archived",
  ];
  verificationStatuses: readonly [
    "not_required",
    "pending",
    "valid",
    "invalid",
    "suspected_duplicate",
    "revoked",
  ];
  policyPatternTokens: readonly [
    "{PREFIX}",
    "{COMPANY}",
    "{BRANCH}",
    "{PRODUCT}",
    "{LOT}",
    "{YEAR}",
    "{MONTH}",
    "{NUMBER}",
  ];
  reservationStatuses: readonly ["pending", "reserved", "consumed", "expired", "cancelled"];
  uniquenessScope: "company";
  serialCurrentHandlingUnitUniqueness: true;
  serialCurrentLocationUniqueness: true;
  currentStateProjectionOnlyFields: readonly [
    "current_handling_unit_id",
    "current_warehouse_id",
    "current_location_id",
    "current_custodian",
  ];
  identityOwnsCurrentState: false;
  idempotencyProtectedGeneration: true;
  gapsAllowedInSequences: true;
  barcodeReady: true;
  qrReady: true;
  verificationSigningRuntimeImplemented: false;
  generationRuntimeImplemented: false;
  lotIntegrationReady: true;
  handlingUnitIntegrationReady: true;
  warrantyRuntimeImplemented: false;
  serviceRuntimeImplemented: false;
  quantityFieldsAllowed: false;
  stockBalanceFieldsAllowed: false;
  appIntegrations: readonly ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"];
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsPickingPacking: false;
  implementsWarranty: false;
  implementsService: false;
  runtimeExecutionImplemented: false;
}>;

export type InventoryHandlingUnitTypeDefinition = InventoryScope & Readonly<{
  typeKey: string;
  name: string;
  description?: string | null;
  level: number;
  parentAllowed: boolean;
  childAllowed: boolean;
  defaultCapacity?: number | null;
  weightCapacity?: number | null;
  dimensionMetadata?: Readonly<Record<string, unknown>>;
  reusable: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryHandlingUnitStatus =
  | "empty"
  | "packed"
  | "partial"
  | "opened"
  | "closed"
  | "reserved"
  | "picked"
  | "shipped"
  | "returned"
  | "damaged"
  | "scrapped"
  | "archived";

export type InventoryHandlingUnitLifecycleState =
  | "draft"
  | "active"
  | "sealed"
  | "opened"
  | "closed"
  | "split_ready"
  | "merge_ready"
  | "repack_ready"
  | "traceable"
  | "archived";

export type InventoryHandlingUnitContentType =
  | "product_quantity"
  | "lot_quantity"
  | "serial_reference"
  | "child_handling_unit";

export type InventoryHandlingUnitDefinition = InventoryScope & Readonly<{
  huNumber: string;
  typeKey: string;
  warehouseKey: string;
  locationKey?: string | null;
  parentHuNumber?: string | null;
  lotKey?: string | null;
  productKey?: string | null;
  huStatus: InventoryHandlingUnitStatus;
  lifecycleState: InventoryHandlingUnitLifecycleState;
  barcode: string;
  qrPayload?: Readonly<Record<string, unknown>>;
  grossWeight?: number | null;
  netWeight?: number | null;
  dimensionsMetadata?: Readonly<Record<string, unknown>>;
  sealedAt?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  currentCustodian?: Readonly<Record<string, unknown>>;
  splitReady: boolean;
  mergeReady: boolean;
  repackReady: boolean;
  traceabilityReady: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryHandlingUnitContentDefinition = InventoryScope & Readonly<{
  huNumber: string;
  contentType: InventoryHandlingUnitContentType;
  productKey?: string | null;
  lotKey?: string | null;
  serialKey?: string | null;
  childHuNumber?: string | null;
  quantity: number;
  uomKey?: string | null;
  status: InventoryRecordStatus;
  addedAt: string;
  removedAt?: string | null;
  reasonMetadata?: Readonly<Record<string, unknown>>;
}>;

export type InventoryHandlingUnitArchitectureContract = Readonly<{
  key: string;
  handlingUnitTypeTable: "inventory_handling_unit_types";
  handlingUnitTable: "inventory_handling_units";
  contentTable: "inventory_handling_unit_contents";
  huStatuses: readonly InventoryHandlingUnitStatus[];
  lifecycleStates: readonly InventoryHandlingUnitLifecycleState[];
  contentTypes: readonly InventoryHandlingUnitContentType[];
  currentContentRule: "removed_at is null";
  historicalContentNeverDeleted: true;
  serialCurrentUniqueness: true;
  childHuCurrentUniqueness: true;
  barcodeReady: true;
  qrReady: true;
  splitMergeReady: true;
  repackReady: true;
  traceabilityReady: true;
  lotIntegrationReady: true;
  serialIntegrationReady: true;
  currentStateProjectionOnlyFields: readonly ["warehouse_id", "location_id", "current_custodian"];
  identityOwnsCurrentState: false;
  lotContentCapabilities: readonly ["lot_quantity", "serials_in_lot", "cartons_in_lot", "mixed_lots_where_allowed"];
  quantityMovementImplemented: false;
  stockDeductionImplemented: false;
  ledgerPostingImplemented: false;
  pickingPackingRuntimeImplemented: false;
  warehouseExecutionRuntimeImplemented: false;
  appIntegrations: readonly ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"];
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsPickingPacking: false;
  implementsWarehouseExecution: false;
  implementsPurchasing: false;
  implementsSales: false;
  implementsManufacturing: false;
  implementsCosting: false;
  implementsWarranty: false;
  runtimeExecutionImplemented: false;
}>;

export type InventoryStockBalanceContract = InventoryScope & Readonly<{
  productKey: string;
  variantKey?: string | null;
  warehouseKey: string;
  locationKey: string;
  lotKey?: string | null;
  serialKey?: string | null;
  uomKey: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  source: "inventory-owned";
  costFieldsOwnedByCostEngine: true;
}>;

export type InventoryQuantityModelContract = Readonly<{
  key: string;
  owner: "inventory-engine";
  storedBuckets: readonly InventoryQuantityBucket[];
  derivedBuckets: readonly ["available"];
  availableFormula: "on_hand - reserved - pending_approval - outgoing - damaged - quarantine";
  availableStoredManually: false;
  supportsNegativeAvailableByPolicyOnly: true;
}>;

export type InventoryReservationEngineContract = Readonly<{
  key: string;
  owner: "inventory-reservation-engine";
  operations: readonly [
    "reserve_quantity",
    "release_quantity",
    "consume_reservation",
    "expire_reservation",
    "reject_reservation",
    "recalculate_availability",
    "validate_reservation",
    "validate_concurrency",
    "write_reservation_audit",
    "publish_reservation_events",
  ];
  concurrencyStrategy: Readonly<{
    database: "postgres";
    lock: "transactional-row-lock-and-advisory-key";
    idempotencyRequired: true;
    frontendValidationTrusted: false;
    noOversellingUnlessPolicyAllowsNegativeAvailable: true;
  }>;
  availabilitySource: "inventory_current_state_projections";
  identityTableReadsForbidden: true;
  ledgerMutationAllowed: false;
  stockMutationAllowed: false;
  writeSetting: "app.inventory_reservation_engine";
  readApis: readonly ["getReservableAvailability", "getReservationSnapshot", "calculateShortage"];
  runtimeExecutionImplemented: true;
  implementsAccounting: false;
  implementsCosting: false;
  implementsWarehouseExecution: false;
}>;

export type InventoryReservationFoundationLifecycleContract = Readonly<{
  key: string;
  statuses: readonly [
    "draft",
    "requested",
    "partially_reserved",
    "reserved",
    "released",
    "expired",
    "cancelled",
    "failed",
  ];
  initialStatus: "draft";
  terminalStatuses: readonly ["released", "expired", "cancelled", "failed"];
  demandSources: readonly [
    "sales",
    "manufacturing",
    "service",
    "internal_transfer",
    "rental",
    "project",
    "manual_inventory",
    "fleet",
  ];
  allocationStrategies: readonly [
    "strict_serial",
    "strict_lot",
    "any_available",
    "fifo",
    "fefo",
    "location_priority",
    "manual",
  ];
}>;

export type InventoryReservationAvailabilityContract = Readonly<{
  key: string;
  projectionTable: "inventory_current_state_projections";
  identityTablesForbidden: true;
  ledgerMutationAllowed: false;
  stockMutationAllowed: false;
}>;

export type InventoryReservationEventsContract = Readonly<{
  key: string;
  events: readonly [
    "InventoryReservationRequested",
    "InventoryReservationCreated",
    "InventoryReservationPartiallyReserved",
    "InventoryReservationCompleted",
    "InventoryReservationReleased",
    "InventoryReservationExpired",
    "InventoryReservationFailed",
  ];
  handlersImplemented: false;
}>;

export type InventoryReservationExpiryContract = Readonly<{
  key: string;
  expiryQueueTable: "inventory_reservation_expiry_queue";
  schedulerImplemented: false;
  backgroundJobReadiness: true;
}>;

export type InventoryReservationLifecycleContract = Readonly<{
  initialStatus: "draft";
  terminalStatuses: readonly ["completed", "cancelled", "released", "expired", "consumed", "rejected"];
  statuses: readonly InventoryReservationStatus[];
  transferFlow: readonly ["draft", "pending_approval", "approved", "reserved", "issued", "in_transit", "received", "completed"];
  noReservationStatuses: readonly ["draft"];
  softHoldStatuses: readonly ["pending_approval"];
  hardReservationStatuses: readonly ["approved", "reserved", "picked"];
  inTransitStatuses: readonly ["issued", "in_transit"];
  releaseStatuses: readonly ["rejected", "cancelled", "released", "expired"];
}>;

export type InventoryReservationPlatformIntegrationContract = Readonly<{
  key: string;
  integrations: readonly [
    "platform-events",
    "background-jobs",
    "audit",
    "notifications",
    "search",
    "reporting",
    "dashboard",
    "import-export",
    "workflow",
    "approvals",
  ];
  handlersImplemented: false;
  runtimeExecutionImplemented: false;
}>;

export type InventoryReorderRuleDefinition = InventoryScope & Readonly<{
  ruleKey: string;
  productKey: string;
  variantKey?: string | null;
  warehouseKey: string;
  locationKey?: string | null;
  policy: InventoryReorderPolicy;
  minimumQuantity: number;
  maximumQuantity?: number | null;
  reorderQuantity?: number | null;
  createsDemandDocument: false;
  status: InventoryRecordStatus;
}>;

export type InventoryFoundationDocumentContract = Readonly<{
  key: string;
  documentKind: InventoryFoundationDocumentKind;
  documentType: DocumentType;
  label: string;
  sourceApps: readonly string[];
  requiredPermission: PermissionKey;
  documentNumberReadiness: true;
  documentStatusReadiness: true;
  sourceDocumentReferenceReadiness: true;
  warehouseContextReadiness: true;
  lifecycleStates: readonly [
    "draft",
    "submitted",
    "waiting-approval",
    "approved",
    "posted",
    "completed",
    "cancelled",
    "archived",
  ];
  approvalReadiness: true;
  auditReadiness: true;
  printReadiness: true;
  postingReadiness: true;
  ledgerPostingReadiness: true;
  usesDocumentEngine: true;
  usesEventBus: true;
  runtimeExecutionImplemented: false;
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsPosting: false;
  implementsReservationRuntime: false;
}>;

export type InventoryObjectRefContract = Readonly<{
  key: string;
  objectTypes: readonly InventoryObjectType[];
  labelReady: true;
  traceabilityReady: true;
  quantityRules: Readonly<{
    product_quantity: "product_id + quantity > 0";
    lot_quantity: "lot_id + quantity > 0";
    serial: "serial_id + quantity = 1";
    handling_unit: "handling_unit_id";
    child_handling_unit: "child_handling_unit_id";
  }>;
  downstreamConsumers: readonly [
    "ledger",
    "reservation",
    "picking",
    "packing",
    "shipping",
    "returns",
    "service",
    "warranty",
    "manufacturing",
  ];
}>;

export type InventoryDocumentLineContract = Readonly<{
  key: string;
  lineTable: "inventory_document_lines";
  objectRefContractKey: string;
  inventoryStatuses: readonly InventoryInventoryStatus[];
  supportsSourceDestinationLocations: true;
  supportsReasonCodeMetadata: true;
  supportsSnapshotMetadata: true;
  supportsValidationMetadata: true;
  ledgerPostingImplemented: false;
}>;

export type InventoryDocumentSnapshotContract = Readonly<{
  key: string;
  snapshotTable: "inventory_document_snapshots";
  immutable: true;
  preservesObjectIdentity: true;
  preservesLabels: true;
  preservesHuContents: true;
  preservesLocations: true;
  preservesQuantityUom: true;
  preservesActorAndTimestamp: true;
  preservesCorrelationId: true;
  snapshotRuntimeImplemented: false;
}>;

export type InventoryCurrentStateProjectionContract = Readonly<{
  key: string;
  projectionTable: "inventory_current_state_projections";
  projectionKinds: readonly InventoryProjectionKind[];
  identityTablesDoNotOwnCurrentState: true;
  projectionWriter: "inventory-projection-engine";
  projectionRuntimeImplemented: true;
  balanceCalculationImplemented: false;
  quantityOnIdentityTablesAllowed: false;
  derivedFromLedger: true;
  ledgerTable: "inventory_ledger_entries";
  serialProjectionFields: readonly [
    "current_handling_unit_id",
    "current_warehouse_id",
    "current_location_id",
    "current_custodian",
  ];
  handlingUnitProjectionFields: readonly [
    "warehouse_id",
    "location_id",
    "current_custodian",
  ];
}>;

export type InventoryDocumentArchitectureContract = Readonly<{
  key: string;
  documentTypeRegistryTable: "inventory_document_type_registry";
  documentKinds: readonly InventoryFoundationDocumentKind[];
  lineContractKey: string;
  snapshotContractKey: string;
  objectRefContractKey: string;
  projectionContractKey: string;
  inventoryStatuses: readonly InventoryInventoryStatus[];
  identityOwnsCurrentState: false;
  currentStateDerivedFromLedger: true;
  appIntegrations: readonly [
    "document-engine",
    "event-bus",
    "workflow",
    "approval",
    "audit",
    "search",
    "reporting",
    "print",
    "dashboard",
    "background-jobs",
    "import-export",
    "warehouse-execution",
    "cost-engine",
    "finance",
  ];
  runtimeExecutionImplemented: false;
  implementsStockMovements: false;
  implementsInventoryLedger: false;
  implementsPosting: false;
  implementsReservationRuntime: false;
  implementsWarehouseExecution: false;
  implementsCosting: false;
  implementsAccounting: false;
  ledgerIntegrationReady: true;
}>;

export type InventoryLedgerArchitectureContract = Readonly<{
  key: string;
  ledgerTable: "inventory_ledger_entries";
  appendOnly: true;
  immutable: true;
  eventSourced: true;
  documentDriven: true;
  auditable: true;
  objectTypes: readonly InventoryObjectType[];
  movementDirections: readonly ["IN", "OUT", "INTERNAL"];
  movementTypes: readonly [
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
  ];
  eventTypes: readonly ["created", "posted", "reversed"];
  businessModules: readonly [
    "inventory",
    "purchasing",
    "sales",
    "manufacturing",
    "service",
    "warranty",
    "rental",
    "fleet",
  ];
  documentRequired: true;
  systemAdjustmentAllowed: true;
  reversalViaParentEntry: true;
  updatesForbidden: true;
  deletesForbidden: true;
  postingEngineSetting: "app.inventory_posting_engine";
  postingPermission: "inventory.stock.post";
  viewPermission: "inventory.stock.view";
  balanceCalculationImplemented: false;
  availabilityCalculationImplemented: false;
  projectionRuntimeImplemented: true;
  postingRuntimeImplemented: false;
  directMutationApisAllowed: false;
  appIntegrations: readonly [
    "document-engine",
    "event-bus",
    "audit",
    "search",
    "reporting",
    "dashboard",
    "projection-engine",
    "reservation-engine",
    "warehouse-execution",
    "cost-engine",
    "finance",
  ];
}>;

export type InventoryLedgerPostingEngineContract = Readonly<{
  key: string;
  owner: "inventory-posting-engine";
  ledgerTable: "inventory_ledger_entries";
  writeSetting: "app.inventory_posting_engine";
  requiredPermission: "inventory.stock.post";
  appendOnly: true;
  postingRuntimeImplemented: false;
  reversalRuntimeImplemented: false;
  uiPostingAllowed: false;
  repositoryUpdateMethodsAllowed: false;
  repositoryDeleteMethodsAllowed: false;
}>;

export type InventoryLedgerReversalContract = Readonly<{
  key: string;
  parentEntryField: "parent_entry_id";
  reversalEventType: "reversed";
  negateQuantityDelta: true;
  preserveHistory: true;
  uniqueReversalPerParent: true;
}>;

export type InventoryLedgerProjectionEventsContract = Readonly<{
  key: string;
  events: readonly ["LedgerEntryCreated", "LedgerEntryReversed", "LedgerPostingCompleted"];
  projectionRuntimeImplemented: true;
  subscribers: readonly ["inventory-projection-engine"];
}>;

export type InventoryProjectionEngineContract = Readonly<{
  key: string;
  owner: "inventory-projection-engine";
  projectionTable: "inventory_current_state_projections";
  runtimeStateTable: "inventory_projection_runtime_state";
  appliedEntriesTable: "inventory_projection_applied_entries";
  ledgerTable: "inventory_ledger_entries";
  writeSetting: "app.inventory_projection_service";
  readPermission: "inventory.stock.view";
  projectionRuntimeImplemented: true;
  identityTableMutationAllowed: false;
  uiWritesAllowed: false;
  ledgerMutationAllowed: false;
  rebuildSupported: true;
  eventHandlers: readonly ["LedgerEntryCreated", "LedgerEntryReversed", "LedgerPostingCompleted"];
  readApis: readonly [
    "getCurrentStock",
    "getSerialCurrentState",
    "getHandlingUnitCurrentState",
    "getAvailabilitySnapshot",
    "getLedgerBackedCurrentState",
  ];
}>;

export type InventoryProjectionRebuildContract = Readonly<{
  key: string;
  rebuildFunction: "rebuildProjectionFromLedger";
  replayOrder: "posting_timestamp,id";
  clearBeforeRebuild: true;
  projectionVersionIncrement: true;
  rebuildStatuses: readonly ["idle", "rebuilding", "failed"];
  lastProcessedLedgerEntryField: "last_processed_ledger_entry_id";
}>;

export type InventoryProjectionIdempotencyContract = Readonly<{
  key: string;
  appliedEntriesTable: "inventory_projection_applied_entries";
  uniqueLedgerEntryConstraint: true;
  idempotencyKeyPattern: "inventory.projection.apply:{ledgerEntryId}";
  skipAlreadyApplied: true;
}>;

export type InventoryDocumentContract = Readonly<{
  key: string;
  documentType: DocumentType;
  documentKind: InventoryMovementDocumentKind;
  requiredPermission: PermissionKey;
  ownsStockQuantityEffects: true;
  usesDocumentEngine: true;
  usesEventBus: true;
  costEngineContractOnly: true;
  financePostingReadinessOnly: true;
  implementsManufacturing: false;
  implementsSales: false;
  implementsPurchasing: false;
  implementsValuation: false;
  implementsAccountingPosting: false;
}>;

export type InventoryCostIntegrationContract = Readonly<{
  key: string;
  sourceDocumentTypes: readonly string[];
  sourceEventNames: readonly string[];
  costObjectTypes: readonly ("product" | "variant" | "batch" | "inventory_item" | "warehouse")[];
  sendsQuantityFactsOnly: true;
  ownsCostFacts: false;
  ownsCostLayers: false;
  ownsCostSnapshots: false;
  calculatesValuation: false;
}>;

export function defineInventoryProduct<TDefinition extends InventoryProductDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryProductMasterPolicy<TDefinition extends InventoryProductMasterPolicyContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryProductVariant<TDefinition extends InventoryProductVariantDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryUom<TDefinition extends InventoryUomDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryWarehouse<TDefinition extends InventoryWarehouseDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLocation<TDefinition extends InventoryLocationDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLot<TDefinition extends InventoryLotDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLotArchitecture<TDefinition extends InventoryLotArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventorySerial<TDefinition extends InventorySerialNumberDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventorySerialPolicy<TDefinition extends InventorySerialEnginePolicyDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventorySerialSequenceReservation<TDefinition extends InventorySerialSequenceReservationDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventorySerialEngineArchitecture<TDefinition extends InventorySerialEngineArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryWarehouseLocationArchitecture<TDefinition extends InventoryWarehouseLocationArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryHandlingUnitArchitecture<TDefinition extends InventoryHandlingUnitArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryHandlingUnitType<TDefinition extends InventoryHandlingUnitTypeDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryHandlingUnit<TDefinition extends InventoryHandlingUnitDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryHandlingUnitContent<TDefinition extends InventoryHandlingUnitContentDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryFoundationDocumentContract<TDefinition extends InventoryFoundationDocumentContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryObjectRef<TDefinition extends InventoryObjectRef>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryDocumentLine<TDefinition extends InventoryDocumentLineDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryDocumentSnapshot<TDefinition extends InventoryDocumentSnapshotDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryCurrentStateProjection<TDefinition extends InventoryCurrentStateProjectionDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryDocumentArchitecture<TDefinition extends InventoryDocumentArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLedgerEntry<TDefinition extends InventoryLedgerEntryDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLedgerArchitecture<TDefinition extends InventoryLedgerArchitectureContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryProjectionEngine<TDefinition extends InventoryProjectionEngineContract>(definition: TDefinition): TDefinition {
  return definition;
}

export function createInventoryFoundationDocumentContract(
  documentKind: InventoryFoundationDocumentKind,
  label: string,
  sourceApps: readonly string[],
  requiredPermission: PermissionKey,
): InventoryFoundationDocumentContract {
  return defineInventoryFoundationDocumentContract({
    approvalReadiness: true,
    auditReadiness: true,
    documentKind,
    documentNumberReadiness: true,
    documentStatusReadiness: true,
    documentType: defineDocumentType(`inventory.${documentKind.replaceAll("_", "-")}`),
    implementsInventoryLedger: false,
    implementsPosting: false,
    implementsReservationRuntime: false,
    implementsStockMovements: false,
    key: `inventory.${documentKind}.foundation-document-contract`,
    label,
    ledgerPostingReadiness: true,
    lifecycleStates: ["draft", "submitted", "waiting-approval", "approved", "posted", "completed", "cancelled", "archived"],
    postingReadiness: true,
    printReadiness: true,
    requiredPermission,
    runtimeExecutionImplemented: false,
    sourceApps,
    sourceDocumentReferenceReadiness: true,
    usesDocumentEngine: true,
    usesEventBus: true,
    warehouseContextReadiness: true,
  });
}

export function createInventoryDocumentContract(
  documentKind: InventoryMovementDocumentKind,
  requiredPermission: PermissionKey,
  documentType = `inventory.${documentKind.replaceAll("_", "-")}`,
): InventoryDocumentContract {
  return {
    costEngineContractOnly: true,
    documentKind,
    documentType: defineDocumentType(documentType),
    financePostingReadinessOnly: true,
    implementsAccountingPosting: false,
    implementsManufacturing: false,
    implementsPurchasing: false,
    implementsSales: false,
    implementsValuation: false,
    key: `inventory.${documentKind}.document-contract`,
    ownsStockQuantityEffects: true,
    requiredPermission,
    usesDocumentEngine: true,
    usesEventBus: true,
  };
}

export function createInventoryCostIntegrationContract(
  input: Omit<InventoryCostIntegrationContract, "key" | "sendsQuantityFactsOnly" | "ownsCostFacts" | "ownsCostLayers" | "ownsCostSnapshots" | "calculatesValuation"> & Readonly<{ key?: string }>,
): InventoryCostIntegrationContract {
  return {
    ...input,
    calculatesValuation: false,
    key: input.key ?? "inventory.cost-engine.quantity-facts",
    ownsCostFacts: false,
    ownsCostLayers: false,
    ownsCostSnapshots: false,
    sendsQuantityFactsOnly: true,
  };
}

export const INVENTORY_QUANTITY_MODEL_CONTRACT: InventoryQuantityModelContract = {
  availableFormula: "on_hand - reserved - pending_approval - outgoing - damaged - quarantine",
  availableStoredManually: false,
  derivedBuckets: ["available"],
  key: "inventory.quantity-model",
  owner: "inventory-engine",
  storedBuckets: [
    "on_hand",
    "reserved",
    "pending_approval",
    "in_transit",
    "incoming",
    "outgoing",
    "damaged",
    "quarantine",
  ],
  supportsNegativeAvailableByPolicyOnly: true,
};

export const INVENTORY_RESERVATION_LIFECYCLE_CONTRACT: InventoryReservationLifecycleContract = {
  hardReservationStatuses: ["approved", "reserved", "picked"],
  inTransitStatuses: ["issued", "in_transit"],
  initialStatus: "draft",
  noReservationStatuses: ["draft"],
  releaseStatuses: ["rejected", "cancelled", "released", "expired"],
  softHoldStatuses: ["pending_approval"],
  statuses: [
    "draft",
    "pending_approval",
    "approved",
    "reserved",
    "picked",
    "issued",
    "in_transit",
    "received",
    "completed",
    "rejected",
    "cancelled",
    "released",
    "expired",
    "consumed",
  ],
  terminalStatuses: ["completed", "cancelled", "released", "expired", "consumed", "rejected"],
  transferFlow: ["draft", "pending_approval", "approved", "reserved", "issued", "in_transit", "received", "completed"],
};

export const INVENTORY_RESERVATION_TYPES = [
  "soft_hold",
  "hard_reservation",
  "transfer_reservation",
  "manufacturing_reservation",
  "sales_reservation",
  "service_reservation",
  "rental_reservation",
  "project_reservation",
  "custom",
] as const satisfies readonly InventoryReservationKind[];

export const INVENTORY_RESERVATION_ENGINE_CONTRACT: InventoryReservationEngineContract = {
  availabilitySource: "inventory_current_state_projections",
  concurrencyStrategy: {
    database: "postgres",
    frontendValidationTrusted: false,
    idempotencyRequired: true,
    lock: "transactional-row-lock-and-advisory-key",
    noOversellingUnlessPolicyAllowsNegativeAvailable: true,
  },
  identityTableReadsForbidden: true,
  implementsAccounting: false,
  implementsCosting: false,
  implementsWarehouseExecution: false,
  key: "inventory.reservation-engine",
  ledgerMutationAllowed: false,
  operations: [
    "reserve_quantity",
    "release_quantity",
    "consume_reservation",
    "expire_reservation",
    "reject_reservation",
    "recalculate_availability",
    "validate_reservation",
    "validate_concurrency",
    "write_reservation_audit",
    "publish_reservation_events",
  ],
  owner: "inventory-reservation-engine",
  readApis: ["getReservableAvailability", "getReservationSnapshot", "calculateShortage"],
  runtimeExecutionImplemented: true,
  stockMutationAllowed: false,
  writeSetting: "app.inventory_reservation_engine",
};

export const INVENTORY_RESERVATION_FOUNDATION_LIFECYCLE_CONTRACT: InventoryReservationFoundationLifecycleContract = {
  allocationStrategies: ["strict_serial", "strict_lot", "any_available", "fifo", "fefo", "location_priority", "manual"],
  demandSources: ["sales", "manufacturing", "service", "internal_transfer", "rental", "project", "manual_inventory", "fleet"],
  initialStatus: "draft",
  key: "inventory.reservation.foundation-lifecycle",
  statuses: ["draft", "requested", "partially_reserved", "reserved", "released", "expired", "cancelled", "failed"],
  terminalStatuses: ["released", "expired", "cancelled", "failed"],
};

export const INVENTORY_RESERVATION_AVAILABILITY_CONTRACT: InventoryReservationAvailabilityContract = {
  identityTablesForbidden: true,
  key: "inventory.reservation.availability",
  ledgerMutationAllowed: false,
  projectionTable: "inventory_current_state_projections",
  stockMutationAllowed: false,
};

export const INVENTORY_RESERVATION_EVENTS_CONTRACT: InventoryReservationEventsContract = {
  events: [
    "InventoryReservationRequested",
    "InventoryReservationCreated",
    "InventoryReservationPartiallyReserved",
    "InventoryReservationCompleted",
    "InventoryReservationReleased",
    "InventoryReservationExpired",
    "InventoryReservationFailed",
  ],
  handlersImplemented: false,
  key: "inventory.reservation.events",
};

export const INVENTORY_RESERVATION_EXPIRY_CONTRACT: InventoryReservationExpiryContract = {
  backgroundJobReadiness: true,
  expiryQueueTable: "inventory_reservation_expiry_queue",
  key: "inventory.reservation.expiry",
  schedulerImplemented: false,
};

export const INVENTORY_RESERVATION_FOUNDATION_EVENT_DEFINITIONS = INVENTORY_RESERVATION_EVENTS_CONTRACT.events.map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} reservation engine event for projection-backed inventory demand.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  }),
);

export const INVENTORY_RESERVATION_PLATFORM_INTEGRATION_CONTRACT: InventoryReservationPlatformIntegrationContract = {
  handlersImplemented: false,
  integrations: [
    "platform-events",
    "background-jobs",
    "audit",
    "notifications",
    "search",
    "reporting",
    "dashboard",
    "import-export",
    "workflow",
    "approvals",
  ],
  key: "inventory.reservation-platform-integrations",
  runtimeExecutionImplemented: false,
};

export const INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT = defineInventoryProductMasterPolicy({
  appIntegrations: ["app-registry", "search", "print", "reporting", "dashboard"],
  canonicalSource: "inventory_products",
  cycleCountClasses: ["A", "B", "C"],
  implementsCosting: false,
  implementsInventoryLedger: false,
  implementsManufacturing: false,
  implementsPurchasing: false,
  implementsSales: false,
  implementsWarehouseOperations: false,
  implementsWarrantyEngine: false,
  key: "inventory.product-master.policy",
  packagingLevels: ["loose_units", "inner_box", "carton", "pallet"],
  runtimeExecutionImplemented: false,
  searchFields: ["sku", "barcode", "name", "commercialName", "searchKeywords"],
  serialGenerationTimings: ["on_receipt", "on_production_completion", "on_packing", "manual"],
  serialSources: ["nexora_generated", "supplier", "manual", "imported"],
  trackingModes: ["none", "quantity_only", "lot", "serial", "lot_serial"],
  warrantyStartsFrom: ["invoice_date", "delivery_date", "manual_activation"],
});

export const INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT = defineInventoryWarehouseLocationArchitecture({
  appIntegrations: ["app-registry", "search", "reporting", "print", "dashboard", "import-export"],
  barcodeReady: true,
  hierarchy: ["warehouse", "zone", "aisle", "rack", "shelf", "bin"],
  implementsCosting: false,
  implementsHandlingUnits: false,
  implementsInventoryLedger: false,
  implementsManufacturing: false,
  implementsPickingPacking: false,
  implementsPurchasing: false,
  implementsSales: false,
  implementsStockMovements: false,
  implementsWarehouseExecution: false,
  key: "inventory.warehouse-location.architecture",
  locationTable: "inventory_locations",
  locationTypes: ["zone", "aisle", "rack", "shelf", "bin", "receiving", "shipping", "qc_hold", "returns", "scrap", "production_input", "production_output", "transit"],
  operationalLocationTypes: ["receiving", "shipping", "qc_hold", "returns", "scrap", "production_input", "production_output", "transit"],
  quantityFieldsAllowed: false,
  stockBalanceFieldsAllowed: false,
  warehouseTable: "inventory_warehouses",
  warehouseTypes: ["main", "finished_goods", "raw_materials", "spare_parts", "service", "returns", "scrap", "qc", "production_buffer", "transit"],
});

export const INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT = defineInventoryHandlingUnitArchitecture({
  appIntegrations: ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"],
  barcodeReady: true,
  childHuCurrentUniqueness: true,
  contentTable: "inventory_handling_unit_contents",
  contentTypes: ["product_quantity", "lot_quantity", "serial_reference", "child_handling_unit"],
  currentContentRule: "removed_at is null",
  handlingUnitTable: "inventory_handling_units",
  handlingUnitTypeTable: "inventory_handling_unit_types",
  historicalContentNeverDeleted: true,
  huStatuses: ["empty", "packed", "partial", "opened", "closed", "reserved", "picked", "shipped", "returned", "damaged", "scrapped", "archived"],
  implementsCosting: false,
  implementsInventoryLedger: false,
  implementsManufacturing: false,
  implementsPickingPacking: false,
  implementsPurchasing: false,
  implementsSales: false,
  implementsStockMovements: false,
  implementsWarehouseExecution: false,
  implementsWarranty: false,
  key: "inventory.handling-unit.architecture",
  ledgerPostingImplemented: false,
  lifecycleStates: ["draft", "active", "sealed", "opened", "closed", "split_ready", "merge_ready", "repack_ready", "traceable", "archived"],
  pickingPackingRuntimeImplemented: false,
  qrReady: true,
  quantityMovementImplemented: false,
  repackReady: true,
  runtimeExecutionImplemented: false,
  serialCurrentUniqueness: true,
  splitMergeReady: true,
  stockDeductionImplemented: false,
  traceabilityReady: true,
  warehouseExecutionRuntimeImplemented: false,
  lotIntegrationReady: true,
  lotContentCapabilities: ["lot_quantity", "serials_in_lot", "cartons_in_lot", "mixed_lots_where_allowed"],
  serialIntegrationReady: true,
  currentStateProjectionOnlyFields: ["warehouse_id", "location_id", "current_custodian"],
  identityOwnsCurrentState: false,
});

export const INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT = defineInventorySerialEngineArchitecture({
  appIntegrations: ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"],
  barcodeReady: true,
  currentStateProjectionOnlyFields: ["current_handling_unit_id", "current_warehouse_id", "current_location_id", "current_custodian"],
  gapsAllowedInSequences: true,
  generationMethods: ["policy_range", "manual_entry", "supplier_import", "bulk_import"],
  generationRuntimeImplemented: false,
  handlingUnitIntegrationReady: true,
  identityOwnsCurrentState: false,
  idempotencyProtectedGeneration: true,
  implementsInventoryLedger: false,
  implementsPickingPacking: false,
  implementsService: false,
  implementsStockMovements: false,
  implementsWarranty: false,
  key: "inventory.serial-engine.architecture",
  lifecycleStates: ["draft", "generated", "imported", "packed", "available", "reserved", "picked", "shipped", "sold", "returned", "service", "repaired", "scrapped", "revoked", "archived"],
  lotIntegrationReady: true,
  policyPatternTokens: ["{PREFIX}", "{COMPANY}", "{BRANCH}", "{PRODUCT}", "{LOT}", "{YEAR}", "{MONTH}", "{NUMBER}"],
  policyTable: "inventory_serial_policies",
  qrReady: true,
  quantityFieldsAllowed: false,
  reservationStatuses: ["pending", "reserved", "consumed", "expired", "cancelled"],
  runtimeExecutionImplemented: false,
  serialCurrentHandlingUnitUniqueness: true,
  serialCurrentLocationUniqueness: true,
  serialSources: ["nexora_generated", "supplier", "manual", "imported"],
  serialStatuses: ["active", "blocked", "damaged", "missing", "duplicate_suspected", "counterfeit_suspected", "archived"],
  serialTable: "inventory_serial_numbers",
  sequenceReservationTable: "inventory_serial_sequence_reservations",
  serviceRuntimeImplemented: false,
  stockBalanceFieldsAllowed: false,
  uniquenessScope: "company",
  verificationSigningRuntimeImplemented: false,
  verificationStatuses: ["not_required", "pending", "valid", "invalid", "suspected_duplicate", "revoked"],
  warrantyRuntimeImplemented: false,
});

export const INVENTORY_LOT_ARCHITECTURE_CONTRACT = defineInventoryLotArchitecture({
  appIntegrations: ["app-registry", "search", "reporting", "print", "dashboard", "import-export", "traceability", "warehouse-execution"],
  availabilityRuntimeImplemented: false,
  barcodeReady: true,
  expiryJobRuntimeImplemented: false,
  handlingUnitContentCapabilities: ["lot_quantity", "serials_in_lot", "cartons_in_lot", "mixed_lots_where_allowed"],
  handlingUnitIntegrationReady: true,
  serialIntegrationReady: true,
  implementsCosting: false,
  implementsInventoryLedger: false,
  implementsManufacturing: false,
  implementsPurchasing: false,
  implementsReservations: false,
  implementsSales: false,
  implementsStockMovements: false,
  implementsWarranty: false,
  key: "inventory.lot.architecture",
  lifecycleStates: ["draft", "active", "qc_pending", "qc_hold", "released", "blocked", "consumed", "expired", "archived"],
  lotTable: "inventory_lots",
  printReady: true,
  qcStatuses: ["not_required", "pending", "passed", "failed", "hold", "released"],
  qcWorkflowRuntimeImplemented: false,
  qrReady: true,
  quantityFieldsAllowed: false,
  runtimeExecutionImplemented: false,
  serialGenerationRuntimeImplemented: false,
  sourceTypes: ["supplier", "manufacturing", "repack", "return", "adjustment", "internal", "import"],
  stockBalanceFieldsAllowed: false,
  traceabilityChannels: ["supplier_receipt", "production_order", "qc", "handling_units", "serials", "shipments", "customers", "service_cases", "recalls"],
});

export const INVENTORY_OBJECT_REF_CONTRACT: InventoryObjectRefContract = {
  downstreamConsumers: ["ledger", "reservation", "picking", "packing", "shipping", "returns", "service", "warranty", "manufacturing"],
  key: "inventory.object-ref",
  labelReady: true,
  objectTypes: ["product_quantity", "lot_quantity", "serial", "handling_unit", "child_handling_unit"],
  quantityRules: {
    child_handling_unit: "child_handling_unit_id",
    handling_unit: "handling_unit_id",
    lot_quantity: "lot_id + quantity > 0",
    product_quantity: "product_id + quantity > 0",
    serial: "serial_id + quantity = 1",
  },
  traceabilityReady: true,
};

export const INVENTORY_DOCUMENT_LINE_CONTRACT: InventoryDocumentLineContract = {
  inventoryStatuses: ["available", "reserved", "picked", "packed", "shipped", "sold", "returned", "qc_hold", "damaged", "scrap", "service", "blocked", "in_transit"],
  key: "inventory.document-line",
  ledgerPostingImplemented: false,
  lineTable: "inventory_document_lines",
  objectRefContractKey: INVENTORY_OBJECT_REF_CONTRACT.key,
  supportsReasonCodeMetadata: true,
  supportsSnapshotMetadata: true,
  supportsSourceDestinationLocations: true,
  supportsValidationMetadata: true,
};

export const INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT: InventoryDocumentSnapshotContract = {
  immutable: true,
  key: "inventory.document-snapshot",
  preservesActorAndTimestamp: true,
  preservesCorrelationId: true,
  preservesHuContents: true,
  preservesLabels: true,
  preservesLocations: true,
  preservesObjectIdentity: true,
  preservesQuantityUom: true,
  snapshotRuntimeImplemented: false,
  snapshotTable: "inventory_document_snapshots",
};

export const INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT: InventoryCurrentStateProjectionContract = {
  balanceCalculationImplemented: false,
  derivedFromLedger: true,
  handlingUnitProjectionFields: ["warehouse_id", "location_id", "current_custodian"],
  identityTablesDoNotOwnCurrentState: true,
  key: "inventory.current-state.projection",
  ledgerTable: "inventory_ledger_entries",
  projectionKinds: ["product_quantity", "lot_quantity", "serial_state", "handling_unit_state", "availability", "reserved_quantity", "picked_quantity", "shipped_quantity"],
  projectionRuntimeImplemented: true,
  projectionTable: "inventory_current_state_projections",
  projectionWriter: "inventory-projection-engine",
  quantityOnIdentityTablesAllowed: false,
  serialProjectionFields: ["current_handling_unit_id", "current_warehouse_id", "current_location_id", "current_custodian"],
};

export const INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS = {
  cycleCountDocument: createInventoryFoundationDocumentContract("cycle_count_document", "Cycle Count Document", ["inventory"], INVENTORY_PERMISSIONS.cycleCountManage),
  goodsIssue: createInventoryFoundationDocumentContract("goods_issue", "Goods Issue", ["inventory", "sales"], INVENTORY_PERMISSIONS.movementsCreate),
  goodsReceipt: createInventoryFoundationDocumentContract("goods_receipt", "Goods Receipt", ["inventory", "purchasing"], INVENTORY_PERMISSIONS.movementsCreate),
  inventoryAdjustment: createInventoryFoundationDocumentContract("inventory_adjustment", "Inventory Adjustment", ["inventory"], INVENTORY_PERMISSIONS.adjustmentsCreate),
  inventoryTransfer: createInventoryFoundationDocumentContract("inventory_transfer", "Inventory Transfer", ["inventory"], INVENTORY_PERMISSIONS.transfersRequest),
  materialIssue: createInventoryFoundationDocumentContract("material_issue", "Material Issue", ["inventory", "manufacturing"], INVENTORY_PERMISSIONS.movementsCreate),
  materialRequest: createInventoryFoundationDocumentContract("material_request", "Material Request", ["inventory", "manufacturing"], INVENTORY_PERMISSIONS.reservationsCreate),
  productionReceipt: createInventoryFoundationDocumentContract("production_receipt", "Production Receipt", ["inventory", "manufacturing"], INVENTORY_PERMISSIONS.movementsCreate),
  repackDocument: createInventoryFoundationDocumentContract("repack_document", "Repack Document", ["inventory"], INVENTORY_PERMISSIONS.handlingUnitsManage),
  returnReceipt: createInventoryFoundationDocumentContract("return_receipt", "Return Receipt", ["inventory", "sales"], INVENTORY_PERMISSIONS.movementsCreate),
  scrapDocument: createInventoryFoundationDocumentContract("scrap_document", "Scrap Document", ["inventory"], INVENTORY_PERMISSIONS.adjustmentsCreate),
} as const;

export const INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT = defineInventoryDocumentArchitecture({
  appIntegrations: ["document-engine", "event-bus", "workflow", "approval", "audit", "search", "reporting", "print", "dashboard", "background-jobs", "import-export", "warehouse-execution", "cost-engine", "finance"],
  currentStateDerivedFromLedger: true,
  documentKinds: ["goods_receipt", "goods_issue", "inventory_transfer", "inventory_adjustment", "material_request", "material_issue", "production_receipt", "return_receipt", "scrap_document", "repack_document", "cycle_count_document"],
  documentTypeRegistryTable: "inventory_document_type_registry",
  identityOwnsCurrentState: false,
  implementsAccounting: false,
  implementsCosting: false,
  implementsInventoryLedger: false,
  implementsPosting: false,
  implementsReservationRuntime: false,
  implementsStockMovements: false,
  implementsWarehouseExecution: false,
  inventoryStatuses: ["available", "reserved", "picked", "packed", "shipped", "sold", "returned", "qc_hold", "damaged", "scrap", "service", "blocked", "in_transit"],
  key: "inventory.document.architecture",
  ledgerIntegrationReady: true,
  lineContractKey: INVENTORY_DOCUMENT_LINE_CONTRACT.key,
  objectRefContractKey: INVENTORY_OBJECT_REF_CONTRACT.key,
  projectionContractKey: INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.key,
  runtimeExecutionImplemented: false,
  snapshotContractKey: INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT.key,
});

export const INVENTORY_LEDGER_ARCHITECTURE_CONTRACT = defineInventoryLedgerArchitecture({
  appendOnly: true,
  appIntegrations: ["document-engine", "event-bus", "audit", "search", "reporting", "dashboard", "projection-engine", "reservation-engine", "warehouse-execution", "cost-engine", "finance"],
  auditable: true,
  availabilityCalculationImplemented: false,
  balanceCalculationImplemented: false,
  businessModules: ["inventory", "purchasing", "sales", "manufacturing", "service", "warranty", "rental", "fleet"],
  deletesForbidden: true,
  directMutationApisAllowed: false,
  documentDriven: true,
  documentRequired: true,
  eventSourced: true,
  eventTypes: ["created", "posted", "reversed"],
  immutable: true,
  key: "inventory.ledger.architecture",
  ledgerTable: "inventory_ledger_entries",
  movementDirections: ["IN", "OUT", "INTERNAL"],
  movementTypes: ["goods_receipt", "goods_issue", "transfer", "adjustment", "cycle_count", "production_receipt", "material_issue", "return", "scrap", "repack"],
  objectTypes: ["product_quantity", "lot_quantity", "serial", "handling_unit", "child_handling_unit"],
  postingEngineSetting: "app.inventory_posting_engine",
  postingPermission: "inventory.stock.post",
  postingRuntimeImplemented: false,
  projectionRuntimeImplemented: true,
  reversalViaParentEntry: true,
  systemAdjustmentAllowed: true,
  updatesForbidden: true,
  viewPermission: "inventory.stock.view",
});

export const INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT: InventoryLedgerPostingEngineContract = {
  appendOnly: true,
  key: "inventory.ledger.posting-engine",
  ledgerTable: "inventory_ledger_entries",
  owner: "inventory-posting-engine",
  postingRuntimeImplemented: false,
  repositoryDeleteMethodsAllowed: false,
  repositoryUpdateMethodsAllowed: false,
  requiredPermission: "inventory.stock.post",
  reversalRuntimeImplemented: false,
  uiPostingAllowed: false,
  writeSetting: "app.inventory_posting_engine",
};

export const INVENTORY_LEDGER_REVERSAL_CONTRACT: InventoryLedgerReversalContract = {
  key: "inventory.ledger.reversal",
  negateQuantityDelta: true,
  parentEntryField: "parent_entry_id",
  preserveHistory: true,
  reversalEventType: "reversed",
  uniqueReversalPerParent: true,
};

export const INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT: InventoryLedgerProjectionEventsContract = {
  events: ["LedgerEntryCreated", "LedgerEntryReversed", "LedgerPostingCompleted"],
  key: "inventory.ledger.projection-events",
  projectionRuntimeImplemented: true,
  subscribers: ["inventory-projection-engine"],
};

export const INVENTORY_PROJECTION_ENGINE_CONTRACT = defineInventoryProjectionEngine({
  appliedEntriesTable: "inventory_projection_applied_entries",
  eventHandlers: ["LedgerEntryCreated", "LedgerEntryReversed", "LedgerPostingCompleted"],
  identityTableMutationAllowed: false,
  key: "inventory.projection-engine",
  ledgerMutationAllowed: false,
  ledgerTable: "inventory_ledger_entries",
  owner: "inventory-projection-engine",
  projectionRuntimeImplemented: true,
  projectionTable: "inventory_current_state_projections",
  readApis: ["getCurrentStock", "getSerialCurrentState", "getHandlingUnitCurrentState", "getAvailabilitySnapshot", "getLedgerBackedCurrentState"],
  readPermission: "inventory.stock.view",
  rebuildSupported: true,
  runtimeStateTable: "inventory_projection_runtime_state",
  uiWritesAllowed: false,
  writeSetting: "app.inventory_projection_service",
});

export const INVENTORY_PROJECTION_REBUILD_CONTRACT: InventoryProjectionRebuildContract = {
  clearBeforeRebuild: true,
  key: "inventory.projection.rebuild",
  lastProcessedLedgerEntryField: "last_processed_ledger_entry_id",
  projectionVersionIncrement: true,
  rebuildFunction: "rebuildProjectionFromLedger",
  rebuildStatuses: ["idle", "rebuilding", "failed"],
  replayOrder: "posting_timestamp,id",
};

export const INVENTORY_PROJECTION_IDEMPOTENCY_CONTRACT: InventoryProjectionIdempotencyContract = {
  appliedEntriesTable: "inventory_projection_applied_entries",
  idempotencyKeyPattern: "inventory.projection.apply:{ledgerEntryId}",
  key: "inventory.projection.idempotency",
  skipAlreadyApplied: true,
  uniqueLedgerEntryConstraint: true,
};

export const INVENTORY_LEDGER_PROJECTION_EVENT_DEFINITIONS = INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT.events.map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} projection event for the immutable inventory ledger consumed by the inventory projection engine.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  }),
);

export const INVENTORY_DOCUMENT_CONTRACTS = {
  adjustment: createInventoryDocumentContract("adjustment", INVENTORY_PERMISSIONS.adjustmentsCreate),
  movement: createInventoryDocumentContract("movement", INVENTORY_PERMISSIONS.movementsCreate),
  openingBalance: createInventoryDocumentContract("opening_balance", INVENTORY_PERMISSIONS.openingBalancesImport),
  transfer: createInventoryDocumentContract("transfer", INVENTORY_PERMISSIONS.transfersRequest),
} as const;

export const INVENTORY_DOCUMENT_TYPE_DEFINITIONS = [
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for inventory stock movements; posting and valuation are provided by later services.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
    label: "Inventory Stock Movement",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for stock transfer requests and completion readiness.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
    label: "Inventory Stock Transfer",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.transfersRequest, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.transfersComplete, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.transfersRequest, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for stock adjustments; no accounting posting is implemented.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
    label: "Inventory Stock Adjustment",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
] as const;

export const INVENTORY_FOUNDATION_DOCUMENT_TYPE_DEFINITIONS = Object.values(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS).map((contract) => defineDocumentTypeDefinition({
  behaviors: [
    defineDocumentBehavior("numbering", true, { required: true }),
    defineDocumentBehavior("workflow", true),
    defineDocumentBehavior("audit", true, { required: true }),
    defineDocumentBehavior("timeline", true),
    defineDocumentBehavior("printing", true),
    defineDocumentBehavior("reporting", true),
  ],
  description: `Foundation contract for ${contract.label}; no ledger posting or runtime execution.`,
  documentType: contract.documentType,
  label: contract.label,
  lifecycle: defineDocumentLifecycle({
    documentType: contract.documentType,
    initialState: "draft",
    terminalStates: ["completed", "cancelled", "archived"],
    transitions: [
      { command: "submit", from: "draft", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "submitted" },
      { command: "approve", from: "submitted", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "approved" },
      { command: "post", from: "approved", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "posted" },
      { command: "complete", from: "posted", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "completed" },
      { command: "cancel", from: "draft", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "cancelled" },
      { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
    ],
  }),
  moduleKey: "inventory",
}));

export const INVENTORY_SEARCH_PROVIDER_CONTRACT = defineSearchProvider({
  appKey: "inventory",
  entityTypes: [
    "inventory_product",
    "inventory_product_variant",
    "inventory_product_category",
    "inventory_uom",
    "inventory_warehouse",
    "inventory_location",
    "inventory_lot",
    "inventory_serial_number",
    "inventory_document",
    "inventory_ledger_entry",
    "inventory_handling_unit",
    "inventory_handling_unit_type",
    "inventory_reservation",
    "inventory_availability",
  ],
  key: "inventory.foundation.search",
  moduleKey: "inventory",
  requiredPermissions: [INVENTORY_PERMISSIONS.searchView],
  searchableEntities: [
    {
      appKey: "inventory",
      displayName: "Inventory products",
      entityType: "inventory_product",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["sku", "barcode", "name", "commercialName", "searchKeywords"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["sku", "barcode", "name", "commercialName", "searchKeywords"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory lots",
      entityType: "inventory_lot",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.lotsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["lotNumber", "barcode", "productKey", "sourceType", "qcStatus", "lifecycleState", "supplierLotNumber"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["lotNumber", "barcode", "productKey", "sourceType", "qcStatus", "lifecycleState", "supplierLotNumber"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory serial numbers",
      entityType: "inventory_serial_number",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.serialsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["serialNumber", "barcode", "productKey", "lotKey", "serialSource", "lifecycleState", "serialStatus", "verificationStatus"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["serialNumber", "barcode", "productKey", "lotKey", "serialSource", "lifecycleState", "serialStatus", "verificationStatus"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory documents",
      entityType: "inventory_document",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.movementsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["documentKind", "documentNumber", "documentStatus", "lifecycleState", "sourceApp", "warehouseKey"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["documentKind", "documentNumber", "documentStatus", "lifecycleState", "sourceApp", "warehouseKey"],
      rankingStrategy: "recent-first",
      resultType: "document",
    },
    {
      appKey: "inventory",
      displayName: "Inventory ledger entries",
      entityType: "inventory_ledger_entry",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.stockView],
        sensitivity: "restricted",
      },
      indexPolicy: {
        enabled: true,
        fields: ["movementType", "movementDirection", "documentType", "businessModule", "correlationId", "inventoryObjectType", "inventoryStatus"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["movementType", "movementDirection", "documentType", "businessModule", "correlationId", "inventoryObjectType", "inventoryStatus"],
      rankingStrategy: "recent-first",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory locations and lots",
      entityType: "inventory_location",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.locationsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["warehouseKey", "locationKey", "name", "barcode", "locationKind"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["warehouseKey", "locationKey", "name", "barcode", "locationKind"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Handling units",
      entityType: "inventory_handling_unit",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.handlingUnitsView],
        sensitivity: "sensitive",
      },
      indexPolicy: {
        enabled: true,
        fields: ["huNumber", "barcode", "typeKey", "huStatus", "lifecycleState", "warehouseKey", "locationKey"],
        languageReadiness: ["en", "ar"],
        refresh: "event-driven",
      },
      quickSearchFields: ["huNumber", "barcode", "typeKey", "huStatus", "lifecycleState", "locationKey"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory reservations and availability",
      entityType: "inventory_reservation",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.reservationsView],
        sensitivity: "restricted",
      },
      quickSearchFields: ["reservationNumber", "documentReference", "productId", "warehouseId", "status"],
      rankingStrategy: "recent-first",
      resultType: "document",
    },
  ],
  source: "app",
  supportedExperiences: ["erp"],
});

export const INVENTORY_REPORT_DATASET_CONTRACT = defineReportDataset({
  appKey: "inventory",
  defaultExecutionMode: "async",
  fields: [
    { isDimension: true, key: "definitionType", label: "Definition Type", type: "text" },
    { isDimension: true, key: "companyId", label: "Company", type: "text" },
    { isDimension: true, key: "branchId", label: "Branch", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { isDimension: true, key: "warehouseType", label: "Warehouse Type", type: "text" },
    { isDimension: true, key: "locationType", label: "Location Type", type: "text" },
    { key: "barcode", label: "Barcode", type: "text" },
    { isDimension: true, key: "pickable", label: "Pickable", type: "boolean" },
    { isDimension: true, key: "receivable", label: "Receivable", type: "boolean" },
    { isDimension: true, key: "shippable", label: "Shippable", type: "boolean" },
    { isDimension: true, key: "qcRequired", label: "QC Required", type: "boolean" },
    { isDimension: true, key: "trackingMode", label: "Tracking Policy", type: "text" },
    { isDimension: true, key: "packagingPolicy", label: "Packaging Policy", type: "text" },
    { isDimension: true, key: "cycleCountClass", label: "Cycle Count Class", type: "text" },
    { isDimension: true, key: "warrantyEligible", label: "Warranty Eligible", type: "boolean" },
    { isDimension: true, key: "huStatus", label: "HU Status", type: "text" },
    { isDimension: true, key: "lifecycleState", label: "Lifecycle State", type: "text" },
    { key: "huNumber", label: "HU Number", type: "text" },
    { isDimension: true, key: "contentType", label: "Content Type", type: "text" },
    { isDimension: true, key: "traceabilityReady", label: "Traceability Ready", type: "boolean" },
    { isDimension: true, key: "lotSourceType", label: "Lot Source Type", type: "text" },
    { isDimension: true, key: "lotQcStatus", label: "Lot QC Status", type: "text" },
    { isDimension: true, key: "lotLifecycleState", label: "Lot Lifecycle State", type: "text" },
    { key: "lotNumber", label: "Lot Number", type: "text" },
    { isDimension: true, key: "serialSource", label: "Serial Source", type: "text" },
    { isDimension: true, key: "serialLifecycleState", label: "Serial Lifecycle State", type: "text" },
    { isDimension: true, key: "serialStatus", label: "Serial Status", type: "text" },
    { isDimension: true, key: "verificationStatus", label: "Verification Status", type: "text" },
    { key: "serialNumber", label: "Serial Number", type: "text" },
    { isDimension: true, key: "warrantyReady", label: "Warranty Ready", type: "boolean" },
    { isDimension: true, key: "serviceReady", label: "Service Ready", type: "boolean" },
    { isDimension: true, key: "documentKind", label: "Document Kind", type: "text" },
    { isDimension: true, key: "documentLifecycleState", label: "Document Lifecycle State", type: "text" },
    { isDimension: true, key: "inventoryStatus", label: "Inventory Status", type: "text" },
    { isDimension: true, key: "projectionKind", label: "Projection Kind", type: "text" },
    { isDimension: true, key: "movementType", label: "Movement Type", type: "text" },
    { isDimension: true, key: "movementDirection", label: "Movement Direction", type: "text" },
    { isDimension: true, key: "ledgerEventType", label: "Ledger Event Type", type: "text" },
    { isDimension: true, key: "businessModule", label: "Business Module", type: "text" },
    { isDimension: true, key: "status", label: "Status", type: "text" },
  ],
  key: "inventory.foundation.definitions",
  label: "Inventory Foundation Definitions",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
});

export const INVENTORY_REPORT_READINESS_CONTRACT = defineReport({
  appKey: "inventory",
  category: "operational",
  dataSource: {
    key: "inventory.foundation.search-source",
    providerSource: "business-app",
    sourceKey: INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
    supportsAsync: true,
    supportsSync: false,
    type: "search-provider",
  },
  datasetKey: INVENTORY_REPORT_DATASET_CONTRACT.key,
  key: "inventory.foundation.readiness",
  metadata: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    requiredDataScopes: ["tenant", "company", "branch"],
    sensitivity: "sensitive",
    tenantAware: true,
  },
  mode: "async",
  name: "Inventory Foundation Readiness",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedFormats: ["table", "json", "csv"],
});

export const INVENTORY_PRINT_READINESS_CONTRACT = definePrintTemplate({
  appKey: "inventory",
  defaultLocale: "en",
  key: "inventory.foundation.readiness-print",
  metadata: {
    brandAware: true,
    companyScoped: true,
    localeAware: true,
    tenantScoped: true,
  },
  name: "Inventory Foundation Readiness Print Contract",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  security: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    requiredPermissions: [INVENTORY_PERMISSIONS.reportsView],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantAware: true,
  },
  supportedFormats: ["preview", "json"],
  supportedLocales: ["en", "ar"],
  type: "report",
});

export const INVENTORY_DASHBOARD_WIDGET_CONTRACT = defineDashboardWidget({
  appKey: "inventory",
  defaultSize: "wide",
  key: "inventory.foundation.readiness-widget",
  label: "Inventory Foundation Readiness",
  reportIntegration: {
    reportKey: INVENTORY_REPORT_READINESS_CONTRACT.key,
    requiresReportPermission: true,
    supportedFormats: ["table", "json"],
  },
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  type: "report-widget",
});

export const INVENTORY_DASHBOARD_TEMPLATE_CONTRACT = defineDashboardTemplate({
  appKey: "inventory",
  defaultLayout: {
    pages: [{
      key: "foundation",
      label: "Foundation",
      order: 1,
      sections: [{
        key: "readiness",
        label: "Readiness",
        order: 1,
        widgetKeys: [INVENTORY_DASHBOARD_WIDGET_CONTRACT.key],
      }],
    }],
    positions: [{
      breakpoint: "desktop",
      height: 4,
      widgetKey: INVENTORY_DASHBOARD_WIDGET_CONTRACT.key,
      width: 12,
      x: 0,
      y: 0,
    }],
    responsiveGrid: {
      columns: { desktop: 12, mobile: 4, tablet: 8 },
      gap: 16,
      rowHeight: 80,
    },
  },
  key: "inventory.foundation.dashboard-template",
  kind: "inventory",
  label: "Inventory Foundation Dashboard Template",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  templateOnly: true,
  widgetKeys: [INVENTORY_DASHBOARD_WIDGET_CONTRACT.key],
});

const inventoryImportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: false,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [INVENTORY_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "sensitive",
  tenantAware: true,
} as const;

export const INVENTORY_PRODUCT_IMPORT_CONTRACT = defineImport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "productKey", label: "Product Key", required: true },
    { dataType: "text", key: "sku", label: "SKU", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "baseUomKey", label: "Base UOM", required: true },
  ],
  key: "inventory.products.import",
  label: "Inventory Product Import",
  mappings: [
    { key: "product-key", sourceColumn: "Product Key", targetField: "productKey" },
    { key: "sku", sourceColumn: "SKU", targetField: "sku" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "base-uom", sourceColumn: "Base UOM", targetField: "baseUomKey" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { createsOpeningBalances: false, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "productKey", key: "product-key-required", message: "Product key is required.", severity: "error", type: "required" },
    { fieldKey: "sku", key: "sku-required", message: "SKU is required.", severity: "error", type: "required" },
    { key: "uom-lookup", lookupKey: "inventory_uoms", message: "Base UOM must exist.", severity: "error", type: "lookup" },
  ],
});

export const INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT = defineImport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "productKey", label: "Product Key", required: true },
    { dataType: "text", key: "warehouseKey", label: "Warehouse", required: true },
    { dataType: "text", key: "locationKey", label: "Location", required: true },
    { dataType: "number", key: "quantityOnHand", label: "Opening Quantity", required: true },
  ],
  key: "inventory.opening-balances.import",
  label: "Inventory Opening Balance Import",
  mappings: [
    { key: "product-key", sourceColumn: "Product Key", targetField: "productKey" },
    { key: "warehouse-key", sourceColumn: "Warehouse", targetField: "warehouseKey" },
    { key: "location-key", sourceColumn: "Location", targetField: "locationKey" },
    { key: "quantity", sourceColumn: "Opening Quantity", targetField: "quantityOnHand" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { documentContract: INVENTORY_DOCUMENT_CONTRACTS.openingBalance.documentType, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.openingBalancesImport,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "quantityOnHand", key: "quantity-required", message: "Opening quantity is required.", severity: "error", type: "required" },
    { key: "warehouse-lookup", lookupKey: "inventory_warehouses", message: "Warehouse must exist.", severity: "error", type: "lookup" },
    { key: "location-lookup", lookupKey: "inventory_locations", message: "Location must exist.", severity: "error", type: "lookup" },
  ],
});

export const INVENTORY_EXPORT_CONTRACT = defineExport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name" },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "inventory.foundation.export",
  label: "Inventory Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "inventory-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const INVENTORY_COST_DEFINITION_CONTRACT = defineCostDefinition({
  allocationRules: [],
  appKey: "inventory",
  categories: [
    { active: true, key: "inventory-material", label: "Inventory Material", type: "direct_material" },
    { active: true, key: "inventory-logistics", label: "Inventory Logistics", type: "logistics" },
  ],
  centers: [
    { active: true, key: "inventory-company", label: "Inventory Company", type: "company" },
    { active: true, key: "inventory-branch", label: "Inventory Branch", type: "branch" },
    { active: true, key: "inventory-warehouse", label: "Inventory Warehouse", type: "warehouse" },
  ],
  costTypes: ["direct_material", "logistics", "landed_cost", "custom"],
  drivers: [
    { key: "inventory-quantity", label: "Inventory Quantity", required: true, unit: "quantity" },
    { key: "inventory-weight", label: "Inventory Weight", required: false, unit: "weight" },
    { key: "inventory-volume", label: "Inventory Volume", required: false, unit: "volume" },
  ],
  key: "inventory.foundation.cost-contracts",
  label: "Inventory Cost Engine Contracts",
  metadata: {
    calculatesValuation: false,
    foundationOnly: true,
    ownsCostFacts: false,
    ownsStockQuantities: true,
  },
  objects: [
    { key: "inventory-product", label: "Inventory Product", type: "product" },
    { key: "inventory-variant", label: "Inventory Variant", type: "variant" },
    { key: "inventory-batch", label: "Inventory Lot or Batch", type: "batch" },
    { key: "inventory-item", label: "Inventory Item", type: "inventory_item" },
    { key: "inventory-warehouse", label: "Inventory Warehouse", type: "warehouse" },
  ],
  providerSource: "business-app",
  rates: [],
  security: {
    approvalRequired: false,
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    exportRestrictions: ["approval-required"],
    requiredDataScopes: ["tenant", "company", "branch"],
    requiredPermissions: [INVENTORY_PERMISSIONS.costIntegrationView],
    sensitiveFinancialData: true,
    tenantAware: true,
  },
});

export const INVENTORY_COST_INTEGRATION_CONTRACTS = {
  dashboard: createCostDashboardIntegrationContract(INVENTORY_DASHBOARD_TEMPLATE_CONTRACT.key, INVENTORY_COST_DEFINITION_CONTRACT.key, "inventory.quantity"),
  definitionChangedEvent: createCostEventIntegrationContract("InventoryStockMovementCreated", "definition-change", INVENTORY_COST_DEFINITION_CONTRACT.key),
  export: createCostExportIntegrationContract(INVENTORY_EXPORT_CONTRACT.key, ["csv", "excel", "json"]),
  quantityFacts: createInventoryCostIntegrationContract({
    costObjectTypes: ["product", "variant", "batch", "inventory_item", "warehouse"],
    sourceDocumentTypes: Object.values(INVENTORY_DOCUMENT_CONTRACTS).map((contract) => contract.documentType),
    sourceEventNames: ["InventoryStockMovementCreated", "InventoryOpeningBalanceImported"],
  }),
  report: createCostReportIntegrationContract(INVENTORY_REPORT_READINESS_CONTRACT.key, INVENTORY_COST_DEFINITION_CONTRACT.key),
  search: createCostSearchIntegrationContract(INVENTORY_SEARCH_PROVIDER_CONTRACT.key, ["record", "document"]),
} as const;

export const INVENTORY_FINANCE_INTEGRATION_CONTRACTS = {
  adjustmentPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product", "cost_center"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
  }),
  movementPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
  }),
  openingBalancePostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.openingBalance.documentType,
  }),
  transferPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
  }),
} as const;

export const INVENTORY_EVENT_DEFINITIONS = [
  "InventoryProductCreated",
  "InventoryStockMovementCreated",
  "InventoryStockTransferRequested",
  "InventoryStockTransferCompleted",
  "InventoryStockAdjustmentCreated",
  "InventoryOpeningBalanceImported",
  "InventoryLotCreated",
  "InventorySerialNumberCreated",
  "InventoryReorderRuleTriggered",
  "InventoryReservationRequested",
  "InventoryReservationCreated",
  "InventoryReservationApproved",
  "InventoryReservationReleased",
  "InventoryReservationConsumed",
  "InventoryReservationExpired",
  "InventoryReservationCancelled",
  "InventoryAvailabilityChanged",
  "InventoryTransferIssued",
  "InventoryTransferReceived",
].map((name) =>
  definePlatformEventDefinition({
    category: "document",
    description: `${name} event contract prepared for the Inventory Foundation. No runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const INVENTORY_AUDIT_ACTIONS = {
  definitionChanged: defineAuditAction("inventory.definition.changed"),
  openingBalanceImported: defineAuditAction("inventory.opening-balance.imported"),
  reservationApproved: defineAuditAction("inventory.reservation.approved"),
  reservationCancelled: defineAuditAction("inventory.reservation.cancelled"),
  reservationConsumed: defineAuditAction("inventory.reservation.consumed"),
  reservationCreated: defineAuditAction("inventory.reservation.created"),
  reservationReleased: defineAuditAction("inventory.reservation.released"),
  stockMovementCreated: defineAuditAction("inventory.stock-movement.created"),
} as const;

export const INVENTORY_JOB_READINESS_CONTRACTS = [
  createJobReadinessContract("search-indexing", "inventory.foundation.search-index"),
  createJobReadinessContract("report-generation", "inventory.foundation.report"),
  createJobReadinessContract("print-generation", "inventory.foundation.print"),
  createCostJobReadinessContract("snapshot", INVENTORY_COST_DEFINITION_CONTRACT.key),
  createCostJobReadinessContract("recalculation", INVENTORY_COST_DEFINITION_CONTRACT.key),
  createJobReadinessContract("search-indexing", "inventory.reservation.search-index"),
  createJobReadinessContract("report-generation", "inventory.reservation.report"),
  createJobReadinessContract("notification-delivery", "inventory.reservation.notification"),
  createImportJobReadinessContract(INVENTORY_PRODUCT_IMPORT_CONTRACT),
  createImportJobReadinessContract(INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT),
  createExportJobReadinessContract(INVENTORY_EXPORT_CONTRACT),
];

export const INVENTORY_IMPORT_EXPORT_INTEGRATION_CONTRACTS = {
  exportDashboard: createExportDashboardIntegrationContract(
    INVENTORY_DASHBOARD_TEMPLATE_CONTRACT.key,
    INVENTORY_EXPORT_CONTRACT.key,
  ),
  exportReport: createExportReportIntegrationContract(
    INVENTORY_REPORT_READINESS_CONTRACT.key,
    INVENTORY_EXPORT_CONTRACT.key,
  ),
  exportSearch: createExportSearchIntegrationContract(INVENTORY_EXPORT_CONTRACT.key, {
    resultTypes: ["record", "document"],
    searchProviderKey: INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
  }),
  productImportSearchIndexing: createImportSearchIndexingContract(
    INVENTORY_PRODUCT_IMPORT_CONTRACT.key,
    INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
  ),
};

export const INVENTORY_FOUNDATION_CONTRACTS = {
  appManifest: inventoryAppManifest,
  auditActions: INVENTORY_AUDIT_ACTIONS,
  costDefinition: INVENTORY_COST_DEFINITION_CONTRACT,
  costIntegrations: INVENTORY_COST_INTEGRATION_CONTRACTS,
  dashboardTemplate: INVENTORY_DASHBOARD_TEMPLATE_CONTRACT,
  dashboardWidget: INVENTORY_DASHBOARD_WIDGET_CONTRACT,
  documentContracts: INVENTORY_DOCUMENT_CONTRACTS,
  documentArchitecture: INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT,
  documentLine: INVENTORY_DOCUMENT_LINE_CONTRACT,
  documentSnapshot: INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT,
  documentTypes: INVENTORY_DOCUMENT_TYPE_DEFINITIONS,
  currentStateProjection: INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT,
  eventDefinitions: INVENTORY_EVENT_DEFINITIONS,
  export: INVENTORY_EXPORT_CONTRACT,
  financeIntegrations: INVENTORY_FINANCE_INTEGRATION_CONTRACTS,
  foundationDocumentContracts: INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS,
  foundationDocumentTypes: INVENTORY_FOUNDATION_DOCUMENT_TYPE_DEFINITIONS,
  imports: [INVENTORY_PRODUCT_IMPORT_CONTRACT, INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT],
  importExportIntegrations: INVENTORY_IMPORT_EXPORT_INTEGRATION_CONTRACTS,
  jobReadiness: INVENTORY_JOB_READINESS_CONTRACTS,
  ledgerArchitecture: INVENTORY_LEDGER_ARCHITECTURE_CONTRACT,
  ledgerPostingEngine: INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT,
  ledgerProjectionEvents: INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT,
  ledgerReversal: INVENTORY_LEDGER_REVERSAL_CONTRACT,
  projectionEngine: INVENTORY_PROJECTION_ENGINE_CONTRACT,
  projectionIdempotency: INVENTORY_PROJECTION_IDEMPOTENCY_CONTRACT,
  projectionRebuild: INVENTORY_PROJECTION_REBUILD_CONTRACT,
  moduleManifest: inventoryModuleManifest,
  objectRef: INVENTORY_OBJECT_REF_CONTRACT,
  permissions: INVENTORY_PERMISSION_LIST,
  productMasterPolicy: INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT,
  quantityModel: INVENTORY_QUANTITY_MODEL_CONTRACT,
  print: INVENTORY_PRINT_READINESS_CONTRACT,
  reservationEngine: INVENTORY_RESERVATION_ENGINE_CONTRACT,
  reservationEvents: INVENTORY_RESERVATION_EVENTS_CONTRACT,
  reservationExpiry: INVENTORY_RESERVATION_EXPIRY_CONTRACT,
  reservationFoundationLifecycle: INVENTORY_RESERVATION_FOUNDATION_LIFECYCLE_CONTRACT,
  reservationAvailability: INVENTORY_RESERVATION_AVAILABILITY_CONTRACT,
  reservationLifecycle: INVENTORY_RESERVATION_LIFECYCLE_CONTRACT,
  reservationPlatformIntegrations: INVENTORY_RESERVATION_PLATFORM_INTEGRATION_CONTRACT,
  reservationTypes: INVENTORY_RESERVATION_TYPES,
  report: INVENTORY_REPORT_READINESS_CONTRACT,
  reportDataset: INVENTORY_REPORT_DATASET_CONTRACT,
  search: INVENTORY_SEARCH_PROVIDER_CONTRACT,
  warehouseLocationArchitecture: INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT,
  handlingUnitArchitecture: INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT,
  lotArchitecture: INVENTORY_LOT_ARCHITECTURE_CONTRACT,
  serialEngine: INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT,
} as const;

export type {
  CursorPage,
  InventoryEventDefinitionRecord,
  InventoryEventRouteRecord,
  InventoryIntegrationEndpointRecord,
  InventoryIntegrationMessageRecord,
  InventoryListQuery,
  PostStockInput,
  ReverseStockPostingInput,
  StockBalanceRecord,
  StockLedgerDirection,
  StockLedgerEntryRecord,
  StockMovementTypeKey,
  StockPostingBatchRecord,
  StockPostingLineInput,
} from "./application/types";
export type {
  InventoryTransactionDetail,
  InventoryTransactionType,
} from "./application/types/inventory-transactions";
