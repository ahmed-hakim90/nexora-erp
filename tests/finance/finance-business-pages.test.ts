import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FINANCE_ENTITIES,
  FINANCE_ENTITY_KEYS,
  buildFinanceMutationSchema,
  financeListQuerySchema,
  getFinanceEntity,
  isFinanceEntityKey,
} from "@/features/finance/public-api";

const root = process.cwd();
const financeAppDir = path.join(root, "src/app/(erp)/erp/finance");

function readFinanceSource(relativePath: string) {
  return fs.readFileSync(path.join(financeAppDir, relativePath), "utf8");
}

const EXPECTED_KEYS = [
  "account-types",
  "chart-of-accounts",
  "journals",
  "fiscal-years",
  "fiscal-periods",
  "currencies",
  "taxes",
  "payment-terms",
  "cost-centers",
  "dimensions",
];

test("finance entity registry covers every required foundation entity", () => {
  assert.equal(FINANCE_ENTITY_KEYS.length, EXPECTED_KEYS.length);
  for (const key of EXPECTED_KEYS) {
    assert.ok(isFinanceEntityKey(key), `missing finance entity ${key}`);
    const descriptor = getFinanceEntity(key);
    assert.ok(descriptor.fields.length > 0, `${key} must define fields`);
    assert.match(String(descriptor.viewPermission), /^finance\./u);
    assert.match(String(descriptor.managePermission), /^finance\./u);
    assert.ok(descriptor.basePath.startsWith("/erp/finance/"));
    assert.ok(["status", "is_active"].includes(descriptor.statusField));
  }
});

test("finance auto-generates internal business identifiers but not standard currency codes", () => {
  const expected = {
    "account-types": ["accountTypeKey"],
    "chart-of-accounts": ["accountCode"],
    journals: ["journalKey"],
    "fiscal-years": ["fiscalYearKey"],
    "fiscal-periods": ["fiscalPeriodKey"],
    taxes: ["taxKey"],
    "payment-terms": ["termsKey"],
    "cost-centers": ["dimensionKey", "costCenterKey"],
    dimensions: ["dimensionKey", "costCenterKey"],
  } as const;

  for (const [entityKey, fieldNames] of Object.entries(expected)) {
    const descriptor = FINANCE_ENTITIES[entityKey as keyof typeof FINANCE_ENTITIES];
    for (const fieldName of fieldNames) {
      const field = descriptor.fields.find((candidate) => candidate.name === fieldName);
      assert.ok(field?.autoCode, `${entityKey}.${fieldName} should be generated`);
    }
  }

  const currencyCode = FINANCE_ENTITIES.currencies.fields.find((field) => field.name === "currencyCode");
  assert.equal(currencyCode?.autoCode, undefined);
});

test("chart of accounts is a hierarchy and cost centers are scoped dimensions", () => {
  const accounts = getFinanceEntity("chart-of-accounts");
  assert.equal(accounts.table, "finance_accounts");
  assert.equal(accounts.supportsTree, true);
  assert.equal(accounts.treeParentField, "parentAccountId");

  const costCenters = getFinanceEntity("cost-centers");
  assert.equal(costCenters.table, "finance_dimensions");
  assert.deepEqual(costCenters.fixedFilter, { column: "dimension_kind", value: "cost_center" });
});

test("journals and taxes never expose posting or calculation toggles", () => {
  const journalFields = getFinanceEntity("journals").fields.map((field) => field.column);
  assert.equal(journalFields.includes("posting_enabled"), false);

  const taxFields = getFinanceEntity("taxes").fields.map((field) => field.column);
  assert.equal(taxFields.includes("calculation_supported"), false);

  const termFields = getFinanceEntity("payment-terms").fields.map((field) => field.column);
  assert.equal(termFields.includes("payment_execution_supported"), false);
});

test("list query schema applies safe defaults and coercion", () => {
  const defaults = financeListQuerySchema.parse({});
  assert.equal(defaults.pageSize, 50);
  assert.equal(defaults.sortDirection, "desc");

  assert.equal(financeListQuerySchema.parse({ isActive: "true" }).isActive, true);
  assert.equal(financeListQuerySchema.parse({ isActive: false }).isActive, false);
  assert.equal(financeListQuerySchema.parse({ pageSize: "10" }).pageSize, 10);
});

test("currency mutation schema coerces numbers and checkboxes", () => {
  const schema = buildFinanceMutationSchema(FINANCE_ENTITIES.currencies);
  const parsed = schema.parse({
    currencyCode: "usd",
    name: "US Dollar",
    symbol: "$",
    precision: "2",
    isBaseCurrency: "true",
    status: "active",
  });

  assert.equal(parsed.precision, 2);
  assert.equal(parsed.isBaseCurrency, true);
  assert.equal(parsed.status, "active");

  assert.equal(schema.parse({ currencyCode: "eur", name: "Euro", precision: 0, isBaseCurrency: "false", status: "active" }).isBaseCurrency, false);
  assert.equal(schema.parse({ currencyCode: "gbp", name: "Pound", precision: 0, isBaseCurrency: "on", status: "active" }).isBaseCurrency, true);
});

test("account type mutation schema enforces enum and required fields", () => {
  const schema = buildFinanceMutationSchema(FINANCE_ENTITIES["account-types"]);

  const parsed = schema.parse({
    accountTypeKey: "current-assets",
    name: "Current Assets",
    accountClass: "asset",
    normalBalance: "debit",
    description: "",
  });
  assert.equal(parsed.accountClass, "asset");
  assert.equal(parsed.description, null);

  assert.throws(() =>
    schema.parse({ accountTypeKey: "x", name: "X", accountClass: "banana", normalBalance: "debit" }),
  );
  assert.throws(() => schema.parse({ accountTypeKey: "x", accountClass: "asset", normalBalance: "debit" }));
});

test("chart of accounts schema parses dimension tags", () => {
  const schema = buildFinanceMutationSchema(FINANCE_ENTITIES["chart-of-accounts"]);
  const parsed = schema.parse({
    accountCode: "1000",
    name: "Cash",
    accountTypeId: "type-1",
    dimensionRequirements: "cost_center, project , branch",
    costCenterRequired: "true",
  });

  assert.deepEqual(parsed.dimensionRequirements, ["cost_center", "project", "branch"]);
  assert.equal(parsed.costCenterRequired, true);
});

test("fiscal year schema validates date format", () => {
  const schema = buildFinanceMutationSchema(FINANCE_ENTITIES["fiscal-years"]);
  const parsed = schema.parse({
    fiscalYearKey: "fy-2026",
    name: "FY 2026",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    status: "draft",
  });
  assert.equal(parsed.startsOn, "2026-01-01");

  assert.throws(() =>
    schema.parse({ fiscalYearKey: "fy", name: "FY", startsOn: "01-01-2026", endsOn: "2026-12-31", status: "draft" }),
  );
  assert.throws(() =>
    schema.parse({ fiscalYearKey: "fy", name: "FY", startsOn: "2026-12-31", endsOn: "2026-01-01", status: "draft" }),
  );
});

test("finance foundation schema enforces cross-field readiness rules", () => {
  const fiscalPeriodSchema = buildFinanceMutationSchema(FINANCE_ENTITIES["fiscal-periods"]);
  assert.throws(() =>
    fiscalPeriodSchema.parse({
      endsOn: "2026-02-01",
      fiscalPeriodKey: "p01",
      fiscalYearId: "fy-1",
      name: "P01",
      periodKind: "regular",
      startsOn: "2026-03-01",
      status: "draft",
    }),
  );

  const paymentTermsSchema = buildFinanceMutationSchema(FINANCE_ENTITIES["payment-terms"]);
  assert.throws(() =>
    paymentTermsSchema.parse({
      discountDays: 45,
      dueDays: 30,
      name: "Net 30",
      status: "active",
      termsKey: "net-30",
    }),
  );

  const currencySchema = buildFinanceMutationSchema(FINANCE_ENTITIES.currencies);
  assert.throws(() =>
    currencySchema.parse({
      currencyCode: "usd",
      isBaseCurrency: true,
      name: "US Dollar",
      precision: 2,
      status: "inactive",
    }),
  );
});

test("every finance entity exposes list and detail routes plus a dashboard", () => {
  assert.ok(fs.existsSync(path.join(financeAppDir, "page.tsx")), "finance dashboard page missing");
  assert.ok(fs.existsSync(path.join(financeAppDir, "reports", "page.tsx")), "finance report readiness page missing");

  for (const key of EXPECTED_KEYS) {
    assert.ok(fs.existsSync(path.join(financeAppDir, key, "page.tsx")), `${key} list route missing`);
    assert.ok(fs.existsSync(path.join(financeAppDir, key, "new", "page.tsx")), `${key} create redirect route missing`);
    assert.ok(fs.existsSync(path.join(financeAppDir, key, "[id]", "page.tsx")), `${key} detail route missing`);
    assert.ok(fs.existsSync(path.join(financeAppDir, key, "[id]", "edit", "page.tsx")), `${key} edit redirect route missing`);
  }
});

test("finance create and edit routes redirect to list-first modal queries", () => {
  const redirects = readFinanceSource("_components/finance-route-redirects.ts");
  const listPage = readFinanceSource("_components/finance-pages.tsx");
  const listView = readFinanceSource("_components/finance-list-view.tsx");

  assert.match(redirects, /redirect\(`\$\{descriptor\.basePath\}\?create=1`\)/);
  assert.match(redirects, /redirect\(`\$\{descriptor\.basePath\}\?edit=\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(listPage, /getFinanceRecord\(entityKey, params\.edit\)/);
  assert.match(listView, /autoOpen/);
  assert.match(listView, /closeHref=\{modalCloseHref\}/);
});

test("finance relation fields stay lookup-driven instead of raw text fallback", () => {
  const drawer = fs.readFileSync(path.join(financeAppDir, "_components/finance-entity-drawer.tsx"), "utf8");
  const navigation = fs.readFileSync(path.join(root, "src/shared/workspace/erp-navigation.ts"), "utf8");

  assert.match(drawer, /options !== undefined/);
  assert.match(drawer, /Create related records first/);
  assert.doesNotMatch(drawer, /options && options\.length > 0/);
  assert.match(navigation, /\/erp\/finance\/reports/);
});
