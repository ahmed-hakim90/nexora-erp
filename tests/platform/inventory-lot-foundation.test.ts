import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildInventoryFoundationMutationSchema,
  defineInventoryLot,
  formatLotLabel,
  getInventoryFoundationEntity,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT,
  INVENTORY_LOT_ARCHITECTURE_CONTRACT,
  INVENTORY_LOT_LIFECYCLE_STATES,
  INVENTORY_LOT_QC_STATUSES,
  INVENTORY_LOT_SOURCE_TYPES,
  INVENTORY_LOT_TRACEABILITY_CHANNELS,
  INVENTORY_PERMISSIONS,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  inventoryLotMutationSchema,
  isLotIssueBlocked,
  productAllowsLots,
  validateLotAgainstProductPolicy,
  validateLotLifecycleMetadata,
  validateLotSourcePayload,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630180100_inventory_lot_foundation.sql");

test("lot source validation enforces source-specific metadata", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const report = (message: string, path: readonly (string | number)[]) => issues.push({ message, path });

  validateLotSourcePayload({
    sourceType: "supplier",
    supplierLotNumber: "SUP-LOT-01",
  }, report);
  assert.equal(issues.length, 0);

  validateLotSourcePayload({ sourceType: "supplier" }, report);
  assert.match(issues.at(-1)?.message ?? "", /supplier/i);

  validateLotSourcePayload({
    sourceReferenceId: "lot-1",
    sourceReferenceType: "inventory_lot",
    sourceType: "repack",
  }, report);
  assert.equal(issues.filter((issue) => /repack/i.test(issue.message)).length, 0);
});

test("supplier lot metadata is modeled on lot contracts", () => {
  const lot = defineInventoryLot({
    barcode: "LOT-CN-240628",
    branchId: "cairo-branch",
    companyId: "company-1",
    expiryDate: "2027-06-28",
    lifecycleState: "qc_pending",
    lotNumber: "LOT-CN-240628",
    productKey: "air-fryer",
    qcStatus: "pending",
    receivedDate: "2026-06-28",
    sourceType: "supplier",
    status: "active",
    supplierLotNumber: "CN-240628",
    supplierPartyKey: "supplier-1",
    tenantId: "tenant-1",
    traceabilityReady: true,
  });

  assert.equal(lot.sourceType, "supplier");
  assert.equal(lot.supplierLotNumber, "CN-240628");
});

test("manufacturing repack return and adjustment source readiness is declared", () => {
  assert.deepEqual(INVENTORY_LOT_SOURCE_TYPES, [
    "supplier",
    "manufacturing",
    "repack",
    "return",
    "adjustment",
    "internal",
    "import",
  ]);
  assert.equal(inventoryLotMutationSchema.safeParse({
    barcode: "LOT-MFG-000251",
    lifecycleState: "released",
    lotNumber: "LOT-MFG-000251",
    productId: "product-1",
    qcStatus: "released",
    sourceReferenceId: "mo-000251",
    sourceReferenceType: "manufacturing_order",
    sourceType: "manufacturing",
    status: "active",
    traceabilityReady: "true",
  }).success, true);
});

test("QC status validation supports metadata-only QC states", () => {
  assert.deepEqual(INVENTORY_LOT_QC_STATUSES, ["not_required", "pending", "passed", "failed", "hold", "released"]);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.qcWorkflowRuntimeImplemented, false);
  assert.equal(isLotIssueBlocked({ lifecycleState: "qc_hold", qcStatus: "hold" }), true);
  assert.equal(isLotIssueBlocked({ lifecycleState: "released", qcStatus: "released" }), false);
});

test("lifecycle validation identifies expired and blocked lots", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateLotLifecycleMetadata({
    expiryDate: "2026-01-01",
    lifecycleState: "expired",
    qcStatus: "passed",
  }, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);

  validateLotLifecycleMetadata({
    lifecycleState: "expired",
    qcStatus: "passed",
  }, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 1);
  assert.deepEqual(INVENTORY_LOT_LIFECYCLE_STATES, [
    "draft", "active", "qc_pending", "qc_hold", "released", "blocked", "consumed", "expired", "archived",
  ]);
});

test("product lot policy integration blocks lots for non-lot products", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateLotAgainstProductPolicy({
    lifecycleState: "active",
    qcStatus: "not_required",
    sourceType: "internal",
  }, {
    lotExpirySupported: false,
    lotInternalSupported: true,
    lotManufacturingDateSupported: false,
    lotQcRequired: false,
    lotSupplierSupported: false,
    name: "Quantity Only Product",
    trackingMode: "quantity_only",
  }, (message, path) => issues.push({ message, path }));

  assert.equal(productAllowsLots({
    lotExpirySupported: false,
    lotInternalSupported: false,
    lotManufacturingDateSupported: false,
    lotQcRequired: false,
    lotSupplierSupported: false,
    name: "Quantity Only Product",
    trackingMode: "quantity_only",
  }), false);
  assert.equal(issues.length, 1);
});

test("lot migration extends identity without quantity leakage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  for (const column of [
    "lot_number",
    "source_type",
    "supplier_party_id",
    "supplier_lot_number",
    "manufacturing_date",
    "expiry_date",
    "received_date",
    "qc_status",
    "lifecycle_state",
    "barcode",
    "qr_payload",
    "traceability_ready",
    "source_metadata",
  ]) {
    assert.match(sql, new RegExp(column));
  }
  assert.match(sql, /no quantity, balance, movement, reservation, or availability runtime/i);
  assert.doesNotMatch(sql, /\badd column\b[^\n]*quantity_on_hand|\badd column\b[^\n]*quantity_reserved|\badd column\b[^\n]*stock_balance|\badd column\b[^\n]*stock_movement/i);
});

test("barcode and QR readiness contracts are registered", () => {
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.barcodeReady, true);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.qrReady, true);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.printReady, true);
});

test("handling unit integration readiness is declared without packing runtime", () => {
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.handlingUnitIntegrationReady, true);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.lotIntegrationReady, true);
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.lotContentCapabilities, [
    "lot_quantity",
    "serials_in_lot",
    "cartons_in_lot",
    "mixed_lots_where_allowed",
  ]);
});

test("traceability readiness channels are registered", () => {
  assert.deepEqual(INVENTORY_LOT_TRACEABILITY_CHANNELS, [
    "supplier_receipt",
    "production_order",
    "qc",
    "handling_units",
    "serials",
    "shipments",
    "customers",
    "service_cases",
    "recalls",
  ]);
  assert.deepEqual(INVENTORY_LOT_ARCHITECTURE_CONTRACT.traceabilityChannels, INVENTORY_LOT_TRACEABILITY_CHANNELS);
});

test("platform readiness contracts register lot search and foundation contracts", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.lotArchitecture.key, INVENTORY_LOT_ARCHITECTURE_CONTRACT.key);
  assert.deepEqual(INVENTORY_LOT_ARCHITECTURE_CONTRACT.appIntegrations, [
    "app-registry",
    "search",
    "reporting",
    "print",
    "dashboard",
    "import-export",
    "traceability",
    "warehouse-execution",
  ]);
  assert.equal(INVENTORY_PERMISSIONS.lotsManage, "inventory.lots.manage");

  const lotSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_lot");
  assert.deepEqual(lotSearch?.quickSearchFields, ["lotNumber", "barcode", "productKey", "sourceType", "qcStatus", "lifecycleState", "supplierLotNumber"]);
});

test("label formatting avoids UUID exposure", () => {
  assert.equal(
    formatLotLabel({
      lifecycleState: "qc_pending",
      lotNumber: "LOT-CN-240628",
      productName: "Air Fryer",
      qcStatus: "pending",
      sourceType: "supplier",
    }),
    "LOT-CN-240628 — Air Fryer — Supplier — QC Pending",
  );
  assert.equal(
    formatLotLabel({
      lifecycleState: "released",
      lotNumber: "LOT-MFG-000251",
      productName: "Blender",
      qcStatus: "released",
      sourceType: "manufacturing",
    }),
    "LOT-MFG-000251 — Blender — Manufacturing — Released",
  );
});

test("foundation mutation schema registers lot resources", () => {
  const schema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("lots"));
  assert.equal(schema.safeParse({
    barcode: "LOT-000001",
    lifecycleState: "active",
    lotNumber: "LOT-000001",
    productId: "product-1",
    qcStatus: "not_required",
    sourceType: "internal",
    status: "active",
    traceabilityReady: "true",
  }).success, true);
});

test("no quantity movement leakage is declared in lot architecture contract", () => {
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.quantityFieldsAllowed, false);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.stockBalanceFieldsAllowed, false);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.availabilityRuntimeImplemented, false);
  assert.equal(INVENTORY_LOT_ARCHITECTURE_CONTRACT.runtimeExecutionImplemented, false);
});
