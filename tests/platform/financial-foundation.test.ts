import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAccountingPeriodOpen,
  assertPostingLifecycleTransition,
  calculateTaxLines,
  formatMoney,
  previewFinancialDocumentNumber,
} from "@/platform/server";
import {
  defineAccountingPeriod,
  defineCurrency,
  defineFinancialNumberingSequence,
} from "@/platform/public-api";

test("financial foundation blocks activity in closed or locked accounting periods", () => {
  const openPeriod = defineAccountingPeriod({
    code: "2026-01",
    endsOn: "2026-01-31",
    startsOn: "2026-01-01",
    status: "open",
    tenantId: "tenant-1",
  });

  assert.doesNotThrow(() => assertAccountingPeriodOpen(openPeriod));

  assert.throws(
    () =>
      assertAccountingPeriodOpen({
        ...openPeriod,
        status: "locked",
      }),
    /Locked accounting periods/,
  );
});

test("financial foundation formats money using currency precision", () => {
  const currency = defineCurrency({
    code: "SAR",
    name: "Saudi Riyal",
    precision: 2,
    symbol: "SAR",
  });

  assert.equal(formatMoney({ amount: 12.345, currencyCode: "SAR" }, currency), "SAR 12.35");
});

test("financial foundation calculates inclusive and exclusive tax lines", () => {
  const [exclusive] = calculateTaxLines({
    amount: 100,
    calculationMode: "exclusive",
    rates: [{ effectiveFrom: "2026-01-01", rate: 0.15, taxKey: "vat" }],
  });
  const [inclusive] = calculateTaxLines({
    amount: 115,
    calculationMode: "inclusive",
    rates: [{ effectiveFrom: "2026-01-01", rate: 0.15, taxKey: "vat" }],
  });

  assert.deepEqual(exclusive, {
    calculationMode: "exclusive",
    taxAmount: 15,
    taxableAmount: 100,
    taxKey: "vat",
  });
  assert.deepEqual(inclusive, {
    calculationMode: "inclusive",
    taxAmount: 15,
    taxableAmount: 100,
    taxKey: "vat",
  });
});

test("financial foundation previews company, branch, and fiscal year numbering", () => {
  const sequence = defineFinancialNumberingSequence({
    key: "sales-invoice",
    nextValue: 42,
    padding: 5,
    prefixTemplate: "INV-{fiscalYear}-",
    scope: {
      branchId: "BR01",
      companyId: "CO01",
      documentType: "invoice",
      fiscalYear: "2026",
      moduleKey: "sales",
      tenantId: "tenant-1",
    },
    suffixTemplate: "-{branch}",
  });

  assert.deepEqual(previewFinancialDocumentNumber(sequence), {
    sequenceKey: "sales-invoice",
    sequenceValue: 42,
    value: "INV-2026-00042-BR01",
  });
});

test("financial foundation enforces posting lifecycle transitions", () => {
  assert.doesNotThrow(() =>
    assertPostingLifecycleTransition({ from: "approved", to: "posted" }),
  );
  assert.throws(
    () => assertPostingLifecycleTransition({ from: "posted", to: "approved" }),
    /Posting lifecycle transition is not allowed/,
  );
});
