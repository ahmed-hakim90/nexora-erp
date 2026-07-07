import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertChildHuCurrentUniqueness,
  assertSerialCurrentUniqueness,
  buildInventoryFoundationMutationSchema,
  defineInventoryHandlingUnit,
  defineInventoryHandlingUnitContent,
  formatHandlingUnitLabel,
  getInventoryFoundationEntity,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT,
  INVENTORY_HANDLING_UNIT_CONTENT_TYPES,
  INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES,
  INVENTORY_HANDLING_UNIT_STATUSES,
  INVENTORY_PERMISSIONS,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  inventoryHandlingUnitContentMutationSchema,
  inventoryHandlingUnitMutationSchema,
  inventoryHandlingUnitTypeMutationSchema,
  isCurrentHandlingUnitContent,
  validateHandlingUnitContentPayload,
  validateHandlingUnitOpenClosedMetadata,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630170000_inventory_handling_units_foundation.sql");

test("handling unit type validation enforces container metadata", () => {
  const schema = inventoryHandlingUnitTypeMutationSchema;
  assert.equal(schema.safeParse({
    childAllowed: "true",
    level: 1,
    name: "Carton",
    parentAllowed: "false",
    reusable: "true",
    status: "active",
    typeKey: "CTN",
  }).success, true);
  assert.equal(schema.safeParse({
    childAllowed: "true",
    level: -1,
    name: "Invalid",
    parentAllowed: "false",
    reusable: "true",
    status: "active",
    typeKey: "bad",
  }).success, false);
});

test("handling unit hierarchy contracts model parent and child readiness", () => {
  const pallet = defineInventoryHandlingUnit({
    barcode: "PLT-000001",
    branchId: "cairo-branch",
    companyId: "company-1",
    huNumber: "PLT-000001",
    huStatus: "packed",
    lifecycleState: "traceable",
    mergeReady: true,
    repackReady: false,
    splitReady: true,
    status: "active",
    tenantId: "tenant-1",
    traceabilityReady: true,
    typeKey: "plt",
    warehouseKey: "main-cairo",
  });

  const carton = defineInventoryHandlingUnitContent({
    addedAt: "2026-06-30T10:00:00.000Z",
    branchId: "cairo-branch",
    childHuNumber: "CTN-000001",
    companyId: "company-1",
    contentType: "child_handling_unit",
    huNumber: "PLT-000001",
    quantity: 1,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(pallet.splitReady, true);
  assert.equal(carton.contentType, "child_handling_unit");
});

test("content type validation enforces payload shape per content type", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const report = (message: string, path: readonly (string | number)[]) => {
    issues.push({ message, path });
  };

  validateHandlingUnitContentPayload({
    childHuId: "child-hu-1",
    contentType: "child_handling_unit",
    handlingUnitId: "parent-hu-1",
    quantity: 1,
  }, report);
  assert.equal(issues.length, 0);

  validateHandlingUnitContentPayload({
    contentType: "serial_reference",
    quantity: 2,
    serialId: "serial-1",
  }, report);
  assert.match(issues.at(-1)?.message ?? "", /exactly 1/);
});

test("serial current uniqueness is enforced across current content rows", () => {
  const rows = [
    { contentType: "serial_reference" as const, removedAt: null, serialId: "serial-1" },
    { contentType: "serial_reference" as const, removedAt: null, serialId: "serial-1" },
    { contentType: "serial_reference" as const, removedAt: "2026-06-30T12:00:00.000Z", serialId: "serial-1" },
  ];

  assert.equal(assertSerialCurrentUniqueness(rows), false);
  assert.equal(assertSerialCurrentUniqueness(rows.slice(2)), true);
});

test("child handling unit current uniqueness is enforced across current content rows", () => {
  const rows = [
    { childHuId: "ctn-1", contentType: "child_handling_unit" as const, removedAt: null },
    { childHuId: "ctn-1", contentType: "child_handling_unit" as const, removedAt: null },
  ];

  assert.equal(assertChildHuCurrentUniqueness(rows), false);
});

test("opened and closed metadata validation requires lifecycle timestamps", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const report = (message: string, path: readonly (string | number)[]) => {
    issues.push({ message, path });
  };

  validateHandlingUnitOpenClosedMetadata({
    closedAt: null,
    huStatus: "closed",
    lifecycleState: "closed",
    openedAt: null,
  }, report);

  assert.equal(issues.length, 2);
  assert.equal(inventoryHandlingUnitMutationSchema.safeParse({
    barcode: "CTN-000001",
    huNumber: "CTN-000001",
    huStatus: "closed",
    huTypeId: "type-1",
    lifecycleState: "closed",
    mergeReady: "false",
    repackReady: "false",
    splitReady: "false",
    status: "active",
    traceabilityReady: "true",
    warehouseId: "warehouse-1",
  }).success, false);
});

test("handling unit migration adds architecture tables without quantity movement leakage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of [
    "inventory_handling_unit_types",
    "inventory_handling_units",
    "inventory_handling_unit_contents",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
  }

  assert.match(sql, /inventory_handling_unit_contents_current_serial_uq/);
  assert.match(sql, /inventory_handling_unit_contents_current_child_hu_uq/);
  assert.match(sql, /removed_at is null and serial_id is not null/);
  assert.match(sql, /no stock deductions, ledger posting, or movement confirmation/i);
  assert.doesNotMatch(sql, /quantity_on_hand|quantity_reserved|stock_balance|stock_movement|pick_task|pack_task/i);
});

test("barcode and QR readiness contracts are registered", () => {
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.barcodeReady, true);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.qrReady, true);
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.huStatuses, INVENTORY_HANDLING_UNIT_STATUSES);
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.lifecycleStates, INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES);
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.contentTypes, INVENTORY_HANDLING_UNIT_CONTENT_TYPES);
});

test("platform readiness contracts register handling unit search and foundation contracts", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.handlingUnitArchitecture.key, INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.key);
  assert.deepEqual(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.appIntegrations, [
    "app-registry",
    "search",
    "reporting",
    "print",
    "dashboard",
    "import-export",
    "traceability",
    "warehouse-execution",
  ]);
  assert.equal(INVENTORY_PERMISSIONS.handlingUnitsManage, "inventory.handling-units.manage");

  const handlingUnitSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_handling_unit");
  assert.deepEqual(handlingUnitSearch?.quickSearchFields, ["huNumber", "barcode", "typeKey", "huStatus", "lifecycleState", "locationKey"]);
});

test("traceability readiness preserves current content via removed_at and never deletes history", () => {
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.currentContentRule, "removed_at is null");
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.historicalContentNeverDeleted, true);
  assert.equal(isCurrentHandlingUnitContent({ removedAt: null }), true);
  assert.equal(isCurrentHandlingUnitContent({ removedAt: "2026-06-30T12:00:00.000Z" }), false);
});

test("handling unit labels avoid UUID exposure and follow business display format", () => {
  assert.equal(
    formatHandlingUnitLabel({
      huNumber: "CTN-000001",
      huStatus: "closed",
      locationLabel: "FG-A-01-B-03",
      typeName: "Carton",
    }),
    "CTN-000001 — Carton — Closed — FG-A-01-B-03",
  );
  assert.equal(
    formatHandlingUnitLabel({
      childCount: 20,
      huNumber: "PLT-000001",
      huStatus: "packed",
      typeName: "Pallet",
    }),
    "PLT-000001 — Pallet — 20 cartons",
  );
});

test("foundation mutation schemas register handling unit resources", () => {
  const typeSchema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("handling-unit-types"));
  const unitSchema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("handling-units"));
  const contentSchema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("handling-unit-contents"));

  assert.equal(typeSchema.safeParse({
    childAllowed: "true",
    level: 2,
    name: "Pallet",
    parentAllowed: "true",
    reusable: "true",
    status: "active",
    typeKey: "plt",
  }).success, true);

  assert.equal(unitSchema.safeParse({
    barcode: "CTN-000001",
    closedAt: "2026-06-30T12:00:00.000Z",
    huNumber: "CTN-000001",
    huStatus: "closed",
    huTypeId: "type-1",
    lifecycleState: "closed",
    mergeReady: "false",
    openedAt: "2026-06-30T10:00:00.000Z",
    repackReady: "false",
    splitReady: "false",
    status: "active",
    traceabilityReady: "true",
    warehouseId: "warehouse-1",
  }).success, true);

  assert.equal(contentSchema.safeParse({
    childHuId: "child-hu-1",
    contentType: "child_handling_unit",
    handlingUnitId: "parent-hu-1",
    quantity: 1,
    status: "active",
  }).success, true);

  assert.equal(inventoryHandlingUnitContentMutationSchema.safeParse({
    contentType: "product_quantity",
    handlingUnitId: "hu-1",
    productId: "product-1",
    quantity: 5,
    status: "active",
  }).success, true);
});

test("no quantity movement leakage is declared in handling unit architecture contract", () => {
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.quantityMovementImplemented, false);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.stockDeductionImplemented, false);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.ledgerPostingImplemented, false);
  assert.equal(INVENTORY_HANDLING_UNIT_ARCHITECTURE_CONTRACT.runtimeExecutionImplemented, false);
});
