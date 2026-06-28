import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createFinanceCostCenterLink,
  createFinancePostingReadinessContract,
  FINANCE_APP_KEY,
  financeAppManifest,
  FINANCE_COST_DEFINITION_CONTRACT,
  FINANCE_DOCUMENT_HOOK_CONTRACT,
  FINANCE_EVENT_DEFINITIONS,
  FINANCE_FOUNDATION_CONTRACTS,
  financeModuleManifest,
  FINANCE_PERMISSIONS,
  FINANCE_SEARCH_PROVIDER_CONTRACT,
} from "@/features/finance/public-api";
import {
  defineAppManifest,
  validateAppManifest,
  type AppManifest,
} from "@/platform/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260627123000_finance_foundation.sql");

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("finance foundation registers app and module manifests without posting capabilities", () => {
  assert.equal(String(FINANCE_APP_KEY), "finance");
  assert.equal(financeModuleManifest.key, "finance");
  assert.equal(financeAppManifest.key, "finance");
  assert.equal(financeAppManifest.category, "finance");
  assert.equal(financeAppManifest.sensitiveData, "sensitive");
  assert.deepEqual(validateAppManifest(financeAppManifest, [platformManifest, financeAppManifest]), {
    errors: [],
    valid: true,
  });

  assert.deepEqual(financeAppManifest.routes.map((route) => route.path).sort(), [
    "/erp/finance",
    "/erp/finance/documentation",
    "/erp/finance/reports",
  ]);
  assert.equal(financeAppManifest.quickActions.length, 0);
  assert.equal(financeAppManifest.commands.some((command) => command.key.includes("post")), false);
  assert.equal(financeAppManifest.capabilities.some((capability) => capability.key.includes("invoice")), false);
});

test("finance foundation exposes platform readiness contracts only", () => {
  const postingReadiness = createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods"],
    requiredDimensions: ["company", "cost_center"],
    sourceApp: "inventory",
    sourceDocumentType: "inventory.transaction",
  });
  const costCenterLink = createFinanceCostCenterLink({
    companyId: "company-1",
    costCenterKey: "main-operations",
    dimensionKey: "operations",
    tenantId: "tenant-1",
  });

  assert.equal(postingReadiness.usesEventBus, true);
  assert.equal(postingReadiness.usesDocumentEngine, true);
  assert.equal(postingReadiness.usesCostEngineContractsOnly, true);
  assert.equal(postingReadiness.journalEntryPostingSupported, false);
  assert.equal(postingReadiness.invoiceWorkflowSupported, false);
  assert.equal(postingReadiness.paymentExecutionSupported, false);
  assert.equal(costCenterLink.source, "cost-engine-contract");
  assert.equal(costCenterLink.directCostPostingSupported, false);

  assert.equal(FINANCE_SEARCH_PROVIDER_CONTRACT.source, "app");
  assert.equal(FINANCE_COST_DEFINITION_CONTRACT.metadata?.foundationOnly, true);
  assert.equal(FINANCE_DOCUMENT_HOOK_CONTRACT.postingImplementationProvided, false);
  assert.deepEqual(FINANCE_EVENT_DEFINITIONS.map((event) => String(event.name)), [
    "finance.definition.changed",
    "finance.posting-readiness.requested",
  ]);
  assert.equal(FINANCE_FOUNDATION_CONTRACTS.jobReadiness.length, 4);
});

test("finance migration creates definition tables with tenant RLS and guarded no-posting fields", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const tables = [
    "finance_accounts",
    "finance_account_types",
    "finance_journals",
    "finance_fiscal_years",
    "finance_fiscal_periods",
    "finance_currencies",
    "finance_tax_definitions",
    "finance_payment_terms",
    "finance_dimensions",
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`public\\.is_tenant_member\\(tenant_id\\)`));
  }

  for (const table of tables) {
    const definition = sql.match(new RegExp(`create table public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0] ?? "";

    assert.match(definition, /tenant_id uuid not null references public\.tenants\(id\)/);
    assert.match(definition, /company_id uuid not null references public\.companies\(id\)/);
  }

  for (const permission of [
    "finance.accounts.view",
    "finance.accounts.manage",
    "finance.journals.view",
    "finance.journals.manage",
    "finance.fiscal-periods.view",
    "finance.currencies.view",
    "finance.tax-definitions.view",
    "finance.payment-terms.view",
    "finance.dimensions.view",
    "finance.document-hooks.manage",
    "finance.posting-readiness.view",
    "finance.audit.view",
  ]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
  }

  assert.match(sql, /posting_enabled boolean not null default false check \(posting_enabled = false\)/);
  assert.match(sql, /calculation_supported boolean not null default false check \(calculation_supported = false\)/);
  assert.match(sql, /payment_execution_supported boolean not null default false check \(payment_execution_supported = false\)/);
  assert.match(sql, /event_name in \('finance\.definition\.changed', 'finance\.posting-readiness\.requested'\)/);
});

test("finance foundation avoids accounting, invoice, payment, and bank implementation surfaces", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const forbiddenPattern of [
    /create table public\.finance_journal_entries\b/i,
    /create table public\.finance_ledger/i,
    /create table public\.[a-z_]*invoice/i,
    /create table public\.[a-z_]*payment(?!_terms)/i,
    /create table public\.[a-z_]*bank/i,
    /create or replace function public\.[a-z_]*(post|reconcile|calculate_tax)/i,
  ]) {
    assert.doesNotMatch(sql, forbiddenPattern);
  }

  assert.equal(FINANCE_PERMISSIONS.postingReadinessView, "finance.posting-readiness.view");
});
