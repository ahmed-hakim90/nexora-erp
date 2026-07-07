import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertSerialHandlingUnitReadiness,
  assertSerialWarrantyServiceReadiness,
  defineInventorySerial,
  defineInventorySerialPolicy,
  defineInventorySerialSequenceReservation,
  formatSerialLabel,
  getInventoryFoundationEntity,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT,
  INVENTORY_LOT_ARCHITECTURE_CONTRACT,
  INVENTORY_PERMISSIONS,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT,
  INVENTORY_SERIAL_GENERATION_METHODS,
  INVENTORY_SERIAL_LIFECYCLE_STATES,
  INVENTORY_SERIAL_POLICY_PATTERN_TOKENS,
  INVENTORY_SERIAL_RESERVATION_STATUSES,
  INVENTORY_SERIAL_SOURCES,
  INVENTORY_SERIAL_STATUSES,
  INVENTORY_SERIAL_VERIFICATION_STATUSES,
  inventorySerialMutationSchema,
  inventorySerialPolicyMutationSchema,
  inventorySerialSequenceReservationSchema,
  isSerialCurrentlyInHandlingUnit,
  productAllowsSerials,
  validateSerialAgainstProductPolicy,
  validateSerialLifecycleStatus,
  validateSerialPolicyPattern,
  validateSerialSourcePayload,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630181000_inventory_serial_engine_foundation.sql");

test("serial source validation enforces source-specific metadata", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const report = (message: string, path: readonly (string | number)[]) => issues.push({ message, path });

  validateSerialSourcePayload({
    serialSource: "supplier",
    sourceMetadata: { supplierPartyKey: "supplier-1" },
  }, report);
  assert.equal(issues.length, 0);

  validateSerialSourcePayload({ serialSource: "supplier", sourceMetadata: {} }, report);
  assert.match(issues.at(-1)?.message ?? "", /supplier/i);

  issues.length = 0;
  validateSerialSourcePayload({
    serialSource: "imported",
    sourceMetadata: { importBatch: "BATCH-01" },
  }, report);
  assert.equal(issues.length, 0);

  issues.length = 0;
  validateSerialSourcePayload({ serialSource: "manual", sourceMetadata: { auditedBy: "ops-1" } }, report);
  assert.equal(issues.length, 0);

  issues.length = 0;
  validateSerialSourcePayload({
    serialSource: "nexora_generated",
    sourceMetadata: { policyCode: "AF26" },
  }, report);
  assert.equal(issues.length, 0);
});

test("product serial policy integration blocks serials for non-serial products", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateSerialAgainstProductPolicy({
    lotId: null,
    serialNumber: "AF260000001",
    serialSource: "manual",
  }, {
    name: "Quantity Only Product",
    serialAllowManualOverride: true,
    serialDuplicateValidation: true,
    serialGenerationTiming: "manual",
    serialSource: "manual",
    trackingMode: "quantity_only",
  }, (message, path) => issues.push({ message, path }));

  assert.equal(productAllowsSerials({
    name: "Quantity Only Product",
    serialAllowManualOverride: true,
    serialDuplicateValidation: true,
    serialGenerationTiming: "manual",
    serialSource: "manual",
    trackingMode: "quantity_only",
  }), false);
  assert.equal(issues.length, 1);
});

test("lot_serial validation requires lot reference", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateSerialAgainstProductPolicy({
    lotId: null,
    serialNumber: "AF260000001",
    serialSource: "nexora_generated",
  }, {
    name: "Air Fryer",
    serialAllowManualOverride: false,
    serialDuplicateValidation: true,
    serialGenerationTiming: "on_packing",
    serialSource: "nexora_generated",
    trackingMode: "lot_serial",
  }, (message, path) => issues.push({ message, path }));

  assert.equal(issues.length, 1);
  assert.match(issues[0]?.message ?? "", /lot/i);
});

test("duplicate serial prevention is declared in architecture and migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /inventory_serial_numbers_scope_number_uq/);
  assert.match(sql, /inventory_serial_numbers_scope_barcode_uq/);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.uniquenessScope, "company");
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.serialCurrentHandlingUnitUniqueness, true);
});

test("sequence and range reservation contracts support idempotency metadata", () => {
  const reservation = defineInventorySerialSequenceReservation({
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "corr-1",
    currentNumber: 0,
    expiresAt: "2026-12-31T00:00:00.000Z",
    idempotencyKey: "idem-1",
    policyId: "policy-1",
    reservationStatus: "pending",
    reservedFrom: 1,
    reservedTo: 100,
    sequenceKey: "AF26:company-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(reservation.idempotencyKey, "idem-1");
  assert.equal(inventorySerialSequenceReservationSchema.safeParse({
    idempotencyKey: "idem-1",
    policyId: "policy-1",
    reservedFrom: 1,
    reservedTo: 100,
    sequenceKey: "AF26:company-1",
  }).success, true);
  assert.deepEqual(INVENTORY_SERIAL_RESERVATION_STATUSES, ["pending", "reserved", "consumed", "expired", "cancelled"]);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.idempotencyProtectedGeneration, true);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.gapsAllowedInSequences, true);
});

test("verification metadata readiness is modeled without signing runtime", () => {
  const serial = defineInventorySerial({
    barcode: "AF260000001",
    branchId: "branch-1",
    companyId: "company-1",
    firstActivationReady: false,
    generationMethod: "policy_range",
    lifecycleState: "available",
    productKey: "air-fryer",
    qrPayload: { version: 1 },
    serialNumber: "AF260000001",
    serialSource: "nexora_generated",
    serialStatus: "active",
    serviceReady: false,
    sourceMetadata: { policyCode: "AF26" },
    status: "active",
    tenantId: "tenant-1",
    traceabilityReady: true,
    verificationStatus: "pending",
    verificationTokenHash: "hash-1",
    warrantyReady: false,
  });

  assert.equal(serial.verificationStatus, "pending");
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.verificationSigningRuntimeImplemented, false);
  assert.deepEqual(INVENTORY_SERIAL_VERIFICATION_STATUSES, [
    "not_required", "pending", "valid", "invalid", "suspected_duplicate", "revoked",
  ]);
});

test("lifecycle and status validation enforces revoked and counterfeit rules", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateSerialLifecycleStatus({
    lifecycleState: "revoked",
    serialStatus: "blocked",
  }, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);

  validateSerialLifecycleStatus({
    lifecycleState: "available",
    serialStatus: "counterfeit_suspected",
  }, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 1);
  assert.deepEqual(INVENTORY_SERIAL_LIFECYCLE_STATES, [
    "draft", "generated", "imported", "packed", "available", "reserved", "picked", "shipped", "sold", "returned", "service", "repaired", "scrapped", "revoked", "archived",
  ]);
  assert.deepEqual(INVENTORY_SERIAL_STATUSES, [
    "active", "blocked", "damaged", "missing", "duplicate_suspected", "counterfeit_suspected", "archived",
  ]);
});

test("handling unit readiness helpers identify current HU without packing runtime", () => {
  assert.equal(isSerialCurrentlyInHandlingUnit({ currentHandlingUnitId: "hu-1" }), true);
  assert.equal(assertSerialHandlingUnitReadiness({ currentHandlingUnitId: "hu-1", traceabilityReady: true }), true);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.serialIntegrationReady, true);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.handlingUnitIntegrationReady, true);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.generationRuntimeImplemented, false);
});

test("warranty and service readiness metadata is modeled without runtime", () => {
  assert.equal(assertSerialWarrantyServiceReadiness({
    firstActivationReady: true,
    serviceCaseReference: null,
    serviceReady: false,
    soldDocumentReference: null,
    warrantyReady: true,
  }), true);
  assert.equal(assertSerialWarrantyServiceReadiness({
    firstActivationReady: false,
    serviceCaseReference: "CASE-1",
    serviceReady: false,
    soldDocumentReference: null,
    warrantyReady: false,
  }), false);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.warrantyRuntimeImplemented, false);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.serviceRuntimeImplemented, false);
});

test("no quantity leakage is declared in serial engine architecture and migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /no stock movements, ledger, generation runtime, QR signing, warranty, or service runtime/i);
  assert.doesNotMatch(sql, /\badd column\b[^\n]*quantity_on_hand|\badd column\b[^\n]*quantity_reserved|\badd column\b[^\n]*stock_balance/i);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.quantityFieldsAllowed, false);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.stockBalanceFieldsAllowed, false);
  const descriptor = getInventoryFoundationEntity("serials");
  assert.equal(descriptor.fields.some((field) => field.name.toLowerCase().includes("quantity")), false);
});

test("platform readiness contracts register serial search and foundation contracts", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.serialEngine.key, INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.key);
  assert.deepEqual(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.appIntegrations, [
    "app-registry",
    "search",
    "reporting",
    "print",
    "dashboard",
    "import-export",
    "traceability",
    "warehouse-execution",
  ]);
  assert.equal(INVENTORY_PERMISSIONS.serialsManage, "inventory.serials.manage");
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.serialIntegrationReady, true);

  const serialSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_serial_number");
  assert.deepEqual(serialSearch?.quickSearchFields, [
    "serialNumber",
    "barcode",
    "productKey",
    "lotKey",
    "serialSource",
    "lifecycleState",
    "serialStatus",
    "verificationStatus",
  ]);
});

test("serial policy pattern validation supports sprint tokens only", () => {
  assert.equal(validateSerialPolicyPattern("{PREFIX}-{NUMBER}"), true);
  assert.equal(validateSerialPolicyPattern("{PREFIX}-{UNKNOWN}"), false);
  assert.deepEqual(INVENTORY_SERIAL_POLICY_PATTERN_TOKENS, [
    "{PREFIX}", "{COMPANY}", "{BRANCH}", "{PRODUCT}", "{LOT}", "{YEAR}", "{MONTH}", "{NUMBER}",
  ]);
  assert.equal(inventorySerialPolicyMutationSchema.safeParse({
    allowManualOverride: "true",
    digits: 6,
    duplicateValidation: "true",
    generationTiming: "on_packing",
    pattern: "{PREFIX}{NUMBER}",
    policyCode: "af26",
    resetScope: "company",
    startNumber: 1,
    status: "active",
  }).success, true);
});

test("label formatting avoids UUID exposure", () => {
  assert.equal(
    formatSerialLabel({
      lifecycleState: "available",
      lotNumber: "LOT-CN-240628",
      productName: "Air Fryer",
      serialNumber: "AF260000001",
      serialSource: "nexora_generated",
    }),
    "AF260000001 — Air Fryer — LOT-CN-240628 — Available",
  );
  assert.equal(
    formatSerialLabel({
      lifecycleState: "imported",
      productName: "Motor",
      serialNumber: "SUP-MTR-99881",
      serialSource: "supplier",
    }),
    "SUP-MTR-99881 — Motor — Supplier — Imported",
  );
});

test("serial source and generation method contracts are registered", () => {
  assert.deepEqual(INVENTORY_SERIAL_SOURCES, ["nexora_generated", "supplier", "manual", "imported"]);
  assert.deepEqual(INVENTORY_SERIAL_GENERATION_METHODS, ["policy_range", "manual_entry", "supplier_import", "bulk_import"]);
  assert.equal(inventorySerialMutationSchema.safeParse({
    barcode: "AF260000001",
    firstActivationReady: "false",
    generationMethod: "manual_entry",
    lifecycleState: "draft",
    productId: "product-1",
    serialNumber: "AF260000001",
    serialSource: "manual",
    serialStatus: "active",
    serviceReady: "false",
    sourceMetadata: { auditedBy: "ops-1" },
    status: "active",
    traceabilityReady: "true",
    verificationStatus: "not_required",
    warrantyReady: "false",
  }).success, true);
});

test("serial policy contract models sprint 1 integration fields", () => {
  const policy = defineInventorySerialPolicy({
    allowManualOverride: false,
    branchId: "branch-1",
    companyId: "company-1",
    digits: 6,
    duplicateValidation: true,
    generationTiming: "on_packing",
    pattern: "{PREFIX}{NUMBER}",
    policyCode: "AF26",
    prefix: "AF",
    productKey: "air-fryer",
    resetScope: "company",
    startNumber: 1,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(policy.policyCode, "AF26");
  assert.equal(policy.generationTiming, "on_packing");
});
