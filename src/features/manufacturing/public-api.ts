export { manufacturingAppManifest } from "./app.manifest";
export * from "./foundation-contracts";
export { manufacturingModuleManifest } from "./module.manifest";
export { MANUFACTURING_PERMISSIONS, MANUFACTURING_PERMISSION_LIST } from "./permissions/permission-registry";
export {
  createManufacturingBomService,
  createManufacturingFoundationService,
  createManufacturingLineAssignmentService,
  createManufacturingProfileService,
  createManufacturingRoutingService,
  createProductionLineService,
  createProductionStandardService,
  createSupervisorAssignmentService,
  createWorkCenterService,
} from "./routes/service-factory";
export {
  MANUFACTURING_RESOURCE_DEFINITIONS,
  MANUFACTURING_RESOURCE_LIST,
  getManufacturingResourceDefinition,
  parseManufacturingResourceKey,
} from "./presentation/view-models/page-config";
export { FUTURE_WORKER_ACHIEVEMENT_FORMULA, PRODUCTION_STANDARD_RESOLUTION_PRIORITY } from "./domain/rules/manufacturing-foundation.rules";
export type {
  ManufacturingListQuery,
  ManufacturingMutationInput,
  ManufacturingRecord,
  ManufacturingResourceDefinition,
  ManufacturingResourceKey,
} from "./application/types";
