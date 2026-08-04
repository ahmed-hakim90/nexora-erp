import assert from "node:assert/strict";
import test from "node:test";

import {
  assessRoutingReadiness,
  explodeBomLines,
  isApprovedBomStatus,
  resolveProductionStandard,
} from "@/features/manufacturing/public-api";

test("MFG-02 BOM explosion applies scrap to finished quantity", () => {
  const result = explodeBomLines(100, [
    {
      componentProductId: "raw-1",
      lineId: "l1",
      lineNumber: 1,
      quantity: 2,
      scrapPercent: 10,
      status: "active",
      uomId: "uom-pcs",
    },
    {
      componentProductId: "raw-2",
      lineId: "l2",
      lineNumber: 2,
      quantity: 1,
      scrapPercent: 0,
      status: "draft",
      uomId: "uom-kg",
    },
    {
      componentProductId: "raw-3",
      lineId: "l3",
      lineNumber: 3,
      quantity: 5,
      scrapPercent: 0,
      status: "archived",
      uomId: "uom-pcs",
    },
  ]);

  assert.equal(result.lineCount, 2);
  assert.equal(result.requirements[0]?.requiredQuantity, 220);
  assert.equal(result.requirements[1]?.requiredQuantity, 100);
  assert.equal(isApprovedBomStatus("active"), true);
  assert.equal(isApprovedBomStatus("draft"), false);
});

test("MFG-02 BOM explosion rejects non-positive finished quantity", () => {
  assert.throws(() => explodeBomLines(0, []), /greater than zero/);
});

test("MFG-02 routing readiness requires active header and complete steps", () => {
  const notReady = assessRoutingReadiness({
    status: "draft",
    steps: [{ operationId: "op-1", status: "active", stepSequence: 1, workCenterId: "wc-1" }],
  });
  assert.equal(notReady.ready, false);
  assert.ok(notReady.reasons.some((reason) => /active/i.test(reason)));

  const ready = assessRoutingReadiness({
    status: "active",
    steps: [
      { operationId: "op-1", status: "active", stepSequence: 1, workCenterId: "wc-1" },
      { operationId: "op-2", status: "draft", stepSequence: 2, workCenterId: "wc-2" },
    ],
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.activeStepCount, 2);
});

test("MFG-02 production standard resolves shift then line fallback", () => {
  const candidates = [
    {
      dailyTargetQty: 800,
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      id: "std-line",
      isActive: true,
      productId: "p1",
      productionLineId: "line-1",
      shiftId: null,
      standardCrewSize: 8,
    },
    {
      dailyTargetQty: 900,
      effectiveFrom: "2026-02-01",
      effectiveTo: null,
      id: "std-shift",
      isActive: true,
      productId: "p1",
      productionLineId: "line-1",
      shiftId: "morning",
      standardCrewSize: 10,
    },
  ] as const;

  const withShift = resolveProductionStandard(candidates, {
    asOf: "2026-03-01",
    productId: "p1",
    productionLineId: "line-1",
    shiftId: "morning",
  });
  assert.equal(withShift?.id, "std-shift");

  const fallback = resolveProductionStandard(candidates, {
    asOf: "2026-03-01",
    productId: "p1",
    productionLineId: "line-1",
    shiftId: "night",
  });
  assert.equal(fallback?.id, "std-line");
});
