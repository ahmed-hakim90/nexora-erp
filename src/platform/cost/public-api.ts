import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration } from "@/platform/background-jobs/public-api";
import type { PlatformEventName } from "@/platform/events/public-api";
import type { ExportFormat } from "@/platform/export/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { ReportFormat } from "@/platform/reporting/public-api";
import type { SearchResultType } from "@/platform/search/public-api";

export type CostMethod = "standard" | "weighted_average" | "fifo" | "specific_identification";

export type CostType =
  | "direct_material"
  | "direct_labor"
  | "manufacturing_overhead"
  | "logistics"
  | "service"
  | "payroll"
  | "landed_cost"
  | "indirect"
  | "fixed"
  | "variable"
  | "semi_variable"
  | "custom";

export type CostObjectType =
  | "product"
  | "variant"
  | "work_order"
  | "production_order"
  | "batch"
  | "inventory_item"
  | "warehouse"
  | "branch"
  | "employee"
  | "asset"
  | "vehicle"
  | "project"
  | "service_ticket"
  | "sales_order"
  | "customer"
  | "party"
  | "custom";

export type CostCenterType =
  | "company"
  | "branch"
  | "department"
  | "production_line"
  | "work_center"
  | "warehouse"
  | "service_center"
  | "fleet"
  | "project"
  | "custom";

export type CostAllocationMethod =
  | "quantity_based"
  | "time_based"
  | "labor_hours"
  | "machine_hours"
  | "weight_based"
  | "volume_based"
  | "value_based"
  | "percentage"
  | "equal_split"
  | "custom_formula";

export type CostOperationType = "allocation" | "snapshot" | "recalculation" | "rate-change" | "definition-change";
export type CostOperationStatus = "draft" | "queued" | "running" | "completed" | "failed" | "cancelled" | "dead-letter";
export type CostProviderSource = "platform-engine" | "business-app" | "marketplace-extension" | "integration";
export type CostSourceEngine = "cost-engine" | "document-engine" | "workflow" | "background-job" | "import-export" | "reporting" | "dashboard" | "business-app";

export type CostSecurityMetadata = Readonly<{
  requiredPermissions: readonly (PermissionKey | string)[];
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  requiredDataScopes?: readonly string[];
  sensitiveFinancialData: boolean;
  auditRequired: boolean;
  approvalRequired: boolean;
  exportRestrictions?: readonly ("no-export" | "masked-only" | "approval-required" | "watermark-required")[];
}>;

export type CostCategory = Readonly<{
  key: string;
  label: string;
  type: CostType;
  parentKey?: string | null;
  description?: string;
  active: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CostCenter = Readonly<{
  key: string;
  label: string;
  type: CostCenterType;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  parentKey?: string | null;
  active: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CostObject = Readonly<{
  key: string;
  label: string;
  type: CostObjectType;
  objectId?: string | null;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CostDriver = Readonly<{
  key: string;
  label: string;
  unit: "quantity" | "time" | "hours" | "weight" | "volume" | "value" | "percentage" | "custom";
  sourceField?: string;
  required: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CostAllocationRule = Readonly<{
  key: string;
  label: string;
  method: CostAllocationMethod;
  sourceCostCenterKey?: string;
  targetCostObjectKeys: readonly string[];
  driverKey?: string;
  percentage?: number;
  formulaKey?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  priority?: number;
  requiresApproval?: boolean;
}>;

export type CostRate = Readonly<{
  key: string;
  costType: CostType;
  categoryKey?: string;
  costCenterKey?: string;
  objectKey?: string;
  rate: number;
  currencyCode: string;
  unit: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  sourceDocument?: CostSourceReference;
  approvedBy?: string | null;
}>;

export type CostSourceReference = Readonly<{
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceTransactionId?: string;
  sourceJobId?: string;
  sourceEventName?: PlatformEventName | string;
  sourceEventId?: string;
  sourceActorId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: CostSourceEngine;
}>;

export type CostTrace = CostSourceReference & Readonly<{
  traceId: string;
  correlationId: string;
  operationType: CostOperationType;
  explainability?: Readonly<{
    summary: string;
    inputs?: Readonly<Record<string, unknown>>;
    assumptions?: readonly string[];
    warnings?: readonly string[];
  }>;
}>;

export type CostBreakdownLine = Readonly<{
  key: string;
  label: string;
  costType: CostType;
  categoryKey?: string;
  amount: number;
  currencyCode: string;
  percentage?: number;
  traceId?: string;
}>;

export type CostBreakdown = Readonly<{
  key: string;
  objectKey: string;
  totalCost: number;
  currencyCode: string;
  lines: readonly CostBreakdownLine[];
  generatedAt: string;
  traceId?: string;
}>;

export type CostDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  providerSource: CostProviderSource;
  costTypes: readonly CostType[];
  categories: readonly CostCategory[];
  centers: readonly CostCenter[];
  objects: readonly CostObject[];
  drivers: readonly CostDriver[];
  allocationRules: readonly CostAllocationRule[];
  rates: readonly CostRate[];
  security: CostSecurityMetadata;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CostPolicy = Readonly<{
  key: string;
  tenantId: string;
  companyId?: string | null;
  method: CostMethod;
  currencyCode: string;
  allowNegativeCostLayers: boolean;
  closedPeriodPolicy: "block" | "adjustment_only";
}>;

export type CostEvent = Readonly<{
  idempotencyKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  productId?: string | null;
  quantity?: number | null;
  amount?: number | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}>;

export type CostLayer = Readonly<{
  id: string;
  productId: string;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  currencyCode: string;
  layerKey?: string;
  costType?: CostType;
  objectKey?: string;
  effectiveDate?: string;
  version?: number;
  source?: CostSourceReference;
  recalculation?: Readonly<{
    requestedBy?: string | null;
    requestedAt?: string;
    reason?: string;
    previousLayerId?: string;
  }>;
  explainability?: Readonly<Record<string, unknown>>;
}>;

export type CostCalculationRequest = Readonly<{
  policy: CostPolicy;
  event: CostEvent;
  availableLayers?: readonly CostLayer[];
}>;

export type CostCalculationResult = Readonly<{
  eventIdempotencyKey: string;
  unitCost: number;
  totalCost: number;
  currencyCode: string;
  consumedLayers: readonly CostLayer[];
  generatedLayers: readonly CostLayer[];
}>;

export type CostSnapshot = Readonly<{
  asOf: string;
  productId: string;
  quantity: number;
  totalCost: number;
  currencyCode: string;
  key?: string;
  objectKey?: string;
  version?: number;
  layers?: readonly CostLayer[];
  breakdown?: CostBreakdown;
  trace?: CostTrace;
  recalculation?: Readonly<{
    recalculatedFromSnapshotKey?: string;
    requestedAt: string;
    requestedBy?: string | null;
    reason: string;
  }>;
}>;

export type CostContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  actorType?: ActorType | null;
  actorId?: string | null;
  principalId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: CostSourceEngine;
  sourceDocument?: CostSourceReference;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  preferAsync?: boolean;
}>;

export type CostResult = Readonly<{
  operationType: CostOperationType;
  status: CostOperationStatus;
  definitionKey?: string;
  objectCount: number;
  rowCount?: number;
  totalCost?: number;
  currencyCode?: string;
  breakdown?: CostBreakdown;
  snapshot?: CostSnapshot;
  trace: CostTrace;
  jobKey?: string;
  jobId?: string;
  durationMs?: number;
  errorMessage?: string;
}>;

export type CostRegistry = Readonly<{
  definitions: readonly CostDefinition[];
}>;

export type CostValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type CostEventIntegrationContract = Readonly<{
  eventName: PlatformEventName | string;
  operationType: CostOperationType;
  costDefinitionKey?: string;
  requiresSubscription: true;
}>;

export type CostJobReadiness = Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  operationType: Extract<CostOperationType, "allocation" | "snapshot" | "recalculation">;
  requiresBackgroundExecution: true;
  progressTracking: true;
  retryable: boolean;
  deadLetterEnabled: boolean;
}>;

export type CostReportIntegrationContract = Readonly<{
  reportKey: string;
  costDefinitionKey: string;
  supportedFormats: readonly ReportFormat[];
  consumesCostResults: true;
}>;

export type CostDashboardIntegrationContract = Readonly<{
  dashboardKey: string;
  kpiKey?: string;
  costDefinitionKey: string;
  displaysCostKpis: true;
}>;

export type CostSearchIntegrationContract = Readonly<{
  searchProviderKey: string;
  resultTypes: readonly SearchResultType[];
  indexesCostTraces: true;
}>;

export type CostExportIntegrationContract = Readonly<{
  exportKey: string;
  supportedFormats: readonly ExportFormat[];
  exportsBreakdowns: true;
}>;

export function defineCostPolicy<TPolicy extends CostPolicy>(policy: TPolicy): TPolicy {
  return policy;
}

export const COST_PLATFORM_EVENTS = {
  allocationCompleted: "CostAllocationCompleted",
  allocationRequested: "CostAllocationRequested",
  definitionCreated: "CostDefinitionCreated",
  rateChanged: "CostRateChanged",
  recalculationCompleted: "CostRecalculationCompleted",
  recalculationRequested: "CostRecalculationRequested",
  snapshotCreated: "CostSnapshotCreated",
} as const satisfies Record<string, PlatformEventName | string>;

export function defineCostDefinition<TDefinition extends CostDefinition>(definition: TDefinition): TDefinition {
  const validation = validateCostDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validateCostDefinition(definition: CostDefinition): CostValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Cost definition key is required.");
  }

  if (!definition.appKey.trim()) {
    errors.push("Cost definition app key is required.");
  }

  if (!definition.label.trim()) {
    errors.push("Cost definition label is required.");
  }

  if (definition.costTypes.length === 0) {
    errors.push("Cost definition requires at least one cost type.");
  }

  if (definition.security.requiredPermissions.length === 0) {
    errors.push("Cost definition requires at least one permission.");
  }

  errors.push(...validateCostCategories(definition.categories).errors);
  errors.push(...validateCostCenters(definition.centers).errors);
  errors.push(...validateCostObjects(definition.objects).errors);
  errors.push(...validateCostDrivers(definition.drivers).errors);
  errors.push(...validateCostAllocationRules(definition.allocationRules).errors);

  for (const duplicate of findDuplicates(definition.rates.map((rate) => rate.key))) {
    errors.push(`Duplicate cost rate: ${duplicate}`);
  }

  return toValidationResult(errors);
}

export function validateCostCategories(categories: readonly CostCategory[]): CostValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(categories.map((category) => category.key))) {
    errors.push(`Duplicate cost category: ${duplicate}`);
  }

  for (const category of categories) {
    if (!category.key.trim()) {
      errors.push("Cost category key is required.");
    }

    if (!category.label.trim()) {
      errors.push(`Cost category ${category.key} requires a label.`);
    }
  }

  return toValidationResult(errors);
}

export function validateCostCenters(centers: readonly CostCenter[]): CostValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(centers.map((center) => center.key))) {
    errors.push(`Duplicate cost center: ${duplicate}`);
  }

  for (const center of centers) {
    if (!center.key.trim()) {
      errors.push("Cost center key is required.");
    }

    if (!center.label.trim()) {
      errors.push(`Cost center ${center.key} requires a label.`);
    }
  }

  return toValidationResult(errors);
}

export function validateCostObjects(objects: readonly CostObject[]): CostValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(objects.map((object) => object.key))) {
    errors.push(`Duplicate cost object: ${duplicate}`);
  }

  for (const object of objects) {
    if (!object.key.trim()) {
      errors.push("Cost object key is required.");
    }

    if (!object.label.trim()) {
      errors.push(`Cost object ${object.key} requires a label.`);
    }
  }

  return toValidationResult(errors);
}

export function validateCostDrivers(drivers: readonly CostDriver[]): CostValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(drivers.map((driver) => driver.key))) {
    errors.push(`Duplicate cost driver: ${duplicate}`);
  }

  for (const driver of drivers) {
    if (!driver.key.trim()) {
      errors.push("Cost driver key is required.");
    }

    if (!driver.label.trim()) {
      errors.push(`Cost driver ${driver.key} requires a label.`);
    }
  }

  return toValidationResult(errors);
}

export function validateCostAllocationRules(rules: readonly CostAllocationRule[]): CostValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(rules.map((rule) => rule.key))) {
    errors.push(`Duplicate cost allocation rule: ${duplicate}`);
  }

  for (const rule of rules) {
    if (!rule.key.trim()) {
      errors.push("Cost allocation rule key is required.");
    }

    if (!rule.label.trim()) {
      errors.push(`Cost allocation rule ${rule.key} requires a label.`);
    }

    if (rule.targetCostObjectKeys.length === 0) {
      errors.push(`Cost allocation rule ${rule.key} requires at least one target cost object.`);
    }

    if (rule.method === "percentage" && (rule.percentage === undefined || rule.percentage < 0 || rule.percentage > 100)) {
      errors.push(`Cost allocation rule ${rule.key} requires a percentage between 0 and 100.`);
    }

    if (rule.method === "custom_formula" && !rule.formulaKey) {
      errors.push(`Cost allocation rule ${rule.key} requires a formula key.`);
    }

    if (rule.method !== "percentage" && rule.method !== "equal_split" && rule.method !== "custom_formula" && !rule.driverKey) {
      errors.push(`Cost allocation rule ${rule.key} requires a cost driver.`);
    }
  }

  return toValidationResult(errors);
}

export function createCostRegistry(definitions: readonly CostDefinition[] = []): CostRegistry {
  return {
    definitions: dedupeByKey(definitions),
  };
}

export function registerCostDefinition(registry: CostRegistry, definition: CostDefinition): CostRegistry {
  defineCostDefinition(definition);

  return createCostRegistry([
    ...registry.definitions.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function canAccessCostDefinition(definition: CostDefinition, context: CostContext): boolean {
  const hasPermissions = definition.security.requiredPermissions.every((permission) => context.grantedPermissions?.has(permission));
  const hasDataScopes = (definition.security.requiredDataScopes ?? []).every((scope) => context.dataScopeKeys?.has(scope));

  return hasPermissions
    && hasDataScopes
    && (!definition.security.tenantAware || Boolean(context.tenantId))
    && (!definition.security.companyAware || Boolean(context.companyId))
    && (!definition.security.branchAware || Boolean(context.branchId));
}

export function createCostLayer(input: CostLayer): CostLayer {
  return input;
}

export function createCostSnapshot(input: CostSnapshot): CostSnapshot {
  return input;
}

export function createCostBreakdown(input: CostBreakdown): CostBreakdown {
  return input;
}

export function createCostTrace(input: CostTrace): CostTrace {
  return input;
}

export function createCostResult(input: CostResult): CostResult {
  return input;
}

export function createCostEventIntegrationContract(
  eventName: PlatformEventName | string,
  operationType: CostOperationType,
  costDefinitionKey?: string,
): CostEventIntegrationContract {
  return {
    costDefinitionKey,
    eventName,
    operationType,
    requiresSubscription: true,
  };
}

export function createCostJobReadinessContract(
  operationType: Extract<CostOperationType, "allocation" | "snapshot" | "recalculation">,
  costDefinitionKey: string,
): CostJobReadiness {
  return {
    deadLetterEnabled: true,
    integration: "cost-recalculation",
    jobKey: `cost.${costDefinitionKey}.${operationType}`,
    operationType,
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
  };
}

export function createCostReportIntegrationContract(
  reportKey: string,
  costDefinitionKey: string,
  supportedFormats: readonly ReportFormat[] = ["table", "json", "csv", "pdf"],
): CostReportIntegrationContract {
  return {
    consumesCostResults: true,
    costDefinitionKey,
    reportKey,
    supportedFormats,
  };
}

export function createCostDashboardIntegrationContract(
  dashboardKey: string,
  costDefinitionKey: string,
  kpiKey?: string,
): CostDashboardIntegrationContract {
  return {
    costDefinitionKey,
    dashboardKey,
    displaysCostKpis: true,
    kpiKey,
  };
}

export function createCostSearchIntegrationContract(
  searchProviderKey: string,
  resultTypes: readonly SearchResultType[] = ["record"],
): CostSearchIntegrationContract {
  return {
    indexesCostTraces: true,
    resultTypes,
    searchProviderKey,
  };
}

export function createCostExportIntegrationContract(
  exportKey: string,
  supportedFormats: readonly ExportFormat[] = ["csv", "excel", "json"],
): CostExportIntegrationContract {
  return {
    exportKey,
    exportsBreakdowns: true,
    supportedFormats,
  };
}

export function createCostSecurityMetadata(
  definition: CostDefinition,
  context: CostContext,
): Readonly<{
  costDefinitionKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  dataScopes: readonly string[];
  sensitiveFinancialData: boolean;
  auditRequired: boolean;
  approvalRequired: boolean;
  exportRestrictions: readonly string[];
}> {
  return {
    approvalRequired: definition.security.approvalRequired,
    auditRequired: definition.security.auditRequired,
    branchId: context.branchId,
    companyId: context.companyId,
    costDefinitionKey: definition.key,
    dataScopes: definition.security.requiredDataScopes ?? [],
    exportRestrictions: definition.security.exportRestrictions ?? [],
    requiredPermissions: definition.security.requiredPermissions.map(String),
    sensitiveFinancialData: definition.security.sensitiveFinancialData,
    tenantId: context.tenantId,
  };
}

export function createCostAuditMetadata(
  result: CostResult,
  context: CostContext,
): Readonly<{
  action: AuditAction;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: CostSourceEngine;
  sourceDocument?: CostSourceReference;
  operationType: CostOperationType;
  rowCount?: number;
  objectCount: number;
  durationMs?: number;
  outcome: CostOperationStatus;
}> {
  return {
    action: `cost.${result.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    objectCount: result.objectCount,
    operationType: result.operationType,
    outcome: result.status,
    principalId: context.principalId,
    rowCount: result.rowCount,
    sourceApp: context.sourceApp,
    sourceDocument: context.sourceDocument,
    sourceEngine: context.sourceEngine ?? "cost-engine",
    tenantId: context.tenantId,
  };
}

export function createCostTelemetryMetadata(
  result: CostResult,
  context: CostContext,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  operationType: CostOperationType;
  rowCount?: number;
  objectCount: number;
  durationMs?: number;
  outcome: CostOperationStatus;
}> {
  return {
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    objectCount: result.objectCount,
    operationType: result.operationType,
    outcome: result.status,
    requestId: context.requestId,
    rowCount: result.rowCount,
    sourceKey: result.definitionKey ?? result.trace.traceId,
    tenantId: context.tenantId,
  };
}

function dedupeByKey<TItem extends Readonly<{ key: string }>>(items: readonly TItem[]): readonly TItem[] {
  const byKey = new Map<string, TItem>();

  for (const item of items) {
    byKey.set(item.key, item);
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function toValidationResult(errors: readonly string[]): CostValidationResult {
  return {
    errors,
    valid: errors.length === 0,
  };
}
