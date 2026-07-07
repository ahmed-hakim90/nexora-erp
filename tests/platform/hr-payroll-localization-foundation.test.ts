import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrPayrollCountryProfile,
  defineHrPayrollLocalizationPack,
  defineHrPayrollStatutoryRule,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_COUNTRY_PROFILE_STATUSES,
  HR_PAYROLL_CURRENCY_POLICY_KINDS,
  HR_PAYROLL_LOCALIZATION_AUDIT_ACTIONS,
  HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_LOCALIZATION_EVENT_DEFINITIONS,
  HR_PAYROLL_LOCALIZATION_FOUNDATION_TABLES,
  HR_PAYROLL_LOCALIZATION_PACK_STATUSES,
  HR_PAYROLL_LOCALIZATION_RULE_SCOPES,
  HR_PAYROLL_LOCALIZATION_VALIDATION_RULES,
  HR_PAYROLL_STATUTORY_RULE_STATUSES,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  localizationPackAllowsCalculationInjection,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260710120000_hr_payroll_localization_foundation.sql");

test("localization pack statuses, rule scopes, and currency policy kinds are registered", () => {
  assert.equal(HR_PAYROLL_LOCALIZATION_PACK_STATUSES.length, 4);
  assert.equal(HR_PAYROLL_COUNTRY_PROFILE_STATUSES.length, 4);
  assert.equal(HR_PAYROLL_STATUTORY_RULE_STATUSES.length, 4);
  assert.equal(HR_PAYROLL_LOCALIZATION_RULE_SCOPES.length, 5);
  assert.equal(HR_PAYROLL_CURRENCY_POLICY_KINDS.length, 4);
  assert.equal(HR_PAYROLL_LOCALIZATION_VALIDATION_RULES.length, 5);
});

test("localization pack contract plugs into calculation without modifying core", () => {
  const pack = defineHrPayrollLocalizationPack({
    branchId: null,
    companyId: "company-1",
    countryCalculationsImplemented: false,
    countryCode: "SA",
    modifiesCalculationCore: false,
    packCode: "SA-V1",
    packName: "Saudi Readiness Pack",
    plugsIntoCalculationEngine: true,
    statutoryRuntimeImplemented: false,
    status: "active",
    tenantId: "tenant-1",
    version: "1.0.0",
  });

  assert.equal(pack.plugsIntoCalculationEngine, true);
  assert.equal(pack.modifiesCalculationCore, false);
  assert.equal(localizationPackAllowsCalculationInjection(pack), true);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.countryCalculationsImplemented, false);
});

test("country profile binds currency policy without country calculations", () => {
  const profile = defineHrPayrollCountryProfile({
    branchId: null,
    companyId: "company-1",
    countryCalculationsImplemented: false,
    countryCode: "EG",
    currencyPolicyKind: "localization_pack_currency",
    defaultCurrency: "EGP",
    defaultTimezone: "Africa/Cairo",
    localizationPackId: null,
    profileCode: "EG-PROFILE",
    profileName: "Egypt Profile",
    status: "draft",
    tenantId: "tenant-1",
  });

  assert.equal(profile.currencyPolicyKind, "localization_pack_currency");
  assert.equal(profile.countryCalculationsImplemented, false);
});

test("statutory rule remains foundation-only without statutory math runtime", () => {
  const rule = defineHrPayrollStatutoryRule({
    branchId: null,
    companyId: "company-1",
    componentCode: "GOSI_EE",
    formulaKey: "statutory.placeholder",
    legislativeDataGroupId: null,
    localizationPackId: "pack-1",
    priority: 100,
    ruleCode: "GOSI_EE_RULE",
    ruleName: "GOSI Employee Rule Placeholder",
    ruleScope: "component",
    statutoryCalculationImplemented: false,
    status: "draft",
    tenantId: "tenant-1",
  });

  assert.equal(rule.statutoryCalculationImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.gosiImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.taxFormulasImplemented, false);
});

test("boundary contract keeps Saudi, Egypt, EOS, and WPS implementations disabled", () => {
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.saudiPackImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.egyptPackImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.eosImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.wpsFileGenerationImplemented, false);
  assert.equal(HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT.localizationRuntimeImplemented, false);
});

test("operational boundary registers payroll localization framework", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollLocalizationFramework, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollLocalizationBoundary.localizationPacksPlugIntoCalculation, true);
});

test("localization permissions and manifest capabilities are registered", () => {
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollLocalizationView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollStatutoryRulesManage), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-localization-foundation"), true);
  assert.equal(HR_PAYROLL_LOCALIZATION_EVENT_DEFINITIONS.length, 5);
  assert.equal(HR_PAYROLL_LOCALIZATION_AUDIT_ACTIONS.localizationPackRegistered, "hr.payroll.localization.pack.registered");
});

test("localization migration adds foundation tables and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_LOCALIZATION_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  for (const fragment of [
    "country_calculations_implemented', false",
    "statutory_runtime_implemented', false",
    "hr.payroll.localization.view",
    "hr.payroll.localization.manage",
    "plugs_into_calculation_engine', true",
    "modifies_calculation_core', false",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }
});

test("localization public contracts do not implement country calculations", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payroll-localization-foundation.ts"), "utf8");

  for (const forbidden of [
    "calculateGosi",
    "calculateEgyptTax",
    "generateWpsFile",
    "calculateEndOfService",
    "saudiPayrollPack",
    "egyptPayrollPack",
  ]) {
    assert.equal(source.includes(forbidden), false, `Localization foundation must not include ${forbidden}`);
  }
});
