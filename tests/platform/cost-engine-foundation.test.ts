import assert from "node:assert/strict";
import test from "node:test";

import {
  COST_PLATFORM_EVENTS,
  canAccessCostDefinition,
  createCostAuditMetadata,
  createCostBreakdown,
  createCostDashboardIntegrationContract,
  createCostEventIntegrationContract,
  createCostExportIntegrationContract,
  createCostJobReadinessContract,
  createCostLayer,
  createCostRegistry,
  createCostReportIntegrationContract,
  createCostResult,
  createCostSearchIntegrationContract,
  createCostSecurityMetadata,
  createCostSnapshot,
  createCostTelemetryMetadata,
  createCostTrace,
  defineCostDefinition,
  definePermissionKey,
  registerCostDefinition,
  validateCostAllocationRules,
  validateCostCategories,
  validateCostCenters,
  validateCostDefinition,
  validateCostDrivers,
  validateCostObjects,
  type CostAllocationRule,
  type CostCategory,
  type CostCenter,
  type CostContext,
  type CostDefinition,
  type CostDriver,
  type CostObject,
} from "@/platform/public-api";

const permission = definePermissionKey("platform.cost.view");

const categories: readonly CostCategory[] = [
  { active: true, key: "material", label: "Material", type: "direct_material" },
  { active: true, key: "labor", label: "Labor", type: "direct_labor" },
  { active: true, key: "overhead", label: "Overhead", type: "manufacturing_overhead" },
  { active: true, key: "custom", label: "Custom", type: "custom" },
];

const centers: readonly CostCenter[] = [
  { active: true, key: "company", label: "Company", type: "company" },
  { active: true, key: "branch", label: "Branch", type: "branch" },
  { active: true, key: "department", label: "Department", type: "department" },
  { active: true, key: "line", label: "Production Line", type: "production_line" },
  { active: true, key: "work-center", label: "Work Center", type: "work_center" },
  { active: true, key: "warehouse", label: "Warehouse", type: "warehouse" },
  { active: true, key: "service", label: "Service Center", type: "service_center" },
  { active: true, key: "fleet", label: "Fleet", type: "fleet" },
  { active: true, key: "project", label: "Project", type: "project" },
  { active: true, key: "custom", label: "Custom", type: "custom" },
];

const objects: readonly CostObject[] = [
  { key: "product", label: "Product", type: "product" },
  { key: "variant", label: "Variant", type: "variant" },
  { key: "work-order", label: "Work Order", type: "work_order" },
  { key: "production-order", label: "Production Order", type: "production_order" },
  { key: "batch", label: "Batch", type: "batch" },
  { key: "inventory-item", label: "Inventory Item", type: "inventory_item" },
  { key: "warehouse", label: "Warehouse", type: "warehouse" },
  { key: "branch", label: "Branch", type: "branch" },
  { key: "employee", label: "Employee", type: "employee" },
  { key: "asset", label: "Asset", type: "asset" },
  { key: "vehicle", label: "Vehicle", type: "vehicle" },
  { key: "project", label: "Project", type: "project" },
  { key: "ticket", label: "Service Ticket", type: "service_ticket" },
  { key: "sales-order", label: "Sales Order", type: "sales_order" },
  { key: "customer", label: "Customer", type: "customer" },
  { key: "party", label: "Party", type: "party" },
  { key: "custom", label: "Custom", type: "custom" },
];

const drivers: readonly CostDriver[] = [
  { key: "quantity", label: "Quantity", required: true, unit: "quantity" },
  { key: "hours", label: "Hours", required: true, unit: "hours" },
  { key: "weight", label: "Weight", required: false, unit: "weight" },
  { key: "value", label: "Value", required: false, unit: "value" },
];

const allocationRules: readonly CostAllocationRule[] = [
  { driverKey: "quantity", key: "quantity-rule", label: "Quantity Rule", method: "quantity_based", targetCostObjectKeys: ["product"] },
  { driverKey: "hours", key: "labor-rule", label: "Labor Rule", method: "labor_hours", targetCostObjectKeys: ["work-order"] },
  { key: "percentage-rule", label: "Percentage Rule", method: "percentage", percentage: 50, targetCostObjectKeys: ["project"] },
  { key: "equal-rule", label: "Equal Rule", method: "equal_split", targetCostObjectKeys: ["branch", "warehouse"] },
  { formulaKey: "custom.formula", key: "formula-rule", label: "Formula Rule", method: "custom_formula", targetCostObjectKeys: ["custom"] },
];

const definition = defineCostDefinition({
  allocationRules,
  appKey: "platform",
  categories,
  centers,
  costTypes: [
    "direct_material",
    "direct_labor",
    "manufacturing_overhead",
    "logistics",
    "service",
    "payroll",
    "landed_cost",
    "indirect",
    "fixed",
    "variable",
    "semi_variable",
    "custom",
  ],
  drivers,
  key: "platform.cost-foundation",
  label: "Platform Cost Foundation",
  metadata: { platformOnly: true },
  objects,
  providerSource: "platform-engine",
  rates: [
    {
      costType: "direct_labor",
      currencyCode: "SAR",
      effectiveFrom: "2026-01-01",
      key: "labor-rate",
      rate: 100,
      unit: "hour",
      version: 1,
    },
  ],
  security: {
    approvalRequired: true,
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    exportRestrictions: ["approval-required", "masked-only"],
    requiredDataScopes: ["tenant", "company"],
    requiredPermissions: [permission],
    sensitiveFinancialData: true,
    tenantAware: true,
  },
} satisfies CostDefinition);

const context: CostContext = {
  actorId: "user-1",
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:cost",
  dataScopeKeys: new Set(["tenant", "company"]),
  experience: "erp",
  grantedPermissions: new Set([permission]),
  principalId: "principal-1",
  requestId: "request-1",
  sourceApp: "platform",
  sourceDocument: {
    sourceDocumentId: "doc-1",
    sourceDocumentType: "platform.document",
    sourceEngine: "document-engine",
  },
  sourceEngine: "cost-engine",
  tenantId: "tenant-1",
};

test("cost definition validation registers provider-neutral cost definitions", () => {
  const registry = registerCostDefinition(createCostRegistry(), definition);

  assert.deepEqual(registry.definitions.map((item) => item.key), ["platform.cost-foundation"]);
  assert.deepEqual(validateCostDefinition(definition), {
    errors: [],
    valid: true,
  });
  assert.equal(canAccessCostDefinition(definition, context), true);
  assert.equal(canAccessCostDefinition(definition, { ...context, grantedPermissions: new Set() }), false);
});

test("cost category validation covers foundational cost types", () => {
  assert.deepEqual(validateCostCategories(categories), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateCostCategories([
    { active: true, key: "x", label: "", type: "custom" },
    { active: true, key: "x", label: "Duplicate", type: "fixed" },
  ]), {
    errors: [
      "Duplicate cost category: x",
      "Cost category x requires a label.",
    ],
    valid: false,
  });
});

test("cost center, object, and driver contracts cover future app use cases", () => {
  assert.deepEqual(validateCostCenters(centers), { errors: [], valid: true });
  assert.deepEqual(validateCostObjects(objects), { errors: [], valid: true });
  assert.deepEqual(validateCostDrivers(drivers), { errors: [], valid: true });
  assert.deepEqual(validateCostCenters([{ active: true, key: "", label: "", type: "custom" }]), {
    errors: ["Cost center key is required.", "Cost center  requires a label."],
    valid: false,
  });
  assert.deepEqual(validateCostObjects([{ key: "", label: "", type: "custom" }]), {
    errors: ["Cost object key is required.", "Cost object  requires a label."],
    valid: false,
  });
  assert.deepEqual(validateCostDrivers([{ key: "", label: "", required: true, unit: "custom" }]), {
    errors: ["Cost driver key is required.", "Cost driver  requires a label."],
    valid: false,
  });
});

test("allocation rule contracts support all allocation methods without execution", () => {
  const methods = [
    "quantity_based",
    "time_based",
    "labor_hours",
    "machine_hours",
    "weight_based",
    "volume_based",
    "value_based",
    "percentage",
    "equal_split",
    "custom_formula",
  ] as const;

  assert.deepEqual(methods.map((method, index) => validateCostAllocationRules([
    {
      driverKey: method === "percentage" || method === "equal_split" || method === "custom_formula" ? undefined : "quantity",
      formulaKey: method === "custom_formula" ? "formula" : undefined,
      key: `rule-${index}`,
      label: method,
      method,
      percentage: method === "percentage" ? 25 : undefined,
      targetCostObjectKeys: ["product"],
    },
  ]).valid), methods.map(() => true));
  assert.deepEqual(validateCostAllocationRules([
    { key: "bad", label: "", method: "quantity_based", targetCostObjectKeys: [] },
    { key: "bad", label: "Bad", method: "percentage", percentage: 101, targetCostObjectKeys: ["product"] },
    { key: "formula", label: "Formula", method: "custom_formula", targetCostObjectKeys: ["product"] },
  ]), {
    errors: [
      "Duplicate cost allocation rule: bad",
      "Cost allocation rule bad requires a label.",
      "Cost allocation rule bad requires at least one target cost object.",
      "Cost allocation rule bad requires a cost driver.",
      "Cost allocation rule bad requires a percentage between 0 and 100.",
      "Cost allocation rule formula requires a formula key.",
    ],
    valid: false,
  });
});

test("rate, layer, snapshot, and breakdown contracts include effective dates, versions, sources, recalculation, and explainability", () => {
  const trace = createCostTrace({
    correlationId: "request:cost",
    explainability: {
      assumptions: ["No business calculation executed."],
      summary: "Cost source captured for traceability.",
    },
    operationType: "snapshot",
    sourceActorId: "user-1",
    sourceApp: "platform",
    sourceDocumentId: "doc-1",
    sourceEngine: "document-engine",
    sourceEventName: "CostSnapshotCreated",
    sourceJobId: "job-1",
    sourceTransactionId: "tx-1",
    traceId: "trace-1",
  });
  const layer = createCostLayer({
    currencyCode: "SAR",
    effectiveDate: "2026-01-01",
    explainability: { source: "test" },
    id: "layer-1",
    objectKey: "product",
    productId: "product-1",
    quantityRemaining: 10,
    source: trace,
    totalCost: 1000,
    unitCost: 100,
    version: 1,
  });
  const breakdown = createCostBreakdown({
    currencyCode: "SAR",
    generatedAt: "2026-06-27T08:00:00.000Z",
    key: "breakdown-1",
    lines: [
      { amount: 1000, costType: "direct_material", currencyCode: "SAR", key: "material", label: "Material", percentage: 100, traceId: "trace-1" },
    ],
    objectKey: "product",
    totalCost: 1000,
    traceId: "trace-1",
  });
  const snapshot = createCostSnapshot({
    asOf: "2026-06-27T08:00:00.000Z",
    breakdown,
    currencyCode: "SAR",
    key: "snapshot-1",
    layers: [layer],
    objectKey: "product",
    productId: "product-1",
    quantity: 10,
    recalculation: {
      reason: "Foundation test",
      requestedAt: "2026-06-27T08:00:00.000Z",
      requestedBy: "user-1",
    },
    totalCost: 1000,
    trace,
    version: 1,
  });

  assert.equal(snapshot.layers?.[0]?.source?.sourceDocumentId, "doc-1");
  assert.equal(snapshot.breakdown?.lines[0]?.traceId, "trace-1");
  assert.equal(snapshot.trace?.explainability?.summary, "Cost source captured for traceability.");
});

test("event integration contracts expose cost event names without handlers", () => {
  assert.deepEqual(COST_PLATFORM_EVENTS, {
    allocationCompleted: "CostAllocationCompleted",
    allocationRequested: "CostAllocationRequested",
    definitionCreated: "CostDefinitionCreated",
    rateChanged: "CostRateChanged",
    recalculationCompleted: "CostRecalculationCompleted",
    recalculationRequested: "CostRecalculationRequested",
    snapshotCreated: "CostSnapshotCreated",
  });
  assert.deepEqual(createCostEventIntegrationContract(COST_PLATFORM_EVENTS.allocationRequested, "allocation", definition.key), {
    costDefinitionKey: "platform.cost-foundation",
    eventName: "CostAllocationRequested",
    operationType: "allocation",
    requiresSubscription: true,
  });
});

test("background job readiness prepares allocation, snapshot, and recalculation jobs", () => {
  assert.deepEqual(["allocation", "snapshot", "recalculation"].map((operation) =>
    createCostJobReadinessContract(operation as "allocation" | "snapshot" | "recalculation", definition.key).jobKey,
  ), [
    "cost.platform.cost-foundation.allocation",
    "cost.platform.cost-foundation.snapshot",
    "cost.platform.cost-foundation.recalculation",
  ]);
  assert.deepEqual(createCostJobReadinessContract("recalculation", definition.key), {
    deadLetterEnabled: true,
    integration: "cost-recalculation",
    jobKey: "cost.platform.cost-foundation.recalculation",
    operationType: "recalculation",
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
  });
});

test("reporting, dashboard, search, and export integration contracts are provider-neutral", () => {
  assert.deepEqual(createCostReportIntegrationContract("platform.cost-report", definition.key), {
    consumesCostResults: true,
    costDefinitionKey: "platform.cost-foundation",
    reportKey: "platform.cost-report",
    supportedFormats: ["table", "json", "csv", "pdf"],
  });
  assert.deepEqual(createCostDashboardIntegrationContract("platform.cost-dashboard", definition.key, "cost.total"), {
    costDefinitionKey: "platform.cost-foundation",
    dashboardKey: "platform.cost-dashboard",
    displaysCostKpis: true,
    kpiKey: "cost.total",
  });
  assert.deepEqual(createCostSearchIntegrationContract("platform.cost-search", ["record", "document"]), {
    indexesCostTraces: true,
    resultTypes: ["record", "document"],
    searchProviderKey: "platform.cost-search",
  });
  assert.deepEqual(createCostExportIntegrationContract("platform.cost-export", ["csv", "excel"]), {
    exportKey: "platform.cost-export",
    exportsBreakdowns: true,
    supportedFormats: ["csv", "excel"],
  });
});

test("security metadata captures permissions, tenant/company/branch, data scope, sensitive financial flags, approval, audit, and export restrictions", () => {
  assert.deepEqual(createCostSecurityMetadata(definition, context), {
    approvalRequired: true,
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    costDefinitionKey: "platform.cost-foundation",
    dataScopes: ["tenant", "company"],
    exportRestrictions: ["approval-required", "masked-only"],
    requiredPermissions: ["platform.cost.view"],
    sensitiveFinancialData: true,
    tenantId: "tenant-1",
  });
});

test("audit and telemetry metadata expose traceable cost operation context", () => {
  const trace = createCostTrace({
    correlationId: "request:cost",
    operationType: "allocation",
    sourceActorId: "user-1",
    sourceApp: "platform",
    sourceDocumentId: "doc-1",
    sourceEngine: "document-engine",
    traceId: "trace-1",
  });
  const result = createCostResult({
    definitionKey: definition.key,
    durationMs: 500,
    objectCount: 2,
    operationType: "allocation",
    rowCount: 10,
    status: "completed",
    trace,
  });

  assert.deepEqual(createCostAuditMetadata(result, context), {
    action: "cost.completed",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:cost",
    durationMs: 500,
    objectCount: 2,
    operationType: "allocation",
    outcome: "completed",
    principalId: "principal-1",
    rowCount: 10,
    sourceApp: "platform",
    sourceDocument: {
      sourceDocumentId: "doc-1",
      sourceDocumentType: "platform.document",
      sourceEngine: "document-engine",
    },
    sourceEngine: "cost-engine",
    tenantId: "tenant-1",
  });
  assert.deepEqual(createCostTelemetryMetadata(result, context), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:cost",
    durationMs: 500,
    objectCount: 2,
    operationType: "allocation",
    outcome: "completed",
    requestId: "request-1",
    rowCount: 10,
    sourceKey: "platform.cost-foundation",
    tenantId: "tenant-1",
  });
});
