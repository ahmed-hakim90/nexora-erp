import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OX_WAREHOUSE_SCANNER_CONTRACTS,
  WAREHOUSE_EXECUTION_FLOWS,
  advanceWarehouseStep,
  createWarehouseExecutionDraft,
  mergeDuplicateWarehouseLine,
  parseWarehouseDraft,
  resolveWarehouseScan,
  serializeWarehouseDraft,
  warehouseDraftStorageKey,
  warehouseFlowForTransactionSlug,
  warehouseWizardState,
} from "@/platform/operator-experience/warehouse-execution";

const catalog = {
  documents: [{ documentKey: "PO-1001", id: "doc-1", label: "PO-1001 — Widgets" }],
  locations: [{ id: "loc-1", label: "A1 — Main Bin", locationKey: "a1", warehouseId: "wh-1" }],
  lots: [{ id: "lot-1", label: "lot-alpha", lotKey: "lot-alpha", productId: "prod-1" }],
  products: [{
    barcode: "889977",
    hasLotTracking: true,
    hasSerialTracking: false,
    id: "prod-1",
    label: "SKU-1 — Widget",
    sku: "SKU-1",
    unitId: "uom-1",
  }],
  serials: [{ id: "serial-1", label: "SN-001", productId: "prod-1", serialKey: "SN-001" }],
  warehouses: [{ id: "wh-1", label: "WH-1 — Main", warehouseKey: "wh-1" }],
} as const;

test("warehouse scanner contracts cover product, location, lot, serial, and document targets", () => {
  const targets = new Set(OX_WAREHOUSE_SCANNER_CONTRACTS.map((contract) => contract.target));
  assert.equal(targets.has("product"), true);
  assert.equal(targets.has("warehouse-location"), true);
  assert.equal(targets.has("lot"), true);
  assert.equal(targets.has("serial"), true);
  assert.equal(targets.has("transfer-document"), true);
});

test("scanner-first goods receipt flow follows document to review steps", () => {
  const flow = WAREHOUSE_EXECUTION_FLOWS["goods-receipt"];
  assert.deepEqual(flow.steps.map((step) => step.key), ["document", "product", "quantity", "location", "tracking", "review"]);
  assert.equal(warehouseFlowForTransactionSlug("goods-receipt")?.transactionType, "goods_receipt");
});

test("scanner-first goods issue flow starts with document and source location scans", () => {
  const flow = WAREHOUSE_EXECUTION_FLOWS["goods-issue"];
  assert.equal(flow.steps[0]?.key, "document");
  assert.equal(flow.steps[1]?.key, "source-location");
  assert.equal(flow.transactionType, "goods_issue");
});

test("scanner-first transfer flow scans source, product, quantity, destination, and review", () => {
  const flow = WAREHOUSE_EXECUTION_FLOWS["warehouse-transfer"];
  assert.deepEqual(flow.steps.map((step) => step.key), ["source", "product", "quantity", "destination", "review"]);
});

test("cycle count scan flow scans location, product, counted quantity, variance, and review", () => {
  const flow = WAREHOUSE_EXECUTION_FLOWS["cycle-count"];
  assert.deepEqual(flow.steps.map((step) => step.key), ["location", "product", "counted", "variance", "review"]);
});

test("resolveWarehouseScan accepts product SKU and barcode and rejects raw UUIDs", () => {
  const bySku = resolveWarehouseScan("product", "sku-1", catalog);
  const byBarcode = resolveWarehouseScan("product", "889977", catalog);
  const invalid = resolveWarehouseScan("product", "0fdb5917-f533-4ad5-9b4d-91f427dd7ed4", catalog);

  assert.equal("id" in bySku, true);
  assert.equal("id" in byBarcode, true);
  if ("id" in bySku) assert.equal(bySku.label, "SKU-1 — Widget");
  assert.equal("code" in invalid, true);
  if ("code" in invalid) assert.equal(invalid.code, "SCAN_RAW_ID_REJECTED");
});

test("invalid scan returns operator-safe error for unknown location", () => {
  const result = resolveWarehouseScan("warehouse-location", "missing-bin", catalog);
  assert.equal("code" in result, true);
  if ("code" in result) {
    assert.equal(result.code, "LOCATION_NOT_FOUND");
    assert.equal(result.problem.includes("0fdb5917"), false);
  }
});

test("duplicate scan merges line quantity for same product and location", () => {
  const draft = createWarehouseExecutionDraft({ branchId: "branch-1", flowKey: "goods-receipt" });
  const line = {
    destinationLocationId: "loc-1",
    destinationLocationLabel: "A1 — Main Bin",
    destinationWarehouseId: "wh-1",
    key: "line-1",
    productId: "prod-1",
    productLabel: "SKU-1 — Widget",
    quantity: 2,
    unitId: "uom-1",
  };
  const first = mergeDuplicateWarehouseLine({ ...draft, destinationLocationId: "loc-1" }, line);
  const second = mergeDuplicateWarehouseLine(first.draft, { ...line, key: "line-2", quantity: 3 });

  assert.equal(first.merged, false);
  assert.equal(second.merged, true);
  assert.equal(second.draft.lines[0]?.quantity, 5);
});

test("warehouse draft preservation serializes and restores active step and lines", () => {
  const draft = advanceWarehouseStep({
    ...createWarehouseExecutionDraft({ branchId: "branch-1", flowKey: "warehouse-transfer" }),
    lines: [{
      destinationLocationId: "loc-2",
      key: "line-1",
      productId: "prod-1",
      productLabel: "SKU-1 — Widget",
      quantity: 1,
      sourceLocationId: "loc-1",
      unitId: "uom-1",
    }],
  });
  const raw = serializeWarehouseDraft(draft);
  const restored = parseWarehouseDraft(raw);

  assert.equal(restored?.flowKey, "warehouse-transfer");
  assert.equal(restored?.lines.length, 1);
  assert.equal(restored?.completedStepKeys.includes("source"), true);
  assert.equal(warehouseDraftStorageKey("goods-receipt", "branch-1"), "nexora.warehouse-draft.goods-receipt.branch-1");
});

test("warehouse wizard state exposes progress for active scanner step", () => {
  const draft = {
    ...createWarehouseExecutionDraft({ branchId: "branch-1", flowKey: "goods-receipt" }),
    activeStepKey: "product" as const,
    completedStepKeys: ["document"],
  };
  const state = warehouseWizardState(draft);
  assert.equal(state.activeStepKey, "product");
  assert.equal(state.canSaveDraft, true);
});

test("scanner-first UI sources use focused scanner input and handheld touch targets", () => {
  const workspace = readFileSync("src/shared/ui/operator-experience/warehouse-scanner-workspace.tsx", "utf8");
  const scannerInput = readFileSync("src/shared/ui/operator-experience/scanner-focus-input.tsx", "utf8");
  const pages = readFileSync("src/app/(erp)/erp/inventory/_components/warehouse-execution-pages.tsx", "utf8");

  assert.match(scannerInput, /autoFocus/);
  assert.match(scannerInput, /min-h-14/);
  assert.match(scannerInput, /event\.key === "Enter"/);
  assert.match(workspace, /ScanHistoryPanel/);
  assert.match(workspace, /OperatorContextBar/);
  assert.match(workspace, /localStorage/);
  assert.match(workspace, /EntityLookup/);
  assert.match(pages, /\/erp\/inventory\/warehouse\//);
});

test("warehouse execution routes redirect legacy new transaction paths to scanner flows", () => {
  const newRoute = readFileSync("src/app/(erp)/erp/inventory/[transactionType]/new/page.tsx", "utf8");
  assert.match(newRoute, /\/erp\/inventory\/warehouse\//);
  assert.match(newRoute, /goods-receipt/);
  assert.match(newRoute, /goods-issue/);
  assert.match(newRoute, /warehouse-transfer/);
  assert.match(newRoute, /cycle-count/);
});

test("operator-facing warehouse scanner sources do not embed literal UUIDs", () => {
  const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
  for (const path of [
    "src/shared/ui/operator-experience/warehouse-scanner-workspace.tsx",
    "src/shared/ui/operator-experience/scanner-focus-input.tsx",
    "src/app/(erp)/erp/inventory/_components/warehouse-execution-pages.tsx",
    "src/platform/operator-experience/warehouse-execution.ts",
  ]) {
    assert.equal(uuidRegex.test(readFileSync(path, "utf8")), false);
  }
});
