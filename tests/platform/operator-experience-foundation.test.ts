import assert from "node:assert/strict";
import test from "node:test";

import {
  OX_FOUNDATION_ARCHITECTURE,
  OX_ROLE_WORKSPACE_TEMPLATES,
  OX_SHARED_RUNTIME_CONTRACTS,
  createOxLabelPrintDefinition,
  createOxLookupQuery,
  createOxOperatorError,
  createOxRuntimeContext,
  createOxWizardState,
  defineOxScannerContract,
  defineOxWizard,
  getVisibleOxFields,
  normalizeOxLookupOption,
  resolveOxSmartDefaults,
} from "@/platform/operator-experience/public-api";

test("OX foundation exposes architecture and runtime contract names", () => {
  assert.equal(OX_FOUNDATION_ARCHITECTURE.key, "operator-experience-foundation");
  assert.equal(OX_FOUNDATION_ARCHITECTURE.sections.some((section) => section.key === "lookup-runtime"), true);
  assert.equal(OX_SHARED_RUNTIME_CONTRACTS.entityLookup, "OxLookupProviderContract");
  assert.equal(OX_SHARED_RUNTIME_CONTRACTS.contextEngine, "OxOperationalContext");
});

test("OX lookup rejects manual raw identifiers and requires business display labels", () => {
  const uuid = "0fdb5917-f533-4ad5-9b4d-91f427dd7ed4";
  const manual = createOxLookupQuery(uuid);
  const scanned = createOxLookupQuery(uuid, { mode: "barcode" });

  assert.equal(manual.rejectedRawIdentifier, true);
  assert.equal(manual.term, null);
  assert.equal(scanned.rejectedRawIdentifier, false);
  assert.equal(scanned.term, uuid);
  assert.equal(normalizeOxLookupOption({ businessName: uuid, entityType: "product", id: uuid }), null);
  assert.deepEqual(
    normalizeOxLookupOption({
      businessCode: "SKU-1001",
      businessName: "Finished Good 1001",
      entityType: "product",
      id: uuid,
      status: "active",
    })?.businessName,
    "Finished Good 1001",
  );
});

test("OX smart defaults inherit context without overwriting entered values", () => {
  const context = createOxRuntimeContext({
    branchId: "branch-1",
    branchName: "Main Branch",
    companyId: "company-1",
    companyName: "Nexora Factory",
    experience: "erp",
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    warehouseName: "Main Warehouse",
  });
  const defaults = resolveOxSmartDefaults(
    [
      {
        confidence: "high",
        contextKey: "warehouseId",
        fieldName: "warehouseId",
        key: "default-warehouse",
        label: "Default warehouse",
        requiresConfirmation: false,
        source: "context",
      },
      {
        confidence: "high",
        contextKey: "branchId",
        fieldName: "branchId",
        key: "default-branch",
        label: "Default branch",
        requiresConfirmation: false,
        source: "context",
      },
    ],
    context,
    { branchId: "already-selected" },
  );

  assert.deepEqual(defaults.map((item) => item.fieldName), ["warehouseId"]);
  assert.equal(defaults[0]?.value, "warehouse-1");
});

test("OX progressive disclosure only exposes essential fields by default", () => {
  const fields = [
    { category: "essential", label: "Product", name: "productId" },
    { category: "advanced", label: "Lot", name: "lotId" },
    { category: "administrative", label: "Approval note", name: "approvalNote" },
    { category: "system", label: "Posting key", name: "postingKey", systemManaged: true },
  ] as const;

  assert.deepEqual(getVisibleOxFields(fields).map((field) => field.name), ["productId"]);
  assert.deepEqual(
    getVisibleOxFields(fields, { showAdvanced: true, showAdministrative: true }).map((field) => field.name),
    ["productId", "lotId", "approvalNote"],
  );
});

test("OX wizard state supports draft, progress, and review before submit", () => {
  const wizard = defineOxWizard({
    key: "receive-goods",
    label: "Receive Goods",
    reviewBeforeSubmit: true,
    supportsDraft: true,
    supportsResume: true,
    taskKey: "receive-goods",
    steps: [
      { canSaveDraft: true, description: "Select supplier and PO.", key: "source", label: "Source", requiredFieldNames: ["supplierId"], validationScope: "step" },
      { canSaveDraft: true, description: "Scan products.", key: "lines", label: "Lines", requiredFieldNames: ["productId", "quantity"], validationScope: "step" },
      { canSaveDraft: false, description: "Review and submit.", key: "review", label: "Review", requiredFieldNames: [], validationScope: "task" },
    ],
  });

  const state = createOxWizardState(wizard, ["source"], "lines");

  assert.equal(state.activeStepKey, "lines");
  assert.equal(state.progressPercent, 33);
  assert.equal(state.canSaveDraft, true);
  assert.equal(state.canSubmit, false);
  assert.deepEqual(state.steps.map((step) => step.state), ["complete", "current", "pending"]);
});

test("OX scanner and print readiness contracts stay platform-only", () => {
  const scanner = defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "scan-product",
    label: "Scan product",
    lookupProviderKey: "products.lookup",
    normalize: "uppercase-trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "product",
  });
  const print = createOxLabelPrintDefinition({
    barcodeRequired: true,
    entityType: "warehouse-location",
    futurePrintEngineTemplateKey: "ox.location-label.v1",
    key: "location-label",
    kind: "location-label",
    label: "Location Label",
    qrRequired: true,
  });

  assert.equal(scanner.inputPriority, "scanner-first");
  assert.equal(print.blocks.includes("body"), true);
  assert.equal(print.blocks.includes("barcode"), true);
  assert.equal(print.blocks.includes("qr-code"), true);
});

test("OX role workspace templates include factory operator roles", () => {
  const keys = new Set(OX_ROLE_WORKSPACE_TEMPLATES.map((workspace) => workspace.key));

  assert.equal(keys.has("warehouse-keeper"), true);
  assert.equal(keys.has("production-worker"), true);
  assert.equal(keys.has("production-supervisor"), true);
});

test("OX operator errors explain problem, reason, and fix without leaking UUIDs", () => {
  const error = createOxOperatorError({
    fieldLabel: "Product",
    fieldName: "productId",
    fix: "Search by SKU, product name, or scan the barcode.",
    problem: "Product 0fdb5917-f533-4ad5-9b4d-91f427dd7ed4 is not available.",
    reason: "The selected record is outside the current branch.",
    code: "PRODUCT_NOT_AVAILABLE",
  });

  assert.equal(error.preserveInput, true);
  assert.equal(error.problem.includes("0fdb5917"), false);
  assert.equal(error.fix, "Search by SKU, product name, or scan the barcode.");
});
