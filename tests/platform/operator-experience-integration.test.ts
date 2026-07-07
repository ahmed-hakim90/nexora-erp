import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const purchasingPages = readFileSync("src/app/(erp)/erp/purchasing/_components/purchasing-pages.tsx", "utf8");
const inventoryTransactions = readFileSync("src/app/(erp)/erp/inventory/_components/transaction-pages.tsx", "utf8");
const productPanel = readFileSync("src/app/(erp)/erp/inventory/products/product-record-panel.tsx", "utf8");
const dailyReportPanel = readFileSync("src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx", "utf8");
const manufacturingModal = readFileSync("src/app/(erp)/erp/manufacturing/_components/manufacturing-record-modal.tsx", "utf8");

test("purchasing operator forms use lookup selectors instead of raw ID entry", () => {
  for (const forbiddenLabel of [
    "Branch ID",
    "Supplier ID",
    "Purchase Order ID",
    "Destination Warehouse ID",
    "Destination Location ID",
    "Product ID",
    "Unit ID",
    "Purchase Order Line ID",
  ]) {
    assert.equal(purchasingPages.includes(forbiddenLabel), false);
  }

  assert.match(purchasingPages, /EntityLookup/);
  assert.match(purchasingPages, /name="supplierId"/);
  assert.match(purchasingPages, /name="productId"/);
  assert.match(purchasingPages, /name="destinationWarehouseId"/);
});

test("operator posting actions do not ask users for idempotency keys", () => {
  assert.equal(purchasingPages.includes("Posting idempotency key"), false);
  assert.equal(purchasingPages.includes("Reversal idempotency key"), false);
  assert.equal(inventoryTransactions.includes("Posting idempotency key"), false);
  assert.equal(inventoryTransactions.includes("Reversal idempotency key"), false);
  assert.match(purchasingPages, /type="hidden" value=\{hiddenIdempotencyKey/);
  assert.match(inventoryTransactions, /type="hidden" value=\{hiddenIdempotencyKey/);
});

test("priority operational forms render OX context, defaults, scanner, progressive, and wizard primitives", () => {
  for (const source of [purchasingPages, inventoryTransactions, dailyReportPanel]) {
    assert.match(source, /OperatorContextBar/);
    assert.match(source, /SmartDefaultsSummary/);
    assert.match(source, /ScannerInputFrame/);
    assert.match(source, /OperatorProgressiveSection/);
    assert.match(source, /OperatorWizardProgress/);
  }
});

test("product and manufacturing forms adopt OX scanner and progressive sections", () => {
  assert.match(productPanel, /OperatorProgressiveSection/);
  assert.match(productPanel, /ScannerInputFrame/);
  assert.match(productPanel, /OperatorErrorMessage/);
  assert.match(manufacturingModal, /OperatorProgressiveSection/);
  assert.match(manufacturingModal, /ScannerInputFrame/);
});

test("operator-safe error components replace generic visible error blocks in priority modals", () => {
  assert.match(productPanel, /createOxOperatorError/);
  assert.match(productPanel, /OperatorErrorMessage/);
  assert.match(dailyReportPanel, /createOxOperatorError/);
  assert.match(dailyReportPanel, /OperatorErrorMessage/);
  assert.match(purchasingPages, /OperatorErrorMessage/);
});

test("mobile and handheld readiness uses larger task controls on changed forms", () => {
  for (const source of [purchasingPages, inventoryTransactions]) {
    assert.match(source, /min-h-12/);
    assert.match(source, /text-base/);
  }
  assert.match(dailyReportPanel, /ScannerInputFrame/);
});

test("operator-facing OX integration sources do not embed literal UUIDs", () => {
  const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
  for (const source of [purchasingPages, inventoryTransactions, productPanel, dailyReportPanel, manufacturingModal]) {
    assert.equal(uuidRegex.test(source), false);
  }
});
