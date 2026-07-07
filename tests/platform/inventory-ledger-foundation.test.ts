import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildLedgerAuditChain,
  defineInventoryLedgerEntry,
  INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT,
  INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_LEDGER_ARCHITECTURE_CONTRACT,
  INVENTORY_LEDGER_MOVEMENT_TYPES,
  INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT,
  INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT,
  INVENTORY_LEDGER_PROJECTION_EVENT_DEFINITIONS,
  INVENTORY_LEDGER_REVERSAL_CONTRACT,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  inventoryLedgerEntrySchema,
  validateInventoryLedgerEntry,
  validateLedgerReversalPair,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630183100_inventory_ledger_foundation.sql");

test("append-only enforcement is declared in migration and architecture contract", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /inventory_ledger_entries/);
  assert.match(sql, /prevent_inventory_ledger_entry_mutation/);
  assert.match(sql, /inventory_ledger_entries_prevent_update/);
  assert.match(sql, /inventory_ledger_entries_prevent_delete/);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.appendOnly, true);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.updatesForbidden, true);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.deletesForbidden, true);
});

test("update and delete are forbidden at database and contract layers", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /updates and deletes are forbidden/i);
  assert.equal(INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT.repositoryUpdateMethodsAllowed, false);
  assert.equal(INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT.repositoryDeleteMethodsAllowed, false);
});

test("reversal flow requires parent entry and negated quantity", () => {
  const original = defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { documentNumberSnapshot: "GR-001", objectLabelSnapshot: "Air Fryer" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    ledgerEntryId: "entry-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 10,
  });
  const reversal = defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { documentNumberSnapshot: "GR-001", objectLabelSnapshot: "Air Fryer" },
    eventType: "reversed",
    inventoryObjectType: "product_quantity",
    ledgerEntryId: "entry-2",
    movementDirection: "OUT",
    movementType: "goods_receipt",
    parentEntryId: "entry-1",
    postingTimestamp: "2026-06-30T12:05:00.000Z",
    productId: "product-1",
    quantityDelta: -10,
  });

  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateLedgerReversalPair(original, reversal, (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
  assert.equal(INVENTORY_LEDGER_REVERSAL_CONTRACT.negateQuantityDelta, true);
});

test("document requirement is enforced unless system adjustment metadata is present", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateInventoryLedgerEntry(inventoryLedgerEntrySchema.parse({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.adjustment",
    eventMetadata: { objectLabelSnapshot: "Steel Sheet" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    movementDirection: "IN",
    movementType: "adjustment",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 5,
  }), (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);

  validateInventoryLedgerEntry(inventoryLedgerEntrySchema.parse({
    businessModule: "inventory",
    correlationId: "corr-2",
    documentType: "inventory.system-adjustment",
    eventMetadata: { objectLabelSnapshot: "System Adjustment", systemAdjustment: true },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    movementDirection: "IN",
    movementType: "adjustment",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 2,
  }), (message, path) => issues.push({ message, path }));
  assert.equal(issues.filter((issue) => /document/i.test(issue.message)).length, 0);
});

test("movement type validation rejects unknown causes at schema level", () => {
  assert.deepEqual(INVENTORY_LEDGER_MOVEMENT_TYPES, [
    "goods_receipt", "goods_issue", "transfer", "adjustment", "cycle_count",
    "production_receipt", "material_issue", "return", "scrap", "repack",
  ]);
  assert.equal(inventoryLedgerEntrySchema.safeParse({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "Air Fryer" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    movementDirection: "IN",
    movementType: "unknown_cause",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 1,
  }).success, false);
});

test("inventory object validation integrates InventoryObjectRef rules", () => {
  const issues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateInventoryLedgerEntry(inventoryLedgerEntrySchema.parse({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-issue",
    eventMetadata: { objectLabelSnapshot: "AF260000001" },
    eventType: "posted",
    inventoryObjectType: "serial",
    movementDirection: "OUT",
    movementType: "goods_issue",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    quantityDelta: -1,
    serialId: "serial-1",
  }), (message, path) => issues.push({ message, path }));
  assert.equal(issues.length, 0);
});

test("immutable history and audit reconstruction preserve parent chain", () => {
  const original = defineInventoryLedgerEntry({
    businessModule: "inventory",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "Air Fryer" },
    eventType: "posted",
    inventoryObjectType: "product_quantity",
    ledgerEntryId: "entry-1",
    movementDirection: "IN",
    movementType: "goods_receipt",
    postingTimestamp: "2026-06-30T12:00:00.000Z",
    productId: "product-1",
    quantityDelta: 10,
  });
  const reversal = defineInventoryLedgerEntry({
    businessModule: "inventory",
    causationId: "entry-1",
    correlationId: "corr-1",
    documentId: "doc-1",
    documentLineId: "line-1",
    documentType: "inventory.goods-receipt",
    eventMetadata: { objectLabelSnapshot: "Air Fryer" },
    eventType: "reversed",
    inventoryObjectType: "product_quantity",
    ledgerEntryId: "entry-2",
    movementDirection: "OUT",
    movementType: "goods_receipt",
    parentEntryId: "entry-1",
    postingTimestamp: "2026-06-30T12:05:00.000Z",
    productId: "product-1",
    quantityDelta: -10,
  });
  const chain = buildLedgerAuditChain([original, reversal]);
  assert.equal(chain[1]?.parent?.ledgerEntryId, "entry-1");
  assert.equal(INVENTORY_LEDGER_REVERSAL_CONTRACT.preserveHistory, true);
});

test("projection event publishing readiness is registered without runtime", () => {
  assert.deepEqual(INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT.events, [
    "LedgerEntryCreated",
    "LedgerEntryReversed",
    "LedgerPostingCompleted",
  ]);
  assert.equal(INVENTORY_LEDGER_PROJECTION_EVENTS_CONTRACT.projectionRuntimeImplemented, true);
  assert.equal(INVENTORY_LEDGER_PROJECTION_EVENT_DEFINITIONS.length, 3);
  assert.equal(INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.ledgerTable, "inventory_ledger_entries");
});

test("security enforcement allows only posting engine writes", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /app\.inventory_posting_engine/);
  assert.match(sql, /inventory\.stock\.post/);
  assert.equal(INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT.writeSetting, "app.inventory_posting_engine");
  assert.equal(INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT.uiPostingAllowed, false);
});

test("no direct mutation APIs and no balance calculation in ledger foundation", () => {
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.directMutationApisAllowed, false);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.balanceCalculationImplemented, false);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.availabilityCalculationImplemented, false);
  assert.equal(INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.postingRuntimeImplemented, false);
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /no balance calculation, projection runtime, or posting UI/i);
  assert.doesNotMatch(sql, /\bupdate\b public\.inventory_ledger_entries set/i);
});

test("platform readiness contracts register ledger search and foundation contracts", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.ledgerArchitecture.key, INVENTORY_LEDGER_ARCHITECTURE_CONTRACT.key);
  assert.equal(INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.ledgerIntegrationReady, true);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.ledgerPostingEngine.key, INVENTORY_LEDGER_POSTING_ENGINE_CONTRACT.key);
  const ledgerSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_ledger_entry");
  assert.deepEqual(ledgerSearch?.quickSearchFields, [
    "movementType",
    "movementDirection",
    "documentType",
    "businessModule",
    "correlationId",
    "inventoryObjectType",
    "inventoryStatus",
  ]);
});
