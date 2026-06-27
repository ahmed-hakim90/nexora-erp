import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration, RetryPolicy } from "@/platform/background-jobs/public-api";
import type { PlatformEventName } from "@/platform/events/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type AutomationStatus = "draft" | "active" | "paused" | "archived";

export type AutomationRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead-letter";

export type AutomationScope = "tenant" | "company" | "branch" | "user" | "system";

export type AutomationProviderSource = "platform-engine" | "business-app" | "marketplace-extension" | "connector";

export type AutomationTriggerType =
  | "event"
  | "schedule"
  | "manual"
  | "webhook"
  | "document-lifecycle"
  | "workflow"
  | "approval"
  | "import-export"
  | "report"
  | "background-job"
  | "search-index";

export type AutomationConditionType =
  | "field"
  | "status"
  | "permission"
  | "entitlement"
  | "data-scope"
  | "time"
  | "threshold"
  | "custom";

export type AutomationActionType =
  | "create-document"
  | "update-document"
  | "send-notification"
  | "queue-job"
  | "run-report"
  | "export-data"
  | "call-webhook"
  | "call-connector"
  | "request-approval"
  | "trigger-workflow"
  | "ai-action";

export type AutomationConditionOperator =
  | "equals"
  | "not-equals"
  | "contains"
  | "in"
  | "gte"
  | "lte"
  | "between"
  | "exists";

export type AiExecutionMode = "suggest" | "draft" | "execute";

export type AiLoggingPolicy = "none" | "metadata-only" | "redacted" | "full";

export type AiSafetyRiskLevel = "low" | "standard" | "high" | "critical";

export type AiActionOutcome = "succeeded" | "failed" | "blocked" | "requires-approval";

export type AutomationSecurityMetadata = Readonly<{
  requiredPermissions: readonly (PermissionKey | string)[];
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  requiredDataScopes?: readonly string[];
  requiredEntitlements?: readonly string[];
  featureFlagKeys?: readonly string[];
  sensitiveData: boolean;
  humanApprovalRequired: boolean;
  temporaryElevationAllowed: boolean;
  auditRequired: boolean;
}>;

export type AutomationSchedule = Readonly<{
  kind: "once" | "recurring" | "interval";
  runAt?: string;
  cron?: string;
  intervalSeconds?: number;
  timezone?: string;
}>;

export type AutomationTrigger = Readonly<{
  key: string;
  type: AutomationTriggerType;
  eventName?: PlatformEventName | string;
  schedule?: AutomationSchedule;
  commandKey?: string;
  webhookKey?: string;
  documentType?: string;
  lifecycleCommand?: string;
  workflowKey?: string;
  approvalKey?: string;
  importExportKey?: string;
  reportKey?: string;
  jobKey?: string;
  searchProviderKey?: string;
  sourceEngine?: AutomationTriggerType | "notification" | "dashboard" | "print";
  enabled: boolean;
}>;

export type AutomationCondition = Readonly<{
  key: string;
  type: AutomationConditionType;
  fieldKey?: string;
  status?: string;
  operator?: AutomationConditionOperator;
  value?: unknown;
  requiredPermission?: PermissionKey | string;
  entitlementKey?: string;
  dataScopeKey?: string;
  timeWindow?: Readonly<{ from?: string; to?: string; timezone?: string }>;
  threshold?: Readonly<{ metricKey: string; operator: Extract<AutomationConditionOperator, "gte" | "lte" | "between">; value: number; max?: number }>;
  customConditionKey?: string;
  negate?: boolean;
}>;

export type AutomationAction = Readonly<{
  key: string;
  type: AutomationActionType;
  label: string;
  requiredPermission?: PermissionKey | string;
  documentType?: string;
  notificationTemplateKey?: string;
  jobKey?: string;
  reportKey?: string;
  exportKey?: string;
  webhookKey?: string;
  connectorKey?: string;
  approvalPolicyKey?: string;
  workflowKey?: string;
  aiActionKey?: string;
  inputMapping?: Readonly<Record<string, string>>;
  idempotencyKeyTemplate?: string;
  timeoutSeconds?: number;
}>;

export type AutomationPolicy = Readonly<{
  key: string;
  maxRunsPerHour?: number;
  maxActionsPerRun?: number;
  requireHumanApproval: boolean;
  allowParallelRuns: boolean;
  retryPolicy?: RetryPolicy;
  cancellable: boolean;
  deadLetterEnabled: boolean;
  dataAccess: AutomationSecurityMetadata;
}>;

export type AutomationDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  providerSource: AutomationProviderSource;
  status: AutomationStatus;
  scope: AutomationScope;
  trigger: AutomationTrigger;
  triggers?: readonly AutomationTrigger[];
  conditions: readonly AutomationCondition[];
  actions: readonly AutomationAction[];
  policy: AutomationPolicy;
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  requiresApproval?: boolean;
  isEnabledByDefault: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type AutomationRun = Readonly<{
  id: string;
  automationKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  status: AutomationRunStatus;
  idempotencyKey: string;
  triggerKey: string;
  actionCount: number;
  progress?: number;
  retryCount?: number;
  cancellationReason?: string | null;
  deadLetterReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number;
}>;

export type AutomationRunResult = Readonly<{
  runId: string;
  automationKey: string;
  status: AutomationRunStatus;
  outcome: "succeeded" | "failed" | "cancelled" | "blocked";
  actionResults: readonly Readonly<{
    actionKey: string;
    status: "pending" | "succeeded" | "failed" | "skipped";
    errorMessage?: string;
  }>[];
  durationMs?: number;
  errorMessage?: string;
}>;

export type AutomationContext = Readonly<{
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
  sourceEngine?: "automation" | "workflow" | "background-job" | "import-export" | "reporting" | "printing" | "dashboard" | "notification" | "ai";
  triggerSource: AutomationTriggerType | "ai-action";
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  entitlementKeys?: ReadonlySet<string>;
  featureFlagKeys?: ReadonlySet<string>;
}>;

export type AiContextPolicy = Readonly<{
  allowedExperiences: readonly AccessExperience[];
  allowedAppKeys: readonly string[];
  includeSensitiveData: boolean;
  requiresHumanApproval: boolean;
  retentionPolicy: "none" | "short" | "standard";
}>;

export type AiPromptTemplate = Readonly<{
  key: string;
  label: string;
  template: string;
  variables: readonly Readonly<{
    key: string;
    required: boolean;
    sensitive?: boolean;
    pii?: boolean;
  }>[];
  promptLoggingPolicy: AiLoggingPolicy;
  responseLoggingPolicy: AiLoggingPolicy;
}>;

export type AiModelPolicy = Readonly<{
  allowedModelKeys: readonly string[];
  deniedModelKeys?: readonly string[];
  maxTokens: number;
  maxCost: number;
  currency: string;
  confidenceThreshold?: number;
}>;

export type AiToolPolicy = Readonly<{
  allowedTools: readonly string[];
  deniedTools: readonly string[];
  allowExternalCalls: boolean;
  allowConnectorCalls: boolean;
}>;

export type AiDataAccessPolicy = Readonly<{
  allowedDataScopes: readonly string[];
  sensitiveDataAllowed: boolean;
  piiAllowed: boolean;
  exportRestrictions: readonly ("no-export" | "masked-only" | "no-external-share")[];
  allowedAppKeys: readonly string[];
}>;

export type AiSafetyPolicy = Readonly<{
  key: string;
  riskLevel: AiSafetyRiskLevel;
  humanApprovalRequired: boolean;
  confidenceThreshold?: number;
  promptLoggingPolicy: AiLoggingPolicy;
  responseLoggingPolicy: AiLoggingPolicy;
  blockSensitiveData: boolean;
  blockPii: boolean;
  allowedTools: readonly string[];
  deniedTools: readonly string[];
}>;

export type AiUsageLimit = Readonly<{
  maxRunsPerUserPerDay?: number;
  maxRunsPerTenantPerDay?: number;
  maxTokensPerRun?: number;
  maxCostPerRun?: number;
  maxCostPerTenantPerDay?: number;
  currency: string;
}>;

export type AiActionPolicy = Readonly<{
  key: string;
  contextPolicy: AiContextPolicy;
  modelPolicy: AiModelPolicy;
  toolPolicy: AiToolPolicy;
  dataAccessPolicy: AiDataAccessPolicy;
  safetyPolicy: AiSafetyPolicy;
  usageLimit: AiUsageLimit;
}>;

export type AiActionDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  mode: AiExecutionMode;
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  providerSource: AutomationProviderSource;
  promptTemplate: AiPromptTemplate;
  policy: AiActionPolicy;
  contextPolicy: AiContextPolicy;
  auditRequired: boolean;
}>;

export type AiActionRun = Readonly<{
  id: string;
  aiActionKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  status: AutomationRunStatus;
  idempotencyKey: string;
  progress?: number;
  retryCount?: number;
  tokenUsage?: Readonly<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  cost?: Readonly<{
    amount: number;
    currency: string;
  }>;
  confidence?: number;
  durationMs?: number;
}>;

export type AiActionResult = Readonly<{
  runId: string;
  aiActionKey: string;
  outcome: AiActionOutcome;
  requiresHumanApproval: boolean;
  confidence?: number;
  tokenUsage?: AiActionRun["tokenUsage"];
  cost?: AiActionRun["cost"];
  errorMessage?: string;
}>;

export type AiAuditMetadata = Readonly<{
  aiActionKey: string;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: AutomationContext["sourceEngine"];
  triggerSource: AutomationContext["triggerSource"];
  outcome: AiActionOutcome;
  tokenUsage?: AiActionRun["tokenUsage"];
  cost?: AiActionRun["cost"];
  durationMs?: number;
}>;

export type AutomationRegistry = Readonly<{
  automations: readonly AutomationDefinition[];
}>;

export type AiActionRegistry = Readonly<{
  aiActions: readonly AiActionDefinition[];
}>;

export type AutomationValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type AutomationEventIntegrationContract = Readonly<{
  automationKey: string;
  triggerKey: string;
  eventName: PlatformEventName | string;
  source: AutomationTrigger["sourceEngine"];
  requiresSubscription: true;
}>;

export type AutomationJobReadiness = Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  runKey: string;
  requiresBackgroundExecution: true;
  retryable: boolean;
  cancellable: boolean;
  deadLetterEnabled: boolean;
  progressTracking: true;
}>;

export function defineAutomation<TDefinition extends AutomationDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateAutomationDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function defineAiAction<TDefinition extends AiActionDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateAiActionDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validateAutomationDefinition(definition: AutomationDefinition): AutomationValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Automation definition key is required.");
  }

  if (!definition.appKey.trim()) {
    errors.push("Automation definition app key is required.");
  }

  if (!definition.label.trim()) {
    errors.push("Automation definition label is required.");
  }

  if (collectAutomationPermissions(definition).length === 0) {
    errors.push("Automation definition requires at least one permission.");
  }

  errors.push(...validateAutomationTrigger(definition.trigger).errors);

  for (const trigger of definition.triggers ?? []) {
    errors.push(...validateAutomationTrigger(trigger).errors);
  }

  errors.push(...validateAutomationConditions(definition.conditions).errors);
  errors.push(...validateAutomationActions(definition.actions).errors);
  errors.push(...validateAutomationPolicy(definition.policy).errors);

  if (definition.actions.length === 0) {
    errors.push("Automation definition requires at least one action.");
  }

  for (const duplicate of findDuplicates([definition.trigger, ...(definition.triggers ?? [])].map((trigger) => trigger.key))) {
    errors.push(`Duplicate automation trigger: ${duplicate}`);
  }

  return toValidationResult(errors);
}

export function validateAutomationTrigger(trigger: AutomationTrigger): AutomationValidationResult {
  const errors: string[] = [];

  if (!trigger.key.trim()) {
    errors.push("Automation trigger key is required.");
  }

  if ((trigger.type === "event" || trigger.type === "document-lifecycle" || trigger.type === "workflow" || trigger.type === "approval" || trigger.type === "import-export" || trigger.type === "report" || trigger.type === "background-job" || trigger.type === "search-index") && !trigger.eventName) {
    errors.push(`Automation trigger ${trigger.key} requires an event name.`);
  }

  if (trigger.type === "schedule" && !trigger.schedule) {
    errors.push(`Automation trigger ${trigger.key} requires a schedule.`);
  }

  if (trigger.type === "manual" && !trigger.commandKey) {
    errors.push(`Automation trigger ${trigger.key} requires a command key.`);
  }

  if (trigger.type === "webhook" && !trigger.webhookKey) {
    errors.push(`Automation trigger ${trigger.key} requires a webhook key.`);
  }

  if (trigger.schedule) {
    errors.push(...validateAutomationSchedule(trigger.schedule, trigger.key).errors);
  }

  return toValidationResult(errors);
}

export function validateAutomationSchedule(schedule: AutomationSchedule, triggerKey = "schedule"): AutomationValidationResult {
  const errors: string[] = [];

  if (schedule.kind === "once" && !schedule.runAt) {
    errors.push(`Automation schedule ${triggerKey} requires runAt.`);
  }

  if (schedule.kind === "recurring" && !schedule.cron) {
    errors.push(`Automation schedule ${triggerKey} requires cron.`);
  }

  if (schedule.kind === "interval" && (schedule.intervalSeconds ?? 0) < 1) {
    errors.push(`Automation schedule ${triggerKey} requires intervalSeconds of at least 1.`);
  }

  return toValidationResult(errors);
}

export function validateAutomationConditions(conditions: readonly AutomationCondition[]): AutomationValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(conditions.map((condition) => condition.key))) {
    errors.push(`Duplicate automation condition: ${duplicate}`);
  }

  for (const condition of conditions) {
    if (!condition.key.trim()) {
      errors.push("Automation condition key is required.");
    }

    if ((condition.type === "field" || condition.type === "status") && !condition.fieldKey && !condition.status) {
      errors.push(`Automation condition ${condition.key} requires a field key or status.`);
    }

    if (condition.type === "permission" && !condition.requiredPermission) {
      errors.push(`Automation condition ${condition.key} requires a permission.`);
    }

    if (condition.type === "entitlement" && !condition.entitlementKey) {
      errors.push(`Automation condition ${condition.key} requires an entitlement.`);
    }

    if (condition.type === "data-scope" && !condition.dataScopeKey) {
      errors.push(`Automation condition ${condition.key} requires a data scope.`);
    }

    if (condition.type === "threshold" && !condition.threshold) {
      errors.push(`Automation condition ${condition.key} requires threshold metadata.`);
    }

    if (condition.type === "custom" && !condition.customConditionKey) {
      errors.push(`Automation condition ${condition.key} requires a custom condition key.`);
    }
  }

  return toValidationResult(errors);
}

export function validateAutomationActions(actions: readonly AutomationAction[]): AutomationValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(actions.map((action) => action.key))) {
    errors.push(`Duplicate automation action: ${duplicate}`);
  }

  for (const action of actions) {
    if (!action.key.trim()) {
      errors.push("Automation action key is required.");
    }

    if (!action.label.trim()) {
      errors.push(`Automation action ${action.key} requires a label.`);
    }

    if ((action.type === "create-document" || action.type === "update-document") && !action.documentType) {
      errors.push(`Automation action ${action.key} requires a document type.`);
    }

    if (action.type === "send-notification" && !action.notificationTemplateKey) {
      errors.push(`Automation action ${action.key} requires a notification template key.`);
    }

    if (action.type === "queue-job" && !action.jobKey) {
      errors.push(`Automation action ${action.key} requires a job key.`);
    }

    if (action.type === "run-report" && !action.reportKey) {
      errors.push(`Automation action ${action.key} requires a report key.`);
    }

    if (action.type === "export-data" && !action.exportKey) {
      errors.push(`Automation action ${action.key} requires an export key.`);
    }

    if (action.type === "call-webhook" && !action.webhookKey) {
      errors.push(`Automation action ${action.key} requires a webhook key.`);
    }

    if (action.type === "call-connector" && !action.connectorKey) {
      errors.push(`Automation action ${action.key} requires a connector key.`);
    }

    if (action.type === "request-approval" && !action.approvalPolicyKey) {
      errors.push(`Automation action ${action.key} requires an approval policy key.`);
    }

    if (action.type === "trigger-workflow" && !action.workflowKey) {
      errors.push(`Automation action ${action.key} requires a workflow key.`);
    }

    if (action.type === "ai-action" && !action.aiActionKey) {
      errors.push(`Automation action ${action.key} requires an AI action key.`);
    }
  }

  return toValidationResult(errors);
}

export function validateAutomationPolicy(policy: AutomationPolicy): AutomationValidationResult {
  const errors: string[] = [];

  if (!policy.key.trim()) {
    errors.push("Automation policy key is required.");
  }

  if ((policy.maxRunsPerHour ?? 1) < 1) {
    errors.push("Automation policy maxRunsPerHour must be at least 1.");
  }

  if ((policy.maxActionsPerRun ?? 1) < 1) {
    errors.push("Automation policy maxActionsPerRun must be at least 1.");
  }

  if (policy.retryPolicy && policy.retryPolicy.maxAttempts < 1) {
    errors.push("Automation policy retry maxAttempts must be at least 1.");
  }

  if (policy.dataAccess.requiredPermissions.length === 0) {
    errors.push("Automation policy requires at least one permission.");
  }

  return toValidationResult(errors);
}

export function validateAiActionDefinition(definition: AiActionDefinition): AutomationValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("AI action key is required.");
  }

  if (!definition.appKey.trim()) {
    errors.push("AI action app key is required.");
  }

  if (!definition.label.trim()) {
    errors.push("AI action label is required.");
  }

  if (collectAiActionPermissions(definition).length === 0) {
    errors.push("AI action requires at least one permission.");
  }

  if (definition.mode === "execute" && !definition.contextPolicy.requiresHumanApproval) {
    errors.push("Executable AI actions require an explicit human-approval policy.");
  }

  if (definition.contextPolicy.includeSensitiveData && definition.contextPolicy.retentionPolicy !== "none") {
    errors.push("Sensitive AI contexts cannot be retained by default.");
  }

  errors.push(...validateAiGovernancePolicy(definition.policy).errors);
  errors.push(...validateAiPromptTemplate(definition.promptTemplate).errors);

  return toValidationResult(errors);
}

export function validateAiGovernancePolicy(policy: AiActionPolicy): AutomationValidationResult {
  const errors: string[] = [];

  if (!policy.key.trim()) {
    errors.push("AI action policy key is required.");
  }

  if (policy.modelPolicy.allowedModelKeys.length === 0) {
    errors.push("AI model policy requires at least one allowed model.");
  }

  if (policy.modelPolicy.maxTokens < 1) {
    errors.push("AI model policy maxTokens must be at least 1.");
  }

  if (policy.modelPolicy.maxCost < 0) {
    errors.push("AI model policy maxCost cannot be negative.");
  }

  if (policy.dataAccessPolicy.allowedDataScopes.length === 0) {
    errors.push("AI data access policy requires at least one data scope.");
  }

  errors.push(...validateAiSafetyPolicy(policy.safetyPolicy).errors);

  if ((policy.usageLimit.maxTokensPerRun ?? 1) < 1) {
    errors.push("AI usage limit maxTokensPerRun must be at least 1.");
  }

  if ((policy.usageLimit.maxCostPerRun ?? 0) < 0) {
    errors.push("AI usage limit maxCostPerRun cannot be negative.");
  }

  return toValidationResult(errors);
}

export function validateAiSafetyPolicy(policy: AiSafetyPolicy): AutomationValidationResult {
  const errors: string[] = [];

  if (!policy.key.trim()) {
    errors.push("AI safety policy key is required.");
  }

  if ((policy.confidenceThreshold ?? 0) < 0 || (policy.confidenceThreshold ?? 1) > 1) {
    errors.push("AI safety policy confidenceThreshold must be between 0 and 1.");
  }

  const deniedAllowedOverlap = policy.allowedTools.filter((tool) => policy.deniedTools.includes(tool));
  for (const tool of deniedAllowedOverlap) {
    errors.push(`AI safety policy cannot both allow and deny tool: ${tool}`);
  }

  if (policy.riskLevel === "critical" && !policy.humanApprovalRequired) {
    errors.push("Critical AI safety policies require human approval.");
  }

  return toValidationResult(errors);
}

export function validateAiPromptTemplate(template: AiPromptTemplate): AutomationValidationResult {
  const errors: string[] = [];

  if (!template.key.trim()) {
    errors.push("AI prompt template key is required.");
  }

  if (!template.template.trim()) {
    errors.push("AI prompt template body is required.");
  }

  for (const duplicate of findDuplicates(template.variables.map((variable) => variable.key))) {
    errors.push(`Duplicate AI prompt variable: ${duplicate}`);
  }

  return toValidationResult(errors);
}

export function createAutomationRegistry(automations: readonly AutomationDefinition[] = []): AutomationRegistry {
  return {
    automations: dedupeByKey(automations),
  };
}

export function registerAutomation(registry: AutomationRegistry, definition: AutomationDefinition): AutomationRegistry {
  defineAutomation(definition);

  return createAutomationRegistry([
    ...registry.automations.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function createAiActionRegistry(aiActions: readonly AiActionDefinition[] = []): AiActionRegistry {
  return {
    aiActions: dedupeByKey(aiActions),
  };
}

export function registerAiAction(registry: AiActionRegistry, definition: AiActionDefinition): AiActionRegistry {
  defineAiAction(definition);

  return createAiActionRegistry([
    ...registry.aiActions.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function canRunAutomation(definition: AutomationDefinition, context: AutomationContext): boolean {
  return canAccessSecurity(definition.policy.dataAccess, collectAutomationPermissions(definition), context);
}

export function canRunAiAction(definition: AiActionDefinition, context: AutomationContext): boolean {
  const requiredScopes = definition.policy.dataAccessPolicy.allowedDataScopes;
  const hasDataScopes = requiredScopes.every((scope) => context.dataScopeKeys?.has(scope));

  return collectAiActionPermissions(definition).every((permission) => context.grantedPermissions?.has(permission))
    && hasDataScopes
    && definition.policy.contextPolicy.allowedExperiences.includes(context.experience ?? "erp")
    && definition.policy.contextPolicy.allowedAppKeys.includes(context.sourceApp ?? definition.appKey);
}

export function createAutomationRun(input: AutomationRun): AutomationRun {
  return input;
}

export function createAutomationRunResult(input: AutomationRunResult): AutomationRunResult {
  return input;
}

export function createAiActionRun(input: AiActionRun): AiActionRun {
  return input;
}

export function createAiActionResult(input: AiActionResult): AiActionResult {
  return input;
}

export function createAutomationEventIntegrationContract(
  automation: AutomationDefinition,
  trigger: AutomationTrigger = automation.trigger,
): AutomationEventIntegrationContract {
  return {
    automationKey: automation.key,
    eventName: trigger.eventName ?? `${trigger.type}:manual`,
    requiresSubscription: true,
    source: trigger.sourceEngine ?? trigger.type,
    triggerKey: trigger.key,
  };
}

export function createAutomationJobReadinessContract(automation: AutomationDefinition): AutomationJobReadiness {
  return {
    cancellable: automation.policy.cancellable,
    deadLetterEnabled: automation.policy.deadLetterEnabled,
    integration: "automation",
    jobKey: `automation.${automation.key}.run`,
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: Boolean(automation.policy.retryPolicy && automation.policy.retryPolicy.maxAttempts > 1),
    runKey: automation.key,
  };
}

export function createAiActionJobReadinessContract(action: AiActionDefinition): AutomationJobReadiness {
  return {
    cancellable: true,
    deadLetterEnabled: true,
    integration: "ai-task",
    jobKey: `ai.${action.key}.run`,
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
    runKey: action.key,
  };
}

export function createAutomationSecurityMetadata(
  automation: AutomationDefinition,
  context: AutomationContext,
): Readonly<{
  automationKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  dataScopes: readonly string[];
  entitlements: readonly string[];
  featureFlags: readonly string[];
  sensitiveData: boolean;
  humanApprovalRequired: boolean;
  temporaryElevationAllowed: boolean;
  auditRequired: boolean;
}> {
  return {
    auditRequired: automation.policy.dataAccess.auditRequired,
    automationKey: automation.key,
    branchId: context.branchId,
    companyId: context.companyId,
    dataScopes: automation.policy.dataAccess.requiredDataScopes ?? [],
    entitlements: automation.policy.dataAccess.requiredEntitlements ?? [],
    featureFlags: automation.policy.dataAccess.featureFlagKeys ?? [],
    humanApprovalRequired: automation.policy.requireHumanApproval || automation.policy.dataAccess.humanApprovalRequired,
    requiredPermissions: collectAutomationPermissions(automation).map(String),
    sensitiveData: automation.policy.dataAccess.sensitiveData,
    temporaryElevationAllowed: automation.policy.dataAccess.temporaryElevationAllowed,
    tenantId: context.tenantId,
  };
}

export function createAiSecurityMetadata(
  action: AiActionDefinition,
  context: AutomationContext,
): Readonly<{
  aiActionKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  allowedDataScopes: readonly string[];
  sensitiveDataAllowed: boolean;
  piiAllowed: boolean;
  exportRestrictions: readonly string[];
  humanApprovalRequired: boolean;
  temporaryElevationAllowed: false;
  auditRequired: boolean;
}> {
  return {
    aiActionKey: action.key,
    allowedDataScopes: action.policy.dataAccessPolicy.allowedDataScopes,
    auditRequired: action.auditRequired,
    branchId: context.branchId,
    companyId: context.companyId,
    exportRestrictions: action.policy.dataAccessPolicy.exportRestrictions,
    humanApprovalRequired: action.policy.safetyPolicy.humanApprovalRequired || action.contextPolicy.requiresHumanApproval,
    piiAllowed: action.policy.dataAccessPolicy.piiAllowed,
    requiredPermissions: collectAiActionPermissions(action).map(String),
    sensitiveDataAllowed: action.policy.dataAccessPolicy.sensitiveDataAllowed,
    temporaryElevationAllowed: false,
    tenantId: context.tenantId,
  };
}

export function createAutomationAuditMetadata(
  result: AutomationRunResult,
  context: AutomationContext,
): Readonly<{
  action: AuditAction;
  automationKey: string;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: AutomationContext["sourceEngine"];
  triggerSource: AutomationContext["triggerSource"];
  actionCount: number;
  durationMs?: number;
  outcome: AutomationRunResult["outcome"];
}> {
  return {
    action: `automation.${result.outcome}` as AuditAction,
    actionCount: result.actionResults.length,
    actorId: context.actorId,
    automationKey: result.automationKey,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    outcome: result.outcome,
    principalId: context.principalId,
    sourceApp: context.sourceApp,
    sourceEngine: context.sourceEngine ?? "automation",
    tenantId: context.tenantId,
    triggerSource: context.triggerSource,
  };
}

export function createAiAuditMetadata(
  result: AiActionResult,
  context: AutomationContext,
  durationMs?: number,
): AiAuditMetadata {
  return {
    aiActionKey: result.aiActionKey,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    cost: result.cost,
    durationMs,
    outcome: result.outcome,
    principalId: context.principalId,
    sourceApp: context.sourceApp,
    sourceEngine: context.sourceEngine ?? "ai",
    tenantId: context.tenantId,
    tokenUsage: result.tokenUsage,
    triggerSource: context.triggerSource,
  };
}

export function createAutomationTelemetryMetadata(
  result: AutomationRunResult,
  context: AutomationContext,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  triggerSource: AutomationContext["triggerSource"];
  actionCount: number;
  durationMs?: number;
  outcome: AutomationRunResult["outcome"];
}> {
  return {
    actionCount: result.actionResults.length,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    outcome: result.outcome,
    requestId: context.requestId,
    sourceKey: result.automationKey,
    tenantId: context.tenantId,
    triggerSource: context.triggerSource,
  };
}

export function createAiTelemetryMetadata(
  result: AiActionResult,
  context: AutomationContext,
  durationMs?: number,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  triggerSource: AutomationContext["triggerSource"];
  outcome: AiActionOutcome;
  tokenUsage?: AiActionRun["tokenUsage"];
  cost?: AiActionRun["cost"];
  durationMs?: number;
}> {
  return {
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    cost: result.cost,
    durationMs,
    outcome: result.outcome,
    requestId: context.requestId,
    sourceKey: result.aiActionKey,
    tenantId: context.tenantId,
    tokenUsage: result.tokenUsage,
    triggerSource: context.triggerSource,
  };
}

function collectAutomationPermissions(definition: AutomationDefinition): readonly (PermissionKey | string)[] {
  return [...new Set([
    definition.requiredPermission,
    ...(definition.requiredPermissions ?? []),
    ...definition.policy.dataAccess.requiredPermissions,
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function collectAiActionPermissions(definition: AiActionDefinition): readonly (PermissionKey | string)[] {
  return [...new Set([
    definition.requiredPermission,
    ...(definition.requiredPermissions ?? []),
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function canAccessSecurity(
  security: AutomationSecurityMetadata,
  permissions: readonly (PermissionKey | string)[],
  context: AutomationContext,
): boolean {
  const hasPermissions = permissions.every((permission) => context.grantedPermissions?.has(permission));
  const hasDataScopes = (security.requiredDataScopes ?? []).every((scope) => context.dataScopeKeys?.has(scope));
  const hasEntitlements = (security.requiredEntitlements ?? []).every((entitlement) => context.entitlementKeys?.has(entitlement));
  const hasFeatureFlags = (security.featureFlagKeys ?? []).every((flag) => context.featureFlagKeys?.has(flag));

  return hasPermissions
    && hasDataScopes
    && hasEntitlements
    && hasFeatureFlags
    && (!security.tenantAware || Boolean(context.tenantId))
    && (!security.companyAware || Boolean(context.companyId))
    && (!security.branchAware || Boolean(context.branchId));
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

function toValidationResult(errors: readonly string[]): AutomationValidationResult {
  return {
    errors,
    valid: errors.length === 0,
  };
}
