import assert from "node:assert/strict";
import test from "node:test";

import {
  canRunAiAction,
  canRunAutomation,
  createAiActionJobReadinessContract,
  createAiActionRegistry,
  createAiActionResult,
  createAiAuditMetadata,
  createAiSecurityMetadata,
  createAiTelemetryMetadata,
  createAutomationAuditMetadata,
  createAutomationEventIntegrationContract,
  createAutomationJobReadinessContract,
  createAutomationRegistry,
  createAutomationRunResult,
  createAutomationSecurityMetadata,
  createAutomationTelemetryMetadata,
  defineAiAction,
  defineAutomation,
  definePermissionKey,
  definePlatformEventName,
  registerAiAction,
  registerAutomation,
  validateAiActionDefinition,
  validateAiGovernancePolicy,
  validateAiSafetyPolicy,
  validateAutomationActions,
  validateAutomationConditions,
  validateAutomationDefinition,
  validateAutomationPolicy,
  validateAutomationTrigger,
  type AiActionDefinition,
  type AiActionPolicy,
  type AutomationAction,
  type AutomationCondition,
  type AutomationContext,
  type AutomationDefinition,
  type AutomationTrigger,
} from "@/platform/public-api";

const automationPermission = definePermissionKey("platform.automation.run");
const aiPermission = definePermissionKey("platform.ai.run");
const documentCreated = definePlatformEventName("DocumentCreated");
const workflowCompleted = definePlatformEventName("WorkflowCompleted");

const automationSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  featureFlagKeys: ["automation.enabled"],
  humanApprovalRequired: true,
  requiredDataScopes: ["tenant", "company"],
  requiredEntitlements: ["automation"],
  requiredPermissions: [automationPermission],
  sensitiveData: true,
  temporaryElevationAllowed: false,
  tenantAware: true,
} as const;

const trigger: AutomationTrigger = {
  enabled: true,
  eventName: documentCreated,
  key: "document-created",
  sourceEngine: "document-lifecycle",
  type: "document-lifecycle",
};

const conditions: readonly AutomationCondition[] = [
  {
    fieldKey: "status",
    key: "status-is-posted",
    operator: "equals",
    type: "field",
    value: "posted",
  },
  {
    key: "has-permission",
    requiredPermission: automationPermission,
    type: "permission",
  },
  {
    dataScopeKey: "company",
    key: "company-scope",
    type: "data-scope",
  },
  {
    entitlementKey: "automation",
    key: "automation-entitlement",
    type: "entitlement",
  },
  {
    key: "business-hours",
    timeWindow: { from: "08:00", timezone: "Asia/Riyadh", to: "18:00" },
    type: "time",
  },
  {
    key: "threshold",
    threshold: { metricKey: "amount", operator: "gte", value: 100 },
    type: "threshold",
  },
  {
    customConditionKey: "platform.custom-condition",
    key: "custom-condition",
    type: "custom",
  },
];

const actions: readonly AutomationAction[] = [
  {
    documentType: "platform.document",
    key: "create-document",
    label: "Create Document",
    type: "create-document",
  },
  {
    key: "notify",
    label: "Notify",
    notificationTemplateKey: "platform.notification",
    type: "send-notification",
  },
  {
    jobKey: "platform.job",
    key: "queue-job",
    label: "Queue Job",
    type: "queue-job",
  },
  {
    exportKey: "platform.export",
    key: "export-data",
    label: "Export Data",
    type: "export-data",
  },
  {
    aiActionKey: "platform.ai.summarize",
    key: "ai-action",
    label: "AI Action",
    type: "ai-action",
  },
];

const automation = defineAutomation({
  actions,
  appKey: "platform",
  conditions,
  isEnabledByDefault: false,
  key: "platform.document-automation",
  label: "Platform Document Automation",
  metadata: { platformOnly: true },
  policy: {
    allowParallelRuns: false,
    cancellable: true,
    dataAccess: automationSecurity,
    deadLetterEnabled: true,
    key: "platform.automation-policy",
    maxActionsPerRun: 10,
    maxRunsPerHour: 25,
    requireHumanApproval: true,
    retryPolicy: {
      cancellable: true,
      delaySeconds: 30,
      maxAttempts: 3,
      strategy: "fixed",
      timeoutSeconds: 300,
    },
  },
  providerSource: "platform-engine",
  requiredPermission: automationPermission,
  requiresApproval: true,
  scope: "company",
  status: "active",
  trigger,
  triggers: [
    {
      enabled: true,
      eventName: workflowCompleted,
      key: "workflow-completed",
      sourceEngine: "workflow",
      type: "workflow",
    },
  ],
} satisfies AutomationDefinition);

const aiPolicy: AiActionPolicy = {
  contextPolicy: {
    allowedAppKeys: ["platform"],
    allowedExperiences: ["erp"],
    includeSensitiveData: false,
    requiresHumanApproval: true,
    retentionPolicy: "standard",
  },
  dataAccessPolicy: {
    allowedAppKeys: ["platform"],
    allowedDataScopes: ["tenant", "company"],
    exportRestrictions: ["masked-only", "no-external-share"],
    piiAllowed: false,
    sensitiveDataAllowed: false,
  },
  key: "platform.ai-policy",
  modelPolicy: {
    allowedModelKeys: ["governed-model"],
    currency: "USD",
    confidenceThreshold: 0.8,
    maxCost: 1,
    maxTokens: 2000,
  },
  safetyPolicy: {
    allowedTools: ["search.read"],
    blockPii: true,
    blockSensitiveData: true,
    confidenceThreshold: 0.8,
    deniedTools: ["webhook.call"],
    humanApprovalRequired: true,
    key: "platform.ai-safety",
    promptLoggingPolicy: "redacted",
    responseLoggingPolicy: "metadata-only",
    riskLevel: "high",
  },
  toolPolicy: {
    allowConnectorCalls: false,
    allowExternalCalls: false,
    allowedTools: ["search.read"],
    deniedTools: ["webhook.call"],
  },
  usageLimit: {
    currency: "USD",
    maxCostPerRun: 1,
    maxCostPerTenantPerDay: 100,
    maxRunsPerTenantPerDay: 1000,
    maxRunsPerUserPerDay: 20,
    maxTokensPerRun: 2000,
  },
};

const aiAction = defineAiAction({
  appKey: "platform",
  auditRequired: true,
  contextPolicy: aiPolicy.contextPolicy,
  key: "platform.ai.summarize",
  label: "Summarize Safely",
  mode: "draft",
  policy: aiPolicy,
  promptTemplate: {
    key: "platform.ai.prompt",
    label: "Prompt",
    promptLoggingPolicy: "redacted",
    responseLoggingPolicy: "metadata-only",
    template: "Summarize {{input}}",
    variables: [
      { key: "input", required: true, sensitive: true },
    ],
  },
  providerSource: "platform-engine",
  requiredPermission: aiPermission,
} satisfies AiActionDefinition);

const context: AutomationContext = {
  actorId: "user-1",
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:automation",
  dataScopeKeys: new Set(["tenant", "company"]),
  entitlementKeys: new Set(["automation"]),
  experience: "erp",
  featureFlagKeys: new Set(["automation.enabled"]),
  grantedPermissions: new Set([automationPermission, aiPermission]),
  principalId: "principal-1",
  requestId: "request-1",
  sourceApp: "platform",
  sourceEngine: "automation",
  tenantId: "tenant-1",
  triggerSource: "event",
};

test("automation definition validation registers event-driven governed automations", () => {
  const registry = registerAutomation(createAutomationRegistry(), automation);

  assert.deepEqual(registry.automations.map((item) => item.key), ["platform.document-automation"]);
  assert.deepEqual(validateAutomationDefinition(automation), {
    errors: [],
    valid: true,
  });
  assert.equal(canRunAutomation(automation, context), true);
  assert.equal(canRunAutomation(automation, { ...context, grantedPermissions: new Set() }), false);
});

test("trigger validation supports event, schedule, manual, webhook, lifecycle, workflow, approval, import/export, report, job, and search triggers", () => {
  const triggers: readonly AutomationTrigger[] = [
    { enabled: true, eventName: documentCreated, key: "event", type: "event" },
    { enabled: true, key: "schedule", schedule: { cron: "0 * * * *", kind: "recurring" }, type: "schedule" },
    { commandKey: "run-now", enabled: true, key: "manual", type: "manual" },
    { enabled: true, key: "webhook", type: "webhook", webhookKey: "platform.webhook" },
    { enabled: true, eventName: "DocumentUpdated", key: "document", type: "document-lifecycle" },
    { enabled: true, eventName: "WorkflowCompleted", key: "workflow", type: "workflow" },
    { enabled: true, eventName: "ApprovalGranted", key: "approval", type: "approval" },
    { enabled: true, eventName: "ImportCompleted", key: "import-export", type: "import-export" },
    { enabled: true, eventName: "ReportCompleted", key: "report", type: "report" },
    { enabled: true, eventName: "JobCompleted", key: "job", type: "background-job" },
    { enabled: true, eventName: "SearchIndexed", key: "search", type: "search-index" },
  ];

  assert.deepEqual(triggers.map((item) => validateAutomationTrigger(item).valid), [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ]);
  assert.deepEqual(validateAutomationTrigger({ enabled: true, key: "bad", type: "schedule" }), {
    errors: ["Automation trigger bad requires a schedule."],
    valid: false,
  });
});

test("condition validation supports provider-neutral condition contracts", () => {
  assert.deepEqual(validateAutomationConditions(conditions), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateAutomationConditions([
    { key: "permission", type: "permission" },
    { key: "entitlement", type: "entitlement" },
    { key: "scope", type: "data-scope" },
    { key: "threshold", type: "threshold" },
    { key: "custom", type: "custom" },
    { key: "custom", type: "custom" },
  ]), {
    errors: [
      "Duplicate automation condition: custom",
      "Automation condition permission requires a permission.",
      "Automation condition entitlement requires an entitlement.",
      "Automation condition scope requires a data scope.",
      "Automation condition threshold requires threshold metadata.",
      "Automation condition custom requires a custom condition key.",
      "Automation condition custom requires a custom condition key.",
    ],
    valid: false,
  });
});

test("action validation supports future action contracts without execution", () => {
  const allActions: readonly AutomationAction[] = [
    ...actions,
    { documentType: "platform.document", key: "update", label: "Update", type: "update-document" },
    { key: "report", label: "Report", reportKey: "platform.report", type: "run-report" },
    { key: "webhook", label: "Webhook", type: "call-webhook", webhookKey: "platform.webhook" },
    { connectorKey: "platform.connector", key: "connector", label: "Connector", type: "call-connector" },
    { approvalPolicyKey: "platform.approval", key: "approval", label: "Approval", type: "request-approval" },
    { key: "workflow", label: "Workflow", type: "trigger-workflow", workflowKey: "platform.workflow" },
  ];

  assert.deepEqual(validateAutomationActions(allActions), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateAutomationActions([
    { key: "doc", label: "Doc", type: "create-document" },
    { key: "doc", label: "", type: "queue-job" },
    { key: "ai", label: "AI", type: "ai-action" },
  ]), {
    errors: [
      "Duplicate automation action: doc",
      "Automation action doc requires a document type.",
      "Automation action doc requires a label.",
      "Automation action doc requires a job key.",
      "Automation action ai requires an AI action key.",
    ],
    valid: false,
  });
});

test("automation policy validation enforces approval, retry, dead-letter, permissions, and data access", () => {
  assert.deepEqual(validateAutomationPolicy(automation.policy), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateAutomationPolicy({
    ...automation.policy,
    dataAccess: { ...automationSecurity, requiredPermissions: [] },
    key: "",
    maxActionsPerRun: 0,
    maxRunsPerHour: 0,
    retryPolicy: { ...automation.policy.retryPolicy!, maxAttempts: 0 },
  }), {
    errors: [
      "Automation policy key is required.",
      "Automation policy maxRunsPerHour must be at least 1.",
      "Automation policy maxActionsPerRun must be at least 1.",
      "Automation policy retry maxAttempts must be at least 1.",
      "Automation policy requires at least one permission.",
    ],
    valid: false,
  });
});

test("AI action definition validation enforces governed prompt, policy, permission, and approval contracts", () => {
  const registry = registerAiAction(createAiActionRegistry(), aiAction);

  assert.deepEqual(registry.aiActions.map((item) => item.key), ["platform.ai.summarize"]);
  assert.deepEqual(validateAiActionDefinition(aiAction), {
    errors: [],
    valid: true,
  });
  assert.equal(canRunAiAction(aiAction, context), true);
  assert.deepEqual(validateAiActionDefinition({
    ...aiAction,
    appKey: "",
    contextPolicy: {
      ...aiAction.contextPolicy,
      includeSensitiveData: true,
      requiresHumanApproval: false,
      retentionPolicy: "standard",
    },
    key: "",
    label: "",
    mode: "execute",
    requiredPermission: undefined,
    requiredPermissions: [],
  }), {
    errors: [
      "AI action key is required.",
      "AI action app key is required.",
      "AI action label is required.",
      "AI action requires at least one permission.",
      "Executable AI actions require an explicit human-approval policy.",
      "Sensitive AI contexts cannot be retained by default.",
    ],
    valid: false,
  });
});

test("AI governance and safety policies validate data access, tools, tokens, cost, logging, and confidence", () => {
  assert.deepEqual(validateAiGovernancePolicy(aiPolicy), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateAiSafetyPolicy(aiPolicy.safetyPolicy), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateAiGovernancePolicy({
    ...aiPolicy,
    dataAccessPolicy: { ...aiPolicy.dataAccessPolicy, allowedDataScopes: [] },
    key: "",
    modelPolicy: { ...aiPolicy.modelPolicy, allowedModelKeys: [], maxCost: -1, maxTokens: 0 },
    safetyPolicy: {
      ...aiPolicy.safetyPolicy,
      allowedTools: ["tool"],
      confidenceThreshold: 2,
      deniedTools: ["tool"],
      humanApprovalRequired: false,
      riskLevel: "critical",
    },
    usageLimit: { ...aiPolicy.usageLimit, maxCostPerRun: -1, maxTokensPerRun: 0 },
  }), {
    errors: [
      "AI action policy key is required.",
      "AI model policy requires at least one allowed model.",
      "AI model policy maxTokens must be at least 1.",
      "AI model policy maxCost cannot be negative.",
      "AI data access policy requires at least one data scope.",
      "AI safety policy confidenceThreshold must be between 0 and 1.",
      "AI safety policy cannot both allow and deny tool: tool",
      "Critical AI safety policies require human approval.",
      "AI usage limit maxTokensPerRun must be at least 1.",
      "AI usage limit maxCostPerRun cannot be negative.",
    ],
    valid: false,
  });
});

test("event integration contracts prepare Event Bus subscriptions without subscribers", () => {
  assert.deepEqual(createAutomationEventIntegrationContract(automation), {
    automationKey: "platform.document-automation",
    eventName: "DocumentCreated",
    requiresSubscription: true,
    source: "document-lifecycle",
    triggerKey: "document-created",
  });
});

test("background-job readiness prepares queued automation and AI action runs", () => {
  assert.deepEqual(createAutomationJobReadinessContract(automation), {
    cancellable: true,
    deadLetterEnabled: true,
    integration: "automation",
    jobKey: "automation.platform.document-automation.run",
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
    runKey: "platform.document-automation",
  });
  assert.deepEqual(createAiActionJobReadinessContract(aiAction), {
    cancellable: true,
    deadLetterEnabled: true,
    integration: "ai-task",
    jobKey: "ai.platform.ai.summarize.run",
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
    runKey: "platform.ai.summarize",
  });
});

test("security metadata captures permissions, scopes, entitlements, flags, approvals, and temporary elevation rules", () => {
  assert.deepEqual(createAutomationSecurityMetadata(automation, context), {
    auditRequired: true,
    automationKey: "platform.document-automation",
    branchId: "branch-1",
    companyId: "company-1",
    dataScopes: ["tenant", "company"],
    entitlements: ["automation"],
    featureFlags: ["automation.enabled"],
    humanApprovalRequired: true,
    requiredPermissions: ["platform.automation.run"],
    sensitiveData: true,
    temporaryElevationAllowed: false,
    tenantId: "tenant-1",
  });
  assert.deepEqual(createAiSecurityMetadata(aiAction, context), {
    aiActionKey: "platform.ai.summarize",
    allowedDataScopes: ["tenant", "company"],
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    exportRestrictions: ["masked-only", "no-external-share"],
    humanApprovalRequired: true,
    piiAllowed: false,
    requiredPermissions: ["platform.ai.run"],
    sensitiveDataAllowed: false,
    temporaryElevationAllowed: false,
    tenantId: "tenant-1",
  });
});

test("audit and telemetry metadata expose correlation, actor, trigger, duration, outcome, tokens, and cost", () => {
  const automationResult = createAutomationRunResult({
    actionResults: [
      { actionKey: "notify", status: "succeeded" },
      { actionKey: "queue-job", status: "succeeded" },
    ],
    automationKey: automation.key,
    durationMs: 150,
    outcome: "succeeded",
    runId: "run-1",
    status: "succeeded",
  });
  const aiResult = createAiActionResult({
    aiActionKey: aiAction.key,
    confidence: 0.9,
    cost: { amount: 0.05, currency: "USD" },
    outcome: "requires-approval",
    requiresHumanApproval: true,
    runId: "ai-run-1",
    tokenUsage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
  });

  assert.deepEqual(createAutomationAuditMetadata(automationResult, context), {
    action: "automation.succeeded",
    actionCount: 2,
    actorId: "user-1",
    automationKey: "platform.document-automation",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:automation",
    durationMs: 150,
    outcome: "succeeded",
    principalId: "principal-1",
    sourceApp: "platform",
    sourceEngine: "automation",
    tenantId: "tenant-1",
    triggerSource: "event",
  });
  assert.deepEqual(createAiAuditMetadata(aiResult, context, 200), {
    aiActionKey: "platform.ai.summarize",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:automation",
    cost: { amount: 0.05, currency: "USD" },
    durationMs: 200,
    outcome: "requires-approval",
    principalId: "principal-1",
    sourceApp: "platform",
    sourceEngine: "automation",
    tenantId: "tenant-1",
    tokenUsage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
    triggerSource: "event",
  });
  assert.deepEqual(createAutomationTelemetryMetadata(automationResult, context), {
    actionCount: 2,
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:automation",
    durationMs: 150,
    outcome: "succeeded",
    requestId: "request-1",
    sourceKey: "platform.document-automation",
    tenantId: "tenant-1",
    triggerSource: "event",
  });
  assert.deepEqual(createAiTelemetryMetadata(aiResult, context, 200), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:automation",
    cost: { amount: 0.05, currency: "USD" },
    durationMs: 200,
    outcome: "requires-approval",
    requestId: "request-1",
    sourceKey: "platform.ai.summarize",
    tenantId: "tenant-1",
    tokenUsage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
    triggerSource: "event",
  });
});
