import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  applyLedgerEntryToProjectionState,
  buildProjectionIdempotencyKey,
  createEmptyProjectionEngineState,
  defineInventoryLedgerEntry,
  getAvailabilitySnapshot,
  getCurrentStock,
  getHandlingUnitCurrentState,
  getLedgerBackedCurrentState,
  getSerialCurrentState,
  INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT,
  INVENTORY_PROJECTION_ENGINE_CONTRACT,
  INVENTORY_PROJECTION_IDEMPOTENCY_CONTRACT,
  INVENTORY_PROJECTION_REBUILD_CONTRACT,
  isProjectionOnlyIdentityField,
  processInventoryProjectionEvent,
  rebuildProjectionFromLedger,
  validateProjectionEngineWriteBoundary,
  validateProjectionReadOnlyApi,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630184100_inventory_projection_engine_foundation.sql");

function receiptEntry(overrides: Record<string, unknown> = {}) {
  return defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "Air Fryer" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    inventoryStatus: "available",
    ledgerEntryId: "entry-1",
    locationId: "location-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 10,
    warehouseId: "warehouse-1",
    ...overrides,
  });
}

test("projection engine migration adds runtime state, idempotency, and write enforcement", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /inventory_projection_runtime_state/);
  assert.match(sql, /inventory_projection_applied_entries/);
  assert.match(sql, /inventory_projection_service_guard/);
  assert.match(sql, /enforce_inventory_projection_service_writes/);
  assert.match(sql, /inventory_current_state_projections_anchor_uq/);
  assert.match(sql, /last_processed_ledger_entry_id/);
  assert.match(sql, /rebuild_status/);
  assert.match(sql, /app\.inventory_projection_service/);
});

test("ledger to projection application updates quantity and availability shells", () => {
  const state = createEmptyProjectionEngineState();
  const result = applyLedgerEntryToProjectionState(state, receiptEntry());
  assert.equal(result.applied, true);
  const stock = getCurrentStock(result.state, { productId: "product-1", warehouseId: "warehouse-1" });
  assert.equal(stock[0]?.quantity, 10);
  const availability = getAvailabilitySnapshot(result.state, { productId: "product-1" });
  assert.equal(availability[0]?.quantity, 10);
  assert.equal(result.updatedRows[0]?.derivedFromLedgerEntryId, "entry-1");
  assert.equal(result.updatedRows[0]?.correlationId, "corr-1");
});

test("reversal handling negates projected quantities without editing ledger history", () => {
  let state = createEmptyProjectionEngineState();
  state = applyLedgerEntryToProjectionState(state, receiptEntry()).state;
  const reversal = receiptEntry({
    eventType: "reversed",
    ledgerEntryId: "entry-2",
    movementDirection: "OUT",
    parentEntryId: "entry-1",
    postingTimestamp: "2026-06-30T12:05:00.000Z",
    quantityDelta: -10,
  });
  const result = applyLedgerEntryToProjectionState(state, reversal);
  assert.equal(result.applied, true);
  assert.equal(getCurrentStock(result.state, { productId: "product-1" })[0]?.quantity, 0);
  assert.equal(getAvailabilitySnapshot(result.state, { productId: "product-1" })[0]?.quantity, 0);
});

test("rebuild from ledger replays entries in posting timestamp order", () => {
  const rebuild = rebuildProjectionFromLedger([
    receiptEntry({ ledgerEntryId: "entry-b", postingTimestamp: "2026-06-30T12:10:00.000Z", quantityDelta: 5 }),
    receiptEntry({ ledgerEntryId: "entry-a", postingTimestamp: "2026-06-30T12:00:00.000Z", quantityDelta: 10 }),
  ], { projectionVersion: 3 });

  assert.equal(rebuild.processedCount, 2);
  assert.equal(getCurrentStock(rebuild.state, { productId: "product-1" })[0]?.quantity, 15);
  assert.equal(rebuild.state.runtime.projectionVersion, 4);
  assert.equal(rebuild.state.runtime.rebuildStatus, "idle");
  assert.equal(rebuild.state.runtime.lastProcessedLedgerEntryId, "entry-b");
});

test("idempotency prevents double application of the same ledger entry", () => {
  const state = createEmptyProjectionEngineState();
  const first = applyLedgerEntryToProjectionState(state, receiptEntry());
  const second = applyLedgerEntryToProjectionState(first.state, receiptEntry());
  assert.equal(second.applied, false);
  assert.equal(second.skippedReason, "already_applied");
  assert.equal(buildProjectionIdempotencyKey("entry-1"), "inventory.projection.apply:entry-1");
  assert.equal(INVENTORY_PROJECTION_IDEMPOTENCY_CONTRACT.skipAlreadyApplied, true);
});

test("projection-only write enforcement requires inventory projection service setting", () => {
  const issues: string[] = [];
  validateProjectionEngineWriteBoundary(null, (message) => issues.push(message));
  validateProjectionEngineWriteBoundary("false", (message) => issues.push(message));
  assert.equal(issues.length, 2);
  assert.equal(INVENTORY_PROJECTION_ENGINE_CONTRACT.writeSetting, "app.inventory_projection_service");
  assert.equal(INVENTORY_PROJECTION_ENGINE_CONTRACT.uiWritesAllowed, false);
});

test("serial current state derivation updates projection identity snapshot", () => {
  const state = applyLedgerEntryToProjectionState(createEmptyProjectionEngineState(), defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-serial",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { custodianSnapshot: { name: "Operator" }, objectLabelSnapshot: "AF260000001" },
    eventType: "posted",
    inventoryObjectType: "serial",
    inventoryStatus: "available",
    ledgerEntryId: "serial-entry-1",
    locationId: "location-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    quantityDelta: 1,
    serialId: "serial-1",
    warehouseId: "warehouse-1",
  })).state;

  const serialState = getSerialCurrentState(state, "serial-1");
  assert.equal(serialState?.currentWarehouseId, "warehouse-1");
  assert.equal(serialState?.currentLocationId, "location-1");
  assert.deepEqual(serialState?.currentCustodian, { name: "Operator" });
});

test("handling unit current state derivation updates placement projection", () => {
  const state = applyLedgerEntryToProjectionState(createEmptyProjectionEngineState(), defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-hu",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "CTN-0001" },
    eventType: "posted",
    handlingUnitId: "hu-1",
    inventoryObjectType: "handling_unit",
    inventoryStatus: "available",
    ledgerEntryId: "hu-entry-1",
    locationId: "location-2",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    quantityDelta: 1,
    warehouseId: "warehouse-1",
  })).state;

  const huState = getHandlingUnitCurrentState(state, "hu-1");
  assert.equal(huState?.warehouseId, "warehouse-1");
  assert.equal(huState?.locationId, "location-2");
});

test("no identity table mutation is allowed outside projection engine contracts", () => {
  assert.equal(INVENTORY_PROJECTION_ENGINE_CONTRACT.identityTableMutationAllowed, false);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.identityTablesDoNotOwnCurrentState, true);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.quantityOnIdentityTablesAllowed, false);
  assert.equal(isProjectionOnlyIdentityField("inventory_handling_units", "warehouse_id"), true);
  assert.equal(isProjectionOnlyIdentityField("inventory_handling_units", "location_id"), true);
});

test("read-only API behavior exposes ledger-backed current state without mutation surface", () => {
  const issues: string[] = [];
  validateProjectionReadOnlyApi("read", (message) => issues.push(message));
  validateProjectionReadOnlyApi("write", (message) => issues.push(message));
  assert.equal(issues.length, 1);

  const state = applyLedgerEntryToProjectionState(createEmptyProjectionEngineState(), receiptEntry()).state;
  assert.equal(getLedgerBackedCurrentState(state, { productId: "product-1" }).length >= 2, true);
  assert.deepEqual(INVENTORY_PROJECTION_ENGINE_CONTRACT.readApis, [
    "getCurrentStock",
    "getSerialCurrentState",
    "getHandlingUnitCurrentState",
    "getAvailabilitySnapshot",
    "getLedgerBackedCurrentState",
  ]);
});

test("projection event handlers process ledger projection events", () => {
  const created = processInventoryProjectionEvent(createEmptyProjectionEngineState(), {
    eventName: "LedgerEntryCreated",
    ledgerEntry: receiptEntry({ eventType: "created", quantityDelta: 10 }),
  });
  assert.equal(created.applied, false);

  const posted = processInventoryProjectionEvent(createEmptyProjectionEngineState(), {
    eventName: "LedgerPostingCompleted",
    ledgerEntry: receiptEntry(),
  });
  assert.equal(posted.applied, true);
  assert.equal(INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT.projectionRuntimeImplemented, true);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.projectionEngine.key, INVENTORY_PROJECTION_ENGINE_CONTRACT.key);
  assert.equal(INVENTORY_PROJECTION_REBUILD_CONTRACT.rebuildFunction, "rebuildProjectionFromLedger");
});
