import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineInventoryCurrentStateProjection,
  defineInventoryDocumentLine,
  defineInventoryDocumentSnapshot,
  defineInventoryObjectRef,
  getInventoryFoundationEntity,
  INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT,
  INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT,
  INVENTORY_DOCUMENT_LINE_CONTRACT,
  INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS,
  INVENTORY_FOUNDATION_DOCUMENT_KINDS,
  INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT,
  INVENTORY_INVENTORY_STATUSES,
  INVENTORY_OBJECT_REF_CONTRACT,
  INVENTORY_OBJECT_TYPES,
  INVENTORY_PROJECTION_KINDS,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT,
  inventoryCurrentStateProjectionSchema,
  inventoryDocumentLineSchema,
  inventoryDocumentSnapshotSchema,
  inventoryObjectRefSchema,
  isProjectionOnlyIdentityField,
  validateDocumentSnapshot,
  validateInventoryDocumentLine,
  validateInventoryObjectRef,
  validateProjectionContract,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630182000_inventory_document_foundation.sql");

test("document type contracts register all eleven foundation document kinds", () => {
  assert.deepEqual(INVENTORY_FOUNDATION_DOCUMENT_KINDS, [
    "goods_receipt",
    "goods_issue",
    "inventory_transfer",
    "inventory_adjustment",
    "material_request",
    "material_issue",
    "production_receipt",
    "return_receipt",
    "scrap_document",
    "repack_document",
    "cycle_count_document",
  ]);
  assert.equal(Object.keys(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS).length, 11);
  assert.equal(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS.goodsReceipt.documentType, "inventory.goods-receipt");
  assert.equal(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS.goodsReceipt.runtimeExecutionImplemented, false);
  assert.equal(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS.goodsReceipt.ledgerPostingReadiness, true);
});

test("document lifecycle and status readiness is declared without runtime execution", () => {
  const contract = INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS.inventoryTransfer;
  assert.equal(contract.approvalReadiness, true);
  assert.equal(contract.auditReadiness, true);
  assert.equal(contract.printReadiness, true);
  assert.equal(contract.postingReadiness, true);
  assert.deepEqual(contract.lifecycleStates, [
    "draft", "submitted", "waiting-approval", "approved", "posted", "completed", "cancelled", "archived",
  ]);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.foundationDocumentTypes.length, 11);
  assert.equal(INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.runtimeExecutionImplemented, false);
});

test("inventory document line validation enforces object refs and quantity rules", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const line = inventoryDocumentLineSchema.parse({
    inventoryStatus: "available",
    lineNumber: 1,
    objectRef: {
      label: "STL-001 — Steel Sheet",
      lotId: "lot-1",
      objectType: "lot_quantity",
      quantity: 10,
      traceabilityReady: true,
    },
    sourceWarehouseId: "warehouse-1",
  });
  validateInventoryDocumentLine(line, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);

  validateInventoryDocumentLine({
    ...line,
    objectRef: {
      label: "SN-001",
      objectType: "serial",
      quantity: 2,
      serialId: "serial-1",
      traceabilityReady: true,
    },
  }, (message, path) => issues.push({ message, path }));
  assert.match(issues.at(-1)?.message ?? "", /cannot carry quantity other than 1/i);
});

test("InventoryObjectRef validation enforces type-specific requirements", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateInventoryObjectRef(defineInventoryObjectRef({
    label: "AF260000001",
    objectType: "serial",
    quantity: 1,
    serialId: "serial-1",
    traceabilityReady: true,
  }), (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);

  validateInventoryObjectRef({
    label: "Steel Sheet",
    objectType: "product_quantity",
    productId: "product-1",
    quantity: 0,
    traceabilityReady: true,
  }, (message, path) => issues.push({ message, path }));
  assert.match(issues.at(-1)?.message ?? "", /quantity > 0/i);
  assert.deepEqual(INVENTORY_OBJECT_TYPES, ["product_quantity", "lot_quantity", "serial", "handling_unit", "child_handling_unit"]);
  assert.equal(inventoryObjectRefSchema.safeParse({
    label: "HU-0001",
    handlingUnitId: "hu-1",
    objectType: "handling_unit",
    traceabilityReady: true,
  }).success, true);
});

test("snapshot contract validation requires immutable business labels", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const snapshot = defineInventoryDocumentSnapshot({
    actorLabel: "Warehouse Operator",
    capturedAt: "2026-06-30T12:00:00.000Z",
    correlationId: "corr-1",
    destinationLocationLabel: "MAIN-BIN-01",
    handlingUnitLabel: "CTN-0001",
    huContentsSnapshot: { lines: 2 },
    lotLabel: "LOT-CN-240628",
    objectIdentity: { objectType: "lot_quantity", lotId: "lot-1" },
    productLabel: "Air Fryer",
    quantity: 10,
    serialLabel: null,
    sourceLocationLabel: "RECV-01",
    uomLabel: "Each",
  });
  validateDocumentSnapshot(snapshot, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
  assert.equal(INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT.immutable, true);
  assert.equal(INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT.snapshotRuntimeImplemented, false);
  assert.equal(inventoryDocumentSnapshotSchema.safeParse(snapshot).success, true);
});

test("projection contract validation models derived current state without runtime", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const projection = defineInventoryCurrentStateProjection({
    correlationId: "corr-1",
    custodian: {},
    inventoryStatus: "available",
    locationId: "location-1",
    objectType: "serial",
    projectionKind: "serial_state",
    quantity: 1,
    serialId: "serial-1",
    warehouseId: "warehouse-1",
  });
  validateProjectionContract(projection, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
  assert.deepEqual(INVENTORY_PROJECTION_KINDS, [
    "product_quantity", "lot_quantity", "serial_state", "handling_unit_state",
    "availability", "reserved_quantity", "picked_quantity", "shipped_quantity",
  ]);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.projectionRuntimeImplemented, true);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.ledgerTable, "inventory_ledger_entries");
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.balanceCalculationImplemented, false);
  assert.equal(inventoryCurrentStateProjectionSchema.safeParse(projection).success, true);
});

test("identity and current-state separation is declared across architecture contracts", () => {
  assert.equal(INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.identityOwnsCurrentState, false);
  assert.equal(INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.currentStateDerivedFromLedger, true);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.identityTablesDoNotOwnCurrentState, true);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.quantityOnIdentityTablesAllowed, false);
});

test("serial current-state fields are marked projection-only", () => {
  assert.deepEqual(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.currentStateProjectionOnlyFields, [
    "current_handling_unit_id",
    "current_warehouse_id",
    "current_location_id",
    "current_custodian",
  ]);
  assert.equal(INVENTORY_SERIAL_ENGINE_ARCHITECTURE_CONTRACT.identityOwnsCurrentState, false);
  assert.equal(isProjectionOnlyIdentityField("inventory_serial_numbers", "current_handling_unit_id"), true);
  assert.equal(isProjectionOnlyIdentityField("inventory_products", "name"), false);
});

test("handling unit current-state fields are marked projection-only", () => {
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.currentStateProjectionOnlyFields, [
    "warehouse_id",
    "location_id",
    "current_custodian",
  ]);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.identityOwnsCurrentState, false);
  assert.equal(isProjectionOnlyIdentityField("inventory_handling_units", "current_custodian"), true);
});

test("no quantity leakage into identity tables is declared in migration and foundation entities", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /no ledger runtime, stock movements, posting, reservation, or warehouse execution runtime/i);
  assert.match(sql, /inventory_document_lines/);
  assert.match(sql, /inventory_current_state_projections/);
  assert.doesNotMatch(sql, /\balter table public\.inventory_products\b[^\n]*quantity/);
  for (const entityKey of ["lots", "serials", "handling-units"] as const) {
    const descriptor = getInventoryFoundationEntity(entityKey);
    assert.equal(descriptor.fields.some((field) => field.name.toLowerCase().includes("quantity")), false);
  }
});

test("platform readiness contracts register document search and foundation contracts", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.documentArchitecture.key, INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.key);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.objectRef.key, INVENTORY_OBJECT_REF_CONTRACT.key);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.documentLine.key, INVENTORY_DOCUMENT_LINE_CONTRACT.key);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.currentStateProjection.key, INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.key);
  assert.deepEqual(INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.appIntegrations, [
    "document-engine",
    "event-bus",
    "workflow",
    "approval",
    "audit",
    "search",
    "reporting",
    "print",
    "dashboard",
    "background-jobs",
    "import-export",
    "warehouse-execution",
    "cost-engine",
    "finance",
  ]);
  const documentSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_document");
  assert.deepEqual(documentSearch?.quickSearchFields, [
    "documentKind",
    "documentNumber",
    "documentStatus",
    "lifecycleState",
    "sourceApp",
    "warehouseKey",
  ]);
});

test("inventory status model is registered without availability runtime", () => {
  assert.deepEqual(INVENTORY_INVENTORY_STATUSES, [
    "available", "reserved", "picked", "packed", "shipped", "sold", "returned",
    "qc_hold", "damaged", "scrap", "service", "blocked", "in_transit",
  ]);
  assert.deepEqual(INVENTORY_DOCUMENT_LINE_CONTRACT.inventoryStatuses, INVENTORY_INVENTORY_STATUSES);
  assert.equal(defineInventoryDocumentLine({
    inventoryStatus: "available",
    lineNumber: 1,
    objectRef: {
      label: "HU-0001",
      handlingUnitId: "hu-1",
      objectType: "handling_unit",
      traceabilityReady: true,
    },
  }).objectRef.objectType, "handling_unit");
});
