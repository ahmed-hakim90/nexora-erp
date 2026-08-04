import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollBankTransferFileContract,
  createHrPayrollWpsReadinessContract,
  defineHrPayrollCostCenterAllocation,
  defineHrPayrollLaborCostFact,
  defineHrPayrollPostingReadinessV2,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_BANK_PAYMENT_METHOD_KINDS,
  HR_PAYROLL_BANK_TRANSFER_FILE_FORMATS,
  HR_PAYROLL_FINANCE_BANK_AUDIT_ACTIONS,
  HR_PAYROLL_FINANCE_BANK_EVENT_DEFINITIONS,
  HR_PAYROLL_FINANCE_BANK_EXTENDED_TABLES,
  HR_PAYROLL_FINANCE_BANK_FOUNDATION_TABLES,
  HR_PAYROLL_FINANCE_BANK_READINESS_BOUNDARY_CONTRACT,
  HR_PAYROLL_FINANCE_BANK_VALIDATION_RULES,
  HR_PAYROLL_FINANCE_DIMENSION_KINDS,
  HR_PAYROLL_FINANCE_READINESS_STATUSES,
  HR_PAYROLL_LABOR_COST_CONSUMERS,
  HR_PAYROLL_POSTING_READINESS_V2_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  postingReadinessV2AllowsFinanceHandoff,
  hrAppManifest,
} from "@/features/hr/server-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260711120000_hr_payroll_finance_bank_readiness_foundation.sql");

test("finance readiness statuses, dimension kinds, and labor cost consumers are registered", () => {
  assert.equal(HR_PAYROLL_FINANCE_READINESS_STATUSES.length, 5);
  assert.equal(HR_PAYROLL_FINANCE_DIMENSION_KINDS.length, 6);
  assert.equal(HR_PAYROLL_BANK_PAYMENT_METHOD_KINDS.length, 5);
  assert.equal(HR_PAYROLL_BANK_TRANSFER_FILE_FORMATS.length, 5);
  assert.equal(HR_PAYROLL_LABOR_COST_CONSUMERS.length, 5);
  assert.equal(HR_PAYROLL_FINANCE_BANK_VALIDATION_RULES.length, 6);
});

test("posting readiness v2 extends Sprint 14 table without journal posting runtime", () => {
  const line = defineHrPayrollPostingReadinessV2({
    amount: 1500,
    branchId: null,
    companyId: "company-1",
    costCenterId: "cc-1",
    currency: "USD",
    extendsSprint14PostingReadinessTable: true,
    financeDimensionKind: "cost_center",
    financeDimensionRef: "cc-1",
    financePostingRuntimeImplemented: false,
    journalPostingImplemented: false,
    payrollResultId: "result-1",
    payrollRunId: "run-1",
    postingLineType: "employer_contribution",
    postingReference: null,
    status: "ready",
    tenantId: "tenant-1",
  });

  assert.equal(line.extendsSprint14PostingReadinessTable, true);
  assert.equal(postingReadinessV2AllowsFinanceHandoff(line), true);
  assert.equal(HR_PAYROLL_POSTING_READINESS_V2_CONTRACT.extendsSprint14Table, "hr_payroll_posting_readiness");
  assert.equal(HR_PAYROLL_POSTING_READINESS_V2_CONTRACT.financePostingRuntimeImplemented, false);
});

test("cost center allocation and labor cost facts remain readiness-only", () => {
  const allocation = defineHrPayrollCostCenterAllocation({
    allocatedAmount: 1000,
    allocationPercent: 100,
    branchId: null,
    companyId: "company-1",
    costCenterId: "cc-1",
    costEnginePostingImplemented: false,
    currency: "USD",
    employeeId: "employee-1",
    payrollResultId: "result-1",
    payrollRunId: "run-1",
    status: "draft",
    tenantId: "tenant-1",
  });

  const fact = defineHrPayrollLaborCostFact({
    auditLineageRef: "lineage-1",
    branchId: null,
    companyId: "company-1",
    consumer: "manufacturing",
    consumerRef: "mo-1",
    costCalculationPostingImplemented: false,
    currency: "USD",
    employeeId: "employee-1",
    employerContributionCost: 200,
    grossLaborCost: 1200,
    netLaborCost: 1000,
    payrollResultId: "result-1",
    payrollRunId: "run-1",
    tenantId: "tenant-1",
  });

  assert.equal(allocation.costEnginePostingImplemented, false);
  assert.equal(fact.costCalculationPostingImplemented, false);
  assert.equal(HR_PAYROLL_FINANCE_BANK_READINESS_BOUNDARY_CONTRACT.laborCostFactsReadiness, true);
});

test("bank transfer and WPS contracts are contract-only without generation runtime", () => {
  const bankContract = createHrPayrollBankTransferFileContract({
    currency: "SAR",
    fileFormat: "wps",
    payrollRunId: "run-1",
    recordCount: 10,
    totalAmount: 50000,
  });

  const wpsContract = createHrPayrollWpsReadinessContract({
    countryCode: "SA",
    currency: "SAR",
    employeeRecordCount: 10,
    employerEstablishmentRef: "est-1",
    payrollRunId: "run-1",
    totalNetPay: 50000,
  });

  assert.equal(bankContract.generationImplemented, false);
  assert.equal(wpsContract.wpsFileGenerationImplemented, false);
  assert.equal(HR_PAYROLL_FINANCE_BANK_READINESS_BOUNDARY_CONTRACT.bankFileGenerationImplemented, false);
  assert.equal(HR_PAYROLL_FINANCE_BANK_READINESS_BOUNDARY_CONTRACT.wpsFileGenerationImplemented, false);
});

test("operational boundary registers finance bank readiness foundation", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollFinanceBankReadinessFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollFinanceBankBoundary.extendsSprint14PostingReadiness, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollPostingReadinessV2.journalReadiness, true);
});

test("finance bank permissions, events, and manifest capabilities are registered", () => {
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollFinanceReadinessView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollBankReadinessManage), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-finance-bank-readiness-foundation"), true);
  assert.equal(HR_PAYROLL_FINANCE_BANK_EVENT_DEFINITIONS.length, 6);
  assert.equal(HR_PAYROLL_FINANCE_BANK_AUDIT_ACTIONS.postingReadinessV2Prepared, "hr.payroll.finance.posting-readiness.v2.prepared");
});

test("finance bank migration extends posting readiness and adds foundation tables", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_FINANCE_BANK_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  for (const table of HR_PAYROLL_FINANCE_BANK_EXTENDED_TABLES) {
    assert.match(sql, new RegExp(`alter table public\\.${table}`));
  }

  for (const fragment of [
    "posting_readiness_v2",
    "finance_dimension_kind",
    "bank_payment_runtime_implemented', false",
    "wps_file_generation_implemented', false",
    "hr.payroll.finance.readiness.view",
    "hr.payroll.bank.readiness.manage",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }
});

test("finance bank public contracts do not implement posting or bank file generation", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payroll-finance-bank-readiness-foundation.ts"), "utf8");

  for (const forbidden of [
    "postToFinance",
    "generateBankFile",
    "generateWpsFile",
    "executeJournalPosting",
    "createJournalEntry",
  ]) {
    assert.equal(source.includes(forbidden), false, `Finance bank foundation must not include ${forbidden}`);
  }
});
