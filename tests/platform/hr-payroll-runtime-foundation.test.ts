import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollEmployeeSnapshotInput,
  defineHrFinalSettlementReadiness,
  defineHrPayrollEmployeeSnapshot,
  defineHrPayrollPostingReadinessLine,
  defineHrPayrollResult,
  defineHrPayrollResultComponent,
  defineHrPayrollRetroReadiness,
  defineHrPayrollRun,
  defineHrPayrollRuntimeCalendar,
  defineHrPayrollRuntimeGroup,
  defineHrPayrollRuntimePayslip,
  defineHrPayrollRuntimePeriod,
  HR_ASSIGNMENT_PAYROLL_RUNTIME_INTEGRATION,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_POSTING_LINE_TYPES,
  HR_PAYROLL_RESULT_COMPONENT_SOURCES,
  HR_PAYROLL_RESULT_COMPONENT_TYPES,
  HR_PAYROLL_RETRO_DETECTION_TYPES,
  HR_PAYROLL_RUN_STATUSES,
  HR_PAYROLL_RUN_TYPES,
  HR_PAYROLL_RUNTIME_AUDIT_ACTIONS,
  HR_PAYROLL_RUNTIME_COST_READINESS_CONTRACT,
  HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_RUNTIME_EVENT_DEFINITIONS,
  HR_PAYROLL_RUNTIME_EXPORT_CONTRACT,
  HR_PAYROLL_RUNTIME_FINANCE_READINESS_CONTRACT,
  HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT,
  HR_PAYROLL_RUNTIME_FOUNDATION_TABLES,
  HR_PAYROLL_RUNTIME_FREQUENCIES,
  HR_PAYROLL_RUNTIME_GROUP_EXAMPLES,
  HR_PAYROLL_RUNTIME_IMPORT_CONTRACT,
  HR_PAYROLL_RUNTIME_PAYSLIP_STATUSES,
  HR_PAYROLL_RUNTIME_PERIOD_STATUSES,
  HR_PAYROLL_RUNTIME_PERMISSION_METADATA,
  HR_PAYROLL_RUNTIME_PLATFORM_INTEGRATION,
  HR_PAYROLL_RUNTIME_REPORT_READINESS,
  HR_PAYROLL_RUNTIME_VALIDATION_RULES,
  HR_PAYROLL_RUNTIME_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  payrollRunAllowsEmployeeSnapshotMutation,
  resolveHrPayrollGrossDeductionNet,
  hrAppManifest,
} from "@/features/hr/public-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260704120000_hr_payroll_runtime_foundation.sql");

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

test("HR Payroll Runtime exposes frequencies, run types, and component contracts", () => {
  assert.equal(HR_PAYROLL_RUNTIME_FREQUENCIES.length, 5);
  assert.equal(HR_PAYROLL_RUNTIME_PERIOD_STATUSES.length, 7);
  assert.equal(HR_PAYROLL_RUN_TYPES.length, 6);
  assert.equal(HR_PAYROLL_RUN_STATUSES.length, 10);
  assert.equal(HR_PAYROLL_RUNTIME_PAYSLIP_STATUSES.length, 5);
  assert.equal(HR_PAYROLL_RESULT_COMPONENT_TYPES.length, 5);
  assert.equal(HR_PAYROLL_RESULT_COMPONENT_SOURCES.length, 9);
  assert.equal(HR_PAYROLL_RUNTIME_VALIDATION_RULES.length, 10);
  assert.equal(HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT.payrollIsRuntimeEngine, true);
});

test("payroll calendar and period runtime contracts consume foundation without duplication", () => {
  const calendar = defineHrPayrollRuntimeCalendar({
    branchId: null,
    code: "MONTHLY-GLOBAL",
    companyId: "company-1",
    consumesFoundationCalendar: true,
    effectiveFrom: "2026-01-01",
    frequency: "semi_monthly",
    name: "Semi-Monthly Payroll",
    status: "active",
    tenantId: "tenant-1",
  });
  const period = defineHrPayrollRuntimePeriod({
    branchId: null,
    companyId: "company-1",
    consumesFoundationPeriod: true,
    cutoffDate: "2026-01-25",
    endDate: "2026-01-31",
    paymentDate: "2026-02-05",
    payrollCalendarId: "calendar-1",
    periodCode: "2026-01",
    startDate: "2026-01-01",
    status: "open",
    tenantId: "tenant-1",
  });

  assert.equal(calendar.frequency, "semi_monthly");
  assert.equal(period.cutoffDate, "2026-01-25");
  assert.equal(HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT.duplicatesEmployeeCompensationData, false);
});

test("payroll group and run lifecycle remain contract-only", () => {
  const group = defineHrPayrollRuntimeGroup({
    assignmentEngineAssignable: true,
    branchId: null,
    code: "MONTHLY_STAFF",
    companyId: "company-1",
    consumesFoundationGroup: true,
    name: "Monthly Staff",
    payrollCalendarId: "calendar-1",
    status: "active",
    tenantId: "tenant-1",
  });
  const run = defineHrPayrollRun({
    approvedAt: null,
    approvedBy: null,
    branchId: null,
    companyId: "company-1",
    countryLocalizationImplemented: false,
    payrollCalculationImplemented: false,
    payrollGroupId: group.code,
    payrollPeriodId: "period-1",
    requestedBy: "user-1",
    runType: "regular",
    status: "validating",
    tenantId: "tenant-1",
  });

  assert.equal(HR_PAYROLL_RUNTIME_GROUP_EXAMPLES.length, 5);
  assert.equal(run.payrollCalculationImplemented, false);
  assert.equal(payrollRunAllowsEmployeeSnapshotMutation("ready"), true);
  assert.equal(payrollRunAllowsEmployeeSnapshotMutation("approved"), false);
});

test("employee snapshot captures HR foundation data without duplicating compensation", () => {
  const snapshotInput = createHrPayrollEmployeeSnapshotInput({
    basicSalary: 15000,
    contractId: "contract-1",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    jobId: "job-1",
    payrollRunId: "run-1",
    positionId: "position-1",
  });
  const snapshot = defineHrPayrollEmployeeSnapshot({
    ...snapshotInput,
    branchId: null,
    companyId: "company-1",
    departmentId: "department-1",
    tenantId: "tenant-1",
  });

  assert.equal(snapshot.consumesHrFoundationOnly, true);
  assert.equal(snapshot.duplicatesEmployeeCompensation, false);
  assert.equal(snapshot.immutableAfterApproval, false);
});

test("payroll result components and gross/deduction/net contracts avoid statutory calculation", () => {
  const result = defineHrPayrollResult({
    branchId: null,
    companyId: "company-1",
    currency: "USD",
    employeeId: "employee-1",
    employeeSnapshotId: "snapshot-1",
    grossEarnings: 10000,
    netPay: 8500,
    payrollRunId: "run-1",
    statutoryCalculationImplemented: false,
    status: "completed",
    tenantId: "tenant-1",
    totalDeductions: 1500,
    totalEmployerContributions: 500,
  });
  const component = defineHrPayrollResultComponent({
    amount: 10000,
    branchId: null,
    calculationMetadata: { sourceRef: "contract-1" },
    calculationRuntimeImplemented: false,
    companyId: "company-1",
    componentCode: "BASIC",
    componentName: "Basic Salary",
    componentType: "earning",
    currency: "USD",
    payrollResultId: "result-1",
    source: "contract",
    tenantId: "tenant-1",
  });
  const totals = resolveHrPayrollGrossDeductionNet({
    grossEarnings: 10000,
    totalDeductions: 1500,
    totalEmployerContributions: 500,
  });

  assert.equal(result.statutoryCalculationImplemented, false);
  assert.equal(component.source, "contract");
  assert.equal(totals.netPay, 8500);
  assert.equal(totals.statutoryCalculationImplemented, false);
});

test("payslip, retro, and final settlement readiness remain contract-only", () => {
  const payslip = defineHrPayrollRuntimePayslip({
    branchId: null,
    companyId: "company-1",
    currency: "USD",
    employeeId: "employee-1",
    employeePortalPublishingImplemented: false,
    employeeSnapshotId: "snapshot-1",
    grossEarnings: 10000,
    netPay: 8500,
    payrollResultId: "result-1",
    payrollRunId: "run-1",
    pdfRenderingImplemented: false,
    runtimePayslipStatus: "generated",
    tenantId: "tenant-1",
    totalDeductions: 1500,
  });
  const retro = defineHrPayrollRetroReadiness({
    affectedPeriodId: "period-1",
    branchId: null,
    companyId: "company-1",
    detectionType: "salary_change_after_closed_period",
    employeeId: "employee-1",
    retroCalculationImplemented: false,
    sourceRecordId: "package-1",
    status: "detected",
    tenantId: "tenant-1",
  });
  const settlement = defineHrFinalSettlementReadiness({
    advances: 0,
    branchId: null,
    companyId: "company-1",
    currency: "USD",
    employeeId: "employee-1",
    endOfServicePlaceholder: 0,
    lastWorkingDay: "2026-03-31",
    leaveBalancePayout: 2000,
    loanBalance: 500,
    penalties: 0,
    payrollRunId: "run-1",
    statutoryEosCalculationImplemented: false,
    status: "draft",
    tenantId: "tenant-1",
    unpaidSalary: 5000,
  });

  assert.equal(payslip.pdfRenderingImplemented, false);
  assert.equal(retro.retroCalculationImplemented, false);
  assert.equal(settlement.statutoryEosCalculationImplemented, false);
  assert.equal(HR_PAYROLL_RETRO_DETECTION_TYPES.length, 5);
});

test("workflow, finance, and cost readiness integrate through platform contracts only", () => {
  const postingLine = defineHrPayrollPostingReadinessLine({
    amount: 10000,
    branchId: null,
    companyId: "company-1",
    costCenterId: "cost-center-1",
    currency: "USD",
    journalPostingImplemented: false,
    payrollResultId: "result-1",
    payrollRunId: "run-1",
    postingLineType: "salary_expense",
    status: "ready",
    tenantId: "tenant-1",
  });

  assert.equal(postingLine.journalPostingImplemented, false);
  assert.equal(HR_PAYROLL_RUNTIME_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.directEngineCoupling, false);
  assert.equal(HR_PAYROLL_RUNTIME_FINANCE_READINESS_CONTRACT.accountingRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_RUNTIME_COST_READINESS_CONTRACT.costCalculationPostingImplemented, false);
  assert.equal(HR_PAYROLL_POSTING_LINE_TYPES.length, 6);
  assert.equal(HR_ASSIGNMENT_PAYROLL_RUNTIME_INTEGRATION.bypassesAssignmentEngine, false);
});

test("search registration, permissions, and foundation contracts include payroll runtime", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_run"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_result"), true);
  assert.equal(HR_PAYROLL_RUNTIME_PERMISSION_METADATA.length, 8);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollRun), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payslipsViewSelf), true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollRuntimeFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollRuntimeTables, HR_PAYROLL_RUNTIME_FOUNDATION_TABLES);
  assert.equal(HR_PAYROLL_RUNTIME_IMPORT_CONTRACT.key, "hr.payroll.runtime.import");
  assert.equal(HR_PAYROLL_RUNTIME_EXPORT_CONTRACT.key, "hr.payroll.runtime.export");
  assert.equal(HR_PAYROLL_RUNTIME_PLATFORM_INTEGRATION.searchRegistered, true);
  assert.equal(HR_PAYROLL_RUNTIME_REPORT_READINESS.runtimeReportGenerationImplemented, false);
  assert.equal(HR_PAYROLL_RUNTIME_EVENT_DEFINITIONS.length, 11);
  assert.equal(HR_PAYROLL_RUNTIME_AUDIT_ACTIONS.payrollRunCreated, "hr.payroll.runtime.run.created");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-runtime-foundation"), true);
});

test("payroll runtime migration defines tables, RLS, snapshot immutability, and out-of-scope guards", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_RUNTIME_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /cutoff_date/);
  assert.match(migration, /semi_monthly/);
  assert.match(migration, /prevent_hr_payroll_employee_snapshot_mutation/);
  assert.match(migration, /hr\.payroll\.run/);
  assert.match(migration, /hr\.payslips\.view_self/);
  assert.match(migration, /immutable_after_approval/);
  assert.doesNotMatch(migration, /create table public\.hr_gosi/i);
  assert.doesNotMatch(migration, /calculate_tax/i);
  assert.doesNotMatch(migration, /create table public\.hr_journal_entries/i);
  assert.doesNotMatch(migration, /render_payslip_pdf/i);
});

test("payroll runtime foundation integration consumes HR foundation without bypassing assignment", () => {
  assert.equal(HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT.consumesAssignmentEngine, true);
  assert.equal(HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT.consumesCompensationFoundation, true);
  assert.equal(HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT.consumesAttendanceFoundation, true);
  assert.equal(HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT.runtimeImplemented, false);
  assert.equal(HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT.bypassesAssignmentEngine, false);
  assert.equal(HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT.storesPayrollRulesOnEmployees, false);
  assert.equal(HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT.countrySpecificStatutoryRulesImplemented, false);
});
