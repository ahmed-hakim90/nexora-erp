import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { PrintPageSize, PrintTemplateBlockType } from "@/platform/printing/public-api";
import type { SearchResult } from "@/platform/search/public-api";

export type OxFieldCategory = "essential" | "advanced" | "administrative" | "system";
export type OxDeviceKind = "desktop" | "tablet" | "phone" | "handheld-scanner" | "kiosk";
export type OxRoleKey =
  | "warehouse-keeper"
  | "warehouse-manager"
  | "production-worker"
  | "production-supervisor"
  | "purchasing-officer"
  | "sales-officer"
  | "accountant"
  | "hr-officer"
  | "service-technician"
  | "fleet-coordinator"
  | "store-manager";
export type OxTaskIntent =
  | "receive"
  | "issue"
  | "transfer"
  | "count"
  | "produce"
  | "approve"
  | "request"
  | "print"
  | "review"
  | "create";
export type OxScannerSymbology = "barcode" | "qr" | "rfid" | "keyboard-wedge";
export type OxScanTarget =
  | "product"
  | "serial"
  | "lot"
  | "warehouse-location"
  | "work-order"
  | "production-order"
  | "transfer-document"
  | "employee"
  | "party";
export type OxSmartDefaultSource =
  | "context"
  | "role-workspace"
  | "recent-activity"
  | "task-definition"
  | "system-numbering"
  | "business-rule";
export type OxWizardStepState = "pending" | "current" | "complete" | "blocked";
export type OxPrintLabelKind =
  | "product-label"
  | "shelf-label"
  | "location-label"
  | "serial-label"
  | "lot-label"
  | "work-order-label"
  | "production-label"
  | "transfer-label";

export type OxOperationalContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  companyName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  productionLineId?: string | null;
  productionLineName?: string | null;
  workstationId?: string | null;
  workstationName?: string | null;
  shiftKey?: string | null;
  shiftName?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  currencyCode?: string | null;
  uomId?: string | null;
  uomName?: string | null;
  transactionDate: string;
  experience: AccessExperience;
  roleKey?: OxRoleKey | string | null;
  device: OxDeviceProfile;
  locale: "ar" | "en";
  direction: "rtl" | "ltr";
  timezone: string;
}>;

export type OxDeviceProfile = Readonly<{
  kind: OxDeviceKind;
  scannerPreferred: boolean;
  touchPreferred: boolean;
  minTouchTargetPx: number;
  oneHanded: boolean;
  offlineDraftReady: boolean;
}>;

export type OxTaskDefinition = Readonly<{
  key: string;
  label: string;
  intent: OxTaskIntent;
  appKey?: string;
  description: string;
  requiredPermission?: PermissionKey | string;
  requiredContext: readonly (keyof OxOperationalContext)[];
  quickActionLabel?: string;
  suggestedRoleKeys: readonly (OxRoleKey | string)[];
  scannerTargets?: readonly OxScanTarget[];
  wizardKey?: string;
  routeHref?: string;
}>;

export type OxFieldDefinition = Readonly<{
  name: string;
  label: string;
  category: OxFieldCategory;
  required?: boolean;
  defaultKey?: string;
  lookupKey?: string;
  scannerTarget?: OxScanTarget;
  systemManaged?: boolean;
  helpText?: string;
}>;

export type OxVisibleFieldPolicy = Readonly<{
  showAdvanced?: boolean;
  showAdministrative?: boolean;
  includeSystemFields?: boolean;
}>;

export type OxLookupOption = Readonly<{
  id: string;
  entityType: string;
  businessCode?: string | null;
  businessName: string;
  subtitle?: string | null;
  status?: string | null;
  thumbnailUrl?: string | null;
  isRecent?: boolean;
  isFavorite?: boolean;
  disabled?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type OxLookupQuery = Readonly<{
  term: string | null;
  mode: "manual" | "barcode" | "qr";
  rejectedRawIdentifier: boolean;
  minSearchLength: number;
}>;

export type OxLookupProviderContract = Readonly<{
  key: string;
  entityType: string;
  searchProviderKey: string;
  hydrateProviderKey: string;
  supportsRemoteSearch: true;
  supportsRecent: boolean;
  supportsFavorites: boolean;
  supportsBarcodeSearch: boolean;
  supportsQrSearch: boolean;
  supportsKeyboardNavigation: true;
  supportsAsyncLoading: true;
  supportsSelectedRecordHydration: true;
  minSearchLength: number;
  pageSize: number;
}>;

export type OxScannerContract = Readonly<{
  key: string;
  label: string;
  target: OxScanTarget;
  supportedSymbologies: readonly OxScannerSymbology[];
  inputPriority: "scanner-first" | "manual-first";
  normalize: "trim" | "uppercase-trim" | "raw";
  lookupProviderKey: string;
  offlineQueueKey?: string;
}>;

export type OxSmartDefaultDefinition<TValue = unknown> = Readonly<{
  key: string;
  label: string;
  fieldName: string;
  source: OxSmartDefaultSource;
  contextKey?: keyof OxOperationalContext;
  value?: TValue;
  confidence: "high" | "medium" | "low";
  requiresConfirmation: boolean;
}>;

export type OxResolvedDefault = Readonly<{
  key: string;
  fieldName: string;
  label: string;
  value: unknown;
  source: OxSmartDefaultSource;
  confidence: OxSmartDefaultDefinition["confidence"];
  requiresConfirmation: boolean;
}>;

export type OxRoleWorkspaceDefinition = Readonly<{
  key: OxRoleKey | string;
  label: string;
  description: string;
  homeDashboardKey: string;
  defaultNavigationKeys: readonly string[];
  quickTaskKeys: readonly string[];
  suggestedTaskKeys: readonly string[];
  recentDocumentEntityTypes: readonly string[];
  favoriteEntityTypes: readonly string[];
  defaultContextKeys: readonly (keyof OxOperationalContext)[];
}>;

export type OxWizardStepDefinition = Readonly<{
  key: string;
  label: string;
  description: string;
  requiredFieldNames: readonly string[];
  validationScope: "step" | "task" | "server";
  canSaveDraft: boolean;
}>;

export type OxWizardDefinition = Readonly<{
  key: string;
  label: string;
  taskKey: string;
  supportsDraft: true;
  supportsResume: true;
  reviewBeforeSubmit: true;
  steps: readonly OxWizardStepDefinition[];
}>;

export type OxWizardState = Readonly<{
  wizardKey: string;
  activeStepKey: string;
  steps: readonly (OxWizardStepDefinition & { state: OxWizardStepState })[];
  progressPercent: number;
  canSaveDraft: boolean;
  canSubmit: boolean;
}>;

export type OxOperatorError = Readonly<{
  code: string;
  severity: "error" | "warning" | "info";
  fieldName?: string;
  fieldLabel?: string;
  problem: string;
  reason: string;
  fix: string;
  preserveInput: true;
  technicalMessage?: string;
}>;

export type OxMobileStandard = Readonly<{
  minTouchTargetPx: number;
  maxPrimaryActions: number;
  preferSingleColumnForms: boolean;
  avoidWideTables: boolean;
  scannerInputVisible: boolean;
  oneHandedNavigation: boolean;
  offlineDraftReady: boolean;
}>;

export type OxPrintDefinition = Readonly<{
  key: string;
  label: string;
  kind: OxPrintLabelKind;
  entityType: string;
  pageSize: PrintPageSize;
  requiredPermission?: PermissionKey | string;
  blocks: readonly PrintTemplateBlockType[];
  barcodeRequired: boolean;
  qrRequired: boolean;
  futurePrintEngineTemplateKey: string;
}>;

export type OxArchitectureSection = Readonly<{
  key: string;
  title: string;
  purpose: string;
  integrationPoints: readonly string[];
}>;

export type OxFoundationArchitecture = Readonly<{
  key: "operator-experience-foundation";
  version: string;
  mission: string;
  principles: readonly string[];
  sections: readonly OxArchitectureSection[];
  outOfScope: readonly string[];
}>;

export const OX_FIELD_CATEGORIES = ["essential", "advanced", "administrative", "system"] as const satisfies readonly OxFieldCategory[];

export const OX_DEFAULT_DEVICE_PROFILE: OxDeviceProfile = {
  kind: "desktop",
  minTouchTargetPx: 44,
  offlineDraftReady: true,
  oneHanded: false,
  scannerPreferred: false,
  touchPreferred: false,
};

export const OX_HANDHELD_DEVICE_PROFILE: OxDeviceProfile = {
  kind: "handheld-scanner",
  minTouchTargetPx: 48,
  offlineDraftReady: true,
  oneHanded: true,
  scannerPreferred: true,
  touchPreferred: true,
};

export const OX_MOBILE_STANDARD: OxMobileStandard = {
  avoidWideTables: true,
  maxPrimaryActions: 2,
  minTouchTargetPx: 48,
  offlineDraftReady: true,
  oneHandedNavigation: true,
  preferSingleColumnForms: true,
  scannerInputVisible: true,
};

export const OX_FOUNDATION_ARCHITECTURE: OxFoundationArchitecture = {
  key: "operator-experience-foundation",
  mission: "Guide operators through work with task-first, scanner-first, role-aware runtime contracts.",
  outOfScope: [
    "Business workflow implementation",
    "Scanner driver implementation",
    "Business-specific dashboard redesign",
    "Mobile native application implementation",
  ],
  principles: [
    "task-first",
    "progressive-disclosure",
    "smart-defaults",
    "universal-entity-lookup",
    "scanner-first",
    "quick-create-continuity",
    "context-inheritance",
    "role-workspaces",
    "guided-wizards",
    "operator-safe-errors",
    "mobile-handheld-standards",
    "printing-readiness",
  ],
  sections: [
    {
      integrationPoints: ["platform.navigation", "platform.search", "platform.workflow"],
      key: "task-runtime",
      purpose: "Define task-first actions independent of entity CRUD pages.",
      title: "Task Runtime",
    },
    {
      integrationPoints: ["platform.search", "platform.numbering", "platform.permissions"],
      key: "lookup-runtime",
      purpose: "Standardize remote search, hydration, recent/favorite records, and no raw ID display.",
      title: "Universal Entity Lookup",
    },
    {
      integrationPoints: ["core.context", "platform.auth", "platform.tenancy", "platform.branches"],
      key: "context-engine",
      purpose: "Carry company, branch, warehouse, shift, line, role, and device context into tasks.",
      title: "Context Engine",
    },
    {
      integrationPoints: ["platform.workflow", "platform.document", "platform.feedback"],
      key: "wizard-runtime",
      purpose: "Break long operational work into validated, resumable, reviewable steps.",
      title: "Wizard Runtime",
    },
    {
      integrationPoints: ["platform.printing", "platform.reporting", "platform.background-jobs"],
      key: "printing-readiness",
      purpose: "Define label and operational print contracts for future Print Engine execution.",
      title: "Operational Printing",
    },
  ],
  version: "1.0.0",
};

export const OX_SHARED_RUNTIME_CONTRACTS = {
  contextEngine: "OxOperationalContext",
  entityLookup: "OxLookupProviderContract",
  errorExperience: "OxOperatorError",
  mobileStandard: "OxMobileStandard",
  printingReadiness: "OxPrintDefinition",
  roleWorkspace: "OxRoleWorkspaceDefinition",
  scannerIntegration: "OxScannerContract",
  smartDefaults: "OxSmartDefaultDefinition",
  taskRuntime: "OxTaskDefinition",
  wizardRuntime: "OxWizardDefinition",
} as const;

export const OX_UX_RUNTIME_COMPONENTS = [
  "OperatorContextBar",
  "OperatorTaskCard",
  "OperatorProgressiveSection",
  "ScannerInputFrame",
  "OperatorWizardProgress",
  "OperatorErrorMessage",
  "SmartDefaultsSummary",
] as const;

export const OX_ROLE_WORKSPACE_TEMPLATES = [
  defineOxRoleWorkspace({
    defaultContextKeys: ["companyId", "branchId", "warehouseId", "locationId", "device", "roleKey"],
    defaultNavigationKeys: ["inventory.dashboard", "inventory.transactions", "inventory.stock-balances"],
    description: "Fast receiving, issuing, transfers, cycle counts, labels, and pending warehouse work.",
    favoriteEntityTypes: ["warehouse", "location", "product"],
    homeDashboardKey: "ox.role.warehouse-keeper.home",
    key: "warehouse-keeper",
    label: "Warehouse Keeper",
    quickTaskKeys: ["receive-goods", "issue-materials", "transfer-stock", "cycle-count"],
    recentDocumentEntityTypes: ["goods-receipt", "goods-issue", "warehouse-transfer"],
    suggestedTaskKeys: ["print-location-label", "review-low-stock"],
  }),
  defineOxRoleWorkspace({
    defaultContextKeys: ["companyId", "branchId", "productionLineId", "shiftKey", "device", "roleKey"],
    defaultNavigationKeys: ["manufacturing.daily-reports", "manufacturing.work-orders"],
    description: "Simple production capture, current assignments, worker output, and shift progress.",
    favoriteEntityTypes: ["production-line", "workstation", "product"],
    homeDashboardKey: "ox.role.production-worker.home",
    key: "production-worker",
    label: "Production Worker",
    quickTaskKeys: ["daily-production", "scan-work-order"],
    recentDocumentEntityTypes: ["daily-production-report", "work-order"],
    suggestedTaskKeys: ["resume-draft-production", "report-downtime"],
  }),
  defineOxRoleWorkspace({
    defaultContextKeys: ["companyId", "branchId", "productionLineId", "shiftKey", "supervisorId", "device", "roleKey"],
    defaultNavigationKeys: ["manufacturing.dashboard", "manufacturing.daily-reports", "manufacturing.reports"],
    description: "Line supervision, DPR review, exceptions, approvals, and shift performance.",
    favoriteEntityTypes: ["production-line", "worker", "product"],
    homeDashboardKey: "ox.role.production-supervisor.home",
    key: "production-supervisor",
    label: "Production Supervisor",
    quickTaskKeys: ["daily-production", "review-production-exceptions"],
    recentDocumentEntityTypes: ["daily-production-report", "manufacturing-order", "work-order"],
    suggestedTaskKeys: ["approve-dpr", "review-scrap"],
  }),
] as const satisfies readonly OxRoleWorkspaceDefinition[];

export function defineOxTask<TTask extends OxTaskDefinition>(task: TTask): TTask {
  if (!task.key.trim()) throw new Error("OX task key is required.");
  if (!task.label.trim()) throw new Error("OX task label is required.");
  return task;
}

export function defineOxRoleWorkspace<TWorkspace extends OxRoleWorkspaceDefinition>(
  workspace: TWorkspace,
): TWorkspace {
  if (!workspace.key.trim()) throw new Error("OX role workspace key is required.");
  if (!workspace.homeDashboardKey.trim()) throw new Error("OX role workspace requires a home dashboard key.");
  return workspace;
}

export function defineOxWizard<TWizard extends OxWizardDefinition>(wizard: TWizard): TWizard {
  if (!wizard.key.trim()) throw new Error("OX wizard key is required.");
  if (wizard.steps.length === 0) throw new Error("OX wizard requires at least one step.");
  return wizard;
}

export function defineOxLookupProvider<TProvider extends OxLookupProviderContract>(
  provider: TProvider,
): TProvider {
  if (!provider.key.trim()) throw new Error("OX lookup provider key is required.");
  if (!provider.searchProviderKey.trim()) throw new Error("OX lookup provider requires platform search integration.");
  return provider;
}

export function defineOxScannerContract<TContract extends OxScannerContract>(
  contract: TContract,
): TContract {
  if (!contract.supportedSymbologies.length) throw new Error("OX scanner contract requires at least one symbology.");
  return contract;
}

export function defineOxPrintDefinition<TDefinition extends OxPrintDefinition>(
  definition: TDefinition,
): TDefinition {
  if (!definition.blocks.includes("body")) throw new Error("OX print definitions require a body block.");
  if (!definition.futurePrintEngineTemplateKey.trim()) throw new Error("OX print definition requires a future Print Engine template key.");
  return definition;
}

export function createOxRuntimeContext(input: Omit<OxOperationalContext, "device" | "transactionDate" | "locale" | "direction" | "timezone"> & Partial<Pick<OxOperationalContext, "device" | "transactionDate" | "locale" | "direction" | "timezone">>): OxOperationalContext {
  return {
    ...input,
    device: input.device ?? OX_DEFAULT_DEVICE_PROFILE,
    direction: input.direction ?? "ltr",
    locale: input.locale ?? "en",
    timezone: input.timezone ?? "UTC",
    transactionDate: input.transactionDate ?? new Date().toISOString().slice(0, 10),
  };
}

export function mergeOxContext(
  base: OxOperationalContext,
  override: Partial<OxOperationalContext>,
): OxOperationalContext {
  return {
    ...base,
    ...override,
    device: override.device ?? base.device,
  };
}

export function getVisibleOxFields(
  fields: readonly OxFieldDefinition[],
  policy: OxVisibleFieldPolicy = {},
): readonly OxFieldDefinition[] {
  return fields.filter((field) =>
    field.category === "essential"
    || (field.category === "advanced" && policy.showAdvanced)
    || (field.category === "administrative" && policy.showAdministrative)
    || (field.category === "system" && policy.includeSystemFields),
  );
}

export function groupOxFieldsByCategory(
  fields: readonly OxFieldDefinition[],
): Record<OxFieldCategory, readonly OxFieldDefinition[]> {
  return {
    administrative: fields.filter((field) => field.category === "administrative"),
    advanced: fields.filter((field) => field.category === "advanced"),
    essential: fields.filter((field) => field.category === "essential"),
    system: fields.filter((field) => field.category === "system"),
  };
}

export function resolveOxSmartDefaults(
  definitions: readonly OxSmartDefaultDefinition[],
  context: OxOperationalContext,
  existingValues: Readonly<Record<string, unknown>> = {},
): readonly OxResolvedDefault[] {
  return definitions.flatMap((definition) => {
    if (existingValues[definition.fieldName] !== undefined && existingValues[definition.fieldName] !== null && existingValues[definition.fieldName] !== "") {
      return [];
    }
    const value = definition.contextKey ? context[definition.contextKey] : definition.value;
    if (value === undefined || value === null || value === "") return [];
    return [{
      confidence: definition.confidence,
      fieldName: definition.fieldName,
      key: definition.key,
      label: definition.label,
      requiresConfirmation: definition.requiresConfirmation,
      source: definition.source,
      value,
    }];
  });
}

export function normalizeOxLookupOption(option: OxLookupOption): OxLookupOption | null {
  const businessName = option.businessName.trim().replace(/\s+/g, " ");
  const businessCode = option.businessCode?.trim() || null;
  if (!option.id.trim() || !option.entityType.trim()) return null;
  if (!businessName || isRawIdentifier(businessName)) return null;
  return {
    ...option,
    businessCode,
    businessName,
    entityType: option.entityType.trim(),
    id: option.id.trim(),
  };
}

export function oxLookupOptionToSearchResult(
  option: OxLookupOption,
  moduleKey = "operator-experience",
): SearchResult {
  const normalized = normalizeOxLookupOption(option);
  if (!normalized) {
    throw new Error("OX lookup options must have a business name and must not display raw identifiers.");
  }
  return {
    entityId: normalized.id,
    entityType: normalized.entityType,
    metadata: {
      businessCode: normalized.businessCode,
      status: normalized.status,
      thumbnailUrl: normalized.thumbnailUrl,
    },
    moduleKey,
    rank: normalized.isFavorite ? 20 : normalized.isRecent ? 15 : 0,
    subtitle: [normalized.businessCode, normalized.subtitle, normalized.status].filter(Boolean).join(" - "),
    title: normalized.businessName,
    type: "record",
  };
}

export function createOxLookupQuery(
  input: string,
  options: Readonly<{ mode?: OxLookupQuery["mode"]; minSearchLength?: number }> = {},
): OxLookupQuery {
  const mode = options.mode ?? "manual";
  const minSearchLength = mode === "manual" ? Math.max(options.minSearchLength ?? 2, 0) : 1;
  const term = input.trim().replace(/\s+/g, " ");
  const rejectedRawIdentifier = mode === "manual" && isRawIdentifier(term);
  return {
    minSearchLength,
    mode,
    rejectedRawIdentifier,
    term: rejectedRawIdentifier || term.length < minSearchLength ? null : term,
  };
}

export function normalizeOxScanValue(
  value: string,
  mode: OxScannerContract["normalize"] = "trim",
): string {
  const trimmed = value.trim();
  if (mode === "uppercase-trim") return trimmed.toUpperCase();
  if (mode === "raw") return value;
  return trimmed;
}

export function createOxWizardState(
  wizard: OxWizardDefinition,
  completedStepKeys: readonly string[] = [],
  activeStepKey?: string,
): OxWizardState {
  const completed = new Set(completedStepKeys);
  const active = activeStepKey ?? wizard.steps.find((step) => !completed.has(step.key))?.key ?? wizard.steps.at(-1)?.key ?? "";
  const activeIndex = Math.max(wizard.steps.findIndex((step) => step.key === active), 0);
  const steps = wizard.steps.map((step, index) => ({
    ...step,
    state: completed.has(step.key) ? "complete" : index === activeIndex ? "current" : index < activeIndex ? "blocked" : "pending",
  } satisfies OxWizardState["steps"][number]));
  const completeCount = steps.filter((step) => step.state === "complete").length;
  return {
    activeStepKey: active,
    canSaveDraft: steps[activeIndex]?.canSaveDraft ?? true,
    canSubmit: completeCount === steps.length,
    progressPercent: steps.length === 0 ? 0 : Math.round((completeCount / steps.length) * 100),
    steps,
    wizardKey: wizard.key,
  };
}

export function createOxOperatorError(input: Readonly<{
  code: string;
  fieldName?: string;
  fieldLabel?: string;
  problem: string;
  reason?: string;
  fix?: string;
  severity?: OxOperatorError["severity"];
  technicalMessage?: string;
}>): OxOperatorError {
  return {
    code: input.code,
    fieldLabel: input.fieldLabel,
    fieldName: input.fieldName,
    fix: input.fix ?? "Review the highlighted field and try again.",
    preserveInput: true,
    problem: stripTechnicalDetails(input.problem),
    reason: stripTechnicalDetails(input.reason ?? "The value does not meet the requirements for this task."),
    severity: input.severity ?? "error",
    technicalMessage: input.technicalMessage,
  };
}

export function createOxLabelPrintDefinition(input: Omit<OxPrintDefinition, "blocks" | "pageSize"> & Partial<Pick<OxPrintDefinition, "blocks" | "pageSize">>): OxPrintDefinition {
  return defineOxPrintDefinition({
    ...input,
    blocks: input.blocks ?? ["header", "body", input.barcodeRequired ? "barcode" : "text", input.qrRequired ? "qr-code" : "text"],
    pageSize: input.pageSize ?? "custom",
  });
}

export function isRawIdentifier(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function stripTechnicalDetails(value: string): string {
  return value
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "the selected record")
    .replace(/\b[A-Z0-9_]+_ERROR\b/g, "an operational error")
    .trim();
}

export * from "./lookup-runtime";
export * from "./lookup-cache";
export * from "./lookup-providers";
export * from "./lookup-registry";
export * from "./enterprise-runtime";
