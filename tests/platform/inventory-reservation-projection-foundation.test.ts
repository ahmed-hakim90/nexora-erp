import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  allocateReservation,
  calculateShortage,
  createEmptyProjectionEngineState,
  createEmptyReservationEngineState,
  defineInventoryLedgerEntry,
  expireReservation,
  getReservableAvailability,
  getReservationSnapshot,
  INVENTORY_RESERVATION_ALLOCATION_STRATEGIES,
  INVENTORY_RESERVATION_AVAILABILITY_CONTRACT,
  INVENTORY_RESERVATION_DEMAND_SOURCES,
  INVENTORY_RESERVATION_ENGINE_CONTRACT,
  INVENTORY_RESERVATION_EVENTS_CONTRACT,
  INVENTORY_RESERVATION_EXPIRY_CONTRACT,
  INVENTORY_RESERVATION_FOUNDATION_LIFECYCLE_CONTRACT,
  INVENTORY_RESERVATION_FOUNDATION_STATUSES,
  INVENTORY_FOUNDATION_CONTRACTS,
  inventoryReservationLineSchema,
  inventoryReservationSchema,
  isSerialAlreadyReserved,
  releaseReservation,
  validateInventoryReservation,
  validateInventoryReservationLine,
  validateReservationEngineWriteBoundary,
  validateReservationObjectRules,
  applyLedgerEntryToProjectionState,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630185100_inventory_reservation_projection_foundation.sql");

function projectionWithProductStock(quantity: number) {
  let state = createEmptyProjectionEngineState();
  state = applyLedgerEntryToProjectionState(state, defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-stock",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "Air Fryer" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    inventoryStatus: "available",
    ledgerEntryId: "ledger-1",
    locationId: "location-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: quantity,
    warehouseId: "warehouse-1",
  })).state;
  return state;
}

function baseReservation(overrides: Record<string, unknown> = {}) {
  return {
    correlationId: "corr-1",
    demandStatus: "requested",
    lines: [{
      lineNumber: 1,
      objectLabel: "Air Fryer",
      objectType: "product_quantity",
      productId: "product-1",
      requestedQuantity: 10,
      warehouseId: "warehouse-1",
    }],
    priority: 1,
    reservationId: "res-1",
    reservationNumber: "RSV-001",
    sourceDocumentId: "doc-1",
    sourceDocumentLineId: "line-1",
    sourceDocumentType: "inventory.goods-issue",
    sourceModule: "sales",
    ...overrides,
  };
}

test("reservation projection migration adds allocations, expiry queue, and engine guards", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /inventory_reservation_allocations/);
  assert.match(sql, /inventory_reservation_expiry_queue/);
  assert.match(sql, /inventory_reservation_engine_guard/);
  assert.match(sql, /enforce_inventory_reservation_engine_writes/);
  assert.match(sql, /inventory_reservation_allocations_active_serial_uq/);
  assert.match(sql, /demand_status/);
  assert.match(sql, /allocation_strategy/);
});

test("reservation contracts register demand sources, statuses, and allocation strategies", () => {
  assert.deepEqual(INVENTORY_RESERVATION_DEMAND_SOURCES, [
    "sales", "manufacturing", "service", "internal_transfer", "rental", "project", "manual_inventory", "fleet",
  ]);
  assert.deepEqual(INVENTORY_RESERVATION_FOUNDATION_STATUSES, [
    "draft", "requested", "partially_reserved", "reserved", "released", "expired", "cancelled", "failed",
  ]);
  assert.deepEqual(INVENTORY_RESERVATION_ALLOCATION_STRATEGIES, [
    "strict_serial", "strict_lot", "any_available", "fifo", "fefo", "location_priority", "manual",
  ]);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.reservationFoundationLifecycle.key, INVENTORY_RESERVATION_FOUNDATION_LIFECYCLE_CONTRACT.key);
});

test("reservation line InventoryObjectRef validation enforces object-specific rules", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const line = inventoryReservationLineSchema.parse({
    lineNumber: 1,
    objectLabel: "AF260000001",
    objectType: "serial",
    requestedQuantity: 1,
    serialId: "serial-1",
  });
  validateInventoryReservationLine(line, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
  assert.equal(inventoryReservationSchema.safeParse(baseReservation()).success, true);
});

test("availability integration reads projected availability not identity tables", () => {
  const state = createEmptyReservationEngineState(projectionWithProductStock(12));
  const availability = getReservableAvailability(state, { productId: "product-1", warehouseId: "warehouse-1" });
  assert.equal(availability[0]?.availableQuantity, 12);
  assert.equal(INVENTORY_RESERVATION_AVAILABILITY_CONTRACT.projectionTable, "inventory_current_state_projections");
  assert.equal(INVENTORY_RESERVATION_AVAILABILITY_CONTRACT.identityTablesForbidden, true);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.availabilitySource, "inventory_current_state_projections");
});

test("full reservation allocates entire requested quantity", () => {
  const engine = createEmptyReservationEngineState(projectionWithProductStock(10));
  const reservation = inventoryReservationSchema.parse(baseReservation());
  const { result } = allocateReservation(engine, reservation);
  assert.equal(result.demandStatus, "reserved");
  assert.equal(result.eventName, "InventoryReservationCompleted");
  assert.equal(result.lines[0]?.reservedQuantity, 10);
  assert.equal(result.lines[0]?.shortageQuantity, 0);
});

test("partial reservation detects shortage against projected availability", () => {
  const engine = createEmptyReservationEngineState(projectionWithProductStock(6));
  const reservation = inventoryReservationSchema.parse(baseReservation());
  const { result } = allocateReservation(engine, reservation);
  assert.equal(result.demandStatus, "partially_reserved");
  assert.equal(result.eventName, "InventoryReservationPartiallyReserved");
  assert.equal(result.lines[0]?.reservedQuantity, 6);
  assert.equal(result.lines[0]?.shortageQuantity, 4);
  assert.equal(calculateShortage(10, 6), 4);
});

test("release and expire reservation clear active claims without stock mutation", () => {
  const engine = createEmptyReservationEngineState(projectionWithProductStock(10));
  const reservation = inventoryReservationSchema.parse(baseReservation());
  const allocated = allocateReservation(engine, reservation);
  const released = releaseReservation(allocated.state, reservation.reservationId, "cancelled by operator");
  assert.equal(released.released, true);
  assert.equal(released.state.reservations.get(reservation.reservationId)?.demandStatus, "released");
  const expired = expireReservation(released.state, reservation.reservationId);
  assert.equal(expired.expired, true);
  assert.equal(expired.state.reservations.get(reservation.reservationId)?.demandStatus, "expired");
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.stockMutationAllowed, false);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.ledgerMutationAllowed, false);
});

test("serial duplicate reservation prevention blocks second claim", () => {
  const projectionState = applyLedgerEntryToProjectionState(projectionWithProductStock(1), defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-serial",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "AF260000001" },
    eventType: "posted",
    inventoryObjectType: "serial",
    inventoryStatus: "available",
    ledgerEntryId: "ledger-serial",
    locationId: "location-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    quantityDelta: 1,
    serialId: "serial-1",
    warehouseId: "warehouse-1",
  })).state;
  const reservationState = createEmptyReservationEngineState(projectionState);
  const first = allocateReservation(reservationState, inventoryReservationSchema.parse(baseReservation({
    lines: [{ lineNumber: 1, objectLabel: "AF260000001", objectType: "serial", requestedQuantity: 1, serialId: "serial-1" }],
  })));
  assert.equal(isSerialAlreadyReserved(first.state, "serial-1"), true);
  const second = allocateReservation(first.state, inventoryReservationSchema.parse(baseReservation({
    reservationId: "res-2",
    reservationNumber: "RSV-002",
    lines: [{ lineNumber: 1, objectLabel: "AF260000001", objectType: "serial", requestedQuantity: 1, serialId: "serial-1" }],
  })));
  assert.equal(second.result.lines[0]?.reservedQuantity, 0);
});

test("lot and product quantity rules validate required anchors", () => {
  const issues: string[] = [];
  const engine = createEmptyReservationEngineState(projectionWithProductStock(5));
  validateReservationObjectRules({
    lineNumber: 1,
    lotId: "lot-1",
    objectType: "lot_quantity",
    requestedQuantity: 3,
  }, engine, (message) => issues.push(message));
  validateReservationObjectRules({
    lineNumber: 1,
    objectType: "product_quantity",
    requestedQuantity: 3,
  }, engine, (message) => issues.push(message));
  assert.match(issues.join(" "), /product_id/i);
});

test("event readiness and expiry metadata are registered without scheduler runtime", () => {
  assert.deepEqual(INVENTORY_RESERVATION_EVENTS_CONTRACT.events, [
    "InventoryReservationRequested",
    "InventoryReservationCreated",
    "InventoryReservationPartiallyReserved",
    "InventoryReservationCompleted",
    "InventoryReservationReleased",
    "InventoryReservationExpired",
    "InventoryReservationFailed",
  ]);
  assert.equal(INVENTORY_RESERVATION_EXPIRY_CONTRACT.schedulerImplemented, false);
  assert.equal(INVENTORY_RESERVATION_EXPIRY_CONTRACT.backgroundJobReadiness, true);
});

test("security enforcement requires reservation engine setting and forbids direct stock mutation", () => {
  const issues: string[] = [];
  validateReservationEngineWriteBoundary(null, (message) => issues.push(message));
  assert.equal(issues.length, 1);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.writeSetting, "app.inventory_reservation_engine");
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.identityTableReadsForbidden, true);
});

test("read-only reservation snapshot summarizes requested, reserved, and shortage totals", () => {
  const reservation = inventoryReservationSchema.parse(baseReservation());
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateInventoryReservation(reservation, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
  const snapshot = getReservationSnapshot(reservation, [{
    allocationStrategy: "any_available",
    lineNumber: 1,
    requestedQuantity: 10,
    reservedQuantity: 7,
    shortageQuantity: 3,
  }]);
  assert.equal(snapshot.totalRequested, 10);
  assert.equal(snapshot.totalReserved, 7);
  assert.equal(snapshot.totalShortage, 3);
});
