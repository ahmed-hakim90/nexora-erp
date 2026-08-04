export { manufacturingAppManifest } from "./app.manifest";
export * from "./foundation-contracts";
export * from "./sprint3-foundation";
export { formatManufacturingRelationLabel, MANUFACTURING_RELATION_LABEL_CONTRACTS } from "./presentation/relation-labels";
export { manufacturingModuleManifest } from "./module.manifest";
export { MANUFACTURING_PERMISSIONS, MANUFACTURING_PERMISSION_LIST } from "./permissions/permission-registry";
export {
  createManufacturingBomService,
  createManufacturingEngineeringService,
  createManufacturingFoundationService,
  createManufacturingLineAssignmentService,
  createManufacturingOrderService,
  createMachineService,
  createManufacturingProfileService,
  createManufacturingRoutingService,
  createProductionLineService,
  createProductionPlanService,
  createProductionStandardService,
  createSupervisorAssignmentService,
  createWorkCenterService,
  createWorkstationService,
} from "./routes/service-factory";
export {
  MANUFACTURING_RESOURCE_DEFINITIONS,
  MANUFACTURING_RESOURCE_LIST,
  getManufacturingResourceDefinition,
  parseManufacturingResourceKey,
} from "./presentation/view-models/page-config";
export { FUTURE_WORKER_ACHIEVEMENT_FORMULA, PRODUCTION_STANDARD_RESOLUTION_PRIORITY, assertManufacturingProductRules } from "./domain/rules/manufacturing-foundation.rules";
export {
  MANUFACTURING_ITEM_ROLE_OPTIONS,
  MANUFACTURING_ITEM_ROLE_VALUES,
  MANUFACTURING_WAREHOUSE_ROLE_MAP,
  MANUFACTURING_WAREHOUSE_TYPE_OPTIONS,
  isManufacturingItemRole,
} from "./domain/manufacturing-catalog-roles";
export type { ManufacturingItemRole } from "./domain/manufacturing-catalog-roles";
export {
  explodeBomLines,
  isApprovedBomStatus,
  isExplodableBomLineStatus,
} from "./domain/bom-explosion";
export type { BomExplosionLineInput, BomExplosionRequirement, BomExplosionResult } from "./domain/bom-explosion";
export { assessRoutingReadiness } from "./domain/routing-readiness";
export type { RoutingReadinessResult, RoutingReadinessStepInput } from "./domain/routing-readiness";
export { resolveProductionStandard } from "./domain/production-standard-resolver";
export type {
  ProductionStandardCandidate,
  ProductionStandardResolveQuery,
} from "./domain/production-standard-resolver";
export type {
  ManufacturingListQuery,
  ManufacturingMutationInput,
  ManufacturingRecord,
  ManufacturingResourceDefinition,
  ManufacturingResourceKey,
} from "./application/types";
