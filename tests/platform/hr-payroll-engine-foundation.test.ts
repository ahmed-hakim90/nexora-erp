import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createPayrollSnapshotInput,
  definePayrollBatch,
  definePayrollCalendar,
  definePayrollException,
  definePayrollGroup,
  definePayrollPeriod,
  definePayrollSnapshot,
  definePayslip,
  definePayslipLine,
  defineRetroAdjustment,
  HR_FOUNDATION_CONTRACTS,
  HR_OFF_CYCLE_PAYROLL_READINESS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_AUDIT_ACTIONS,
  HR_PAYROLL_BATCH_STATUSES,
  HR_PAYROLL_BATCH_TYPES,
  HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_EVENT_DEFINITIONS,
  HR_PAYROLL_EXCEPTION_TYPES,
  HR_PAYROLL_FOUNDATION_TABLES,
  HR_PAYROLL_FREQUENCIES,
  HR_PAYROLL_GROUP_EXAMPLES,
  HR_PAYROLL_LOCK_LEVELS,
  HR_PAYROLL_LOCK_READINESS,
  HR_PAYROLL_PAYSLIP_STATUSES,
  HR_PAYROLL_PERIOD_STATUSES,
  HR_PAYROLL_POSTING_READINESS,
  HR_PAYROLL_PRODUCTION_INCENTIVE_SNAPSHOT_READINESS,
  HR_PAYROLL_SNAPSHOT_IMMUTABILITY_CONTRACT,
  HR_PAYROLL_SNAPSHOT_KINDS,
  HR_PERMISSION_LIST,
  hrAppManifest,
  payrollBatchAllowsSnapshotMutation,
} from "@/features/hr/server-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630174000_hr_payroll_engine_foundation.sql");

test("HR Payroll Foundation exposes calendar frequencies, period statuses, and snapshot kinds", () => {
  assert.equal(HR_PAYROLL_FREQUENCIES.length, 5);
  assert.equal(HR_PAYROLL_PERIOD_STATUSES.length, 11);
  assert.equal(HR_PAYROLL_BATCH_TYPES.length, 6);
  assert.equal(HR_PAYROLL_BATCH_STATUSES.length, 14);
  assert.equal(HR_PAYROLL_PAYSLIP_STATUSES.length, 9);
  assert.equal(HR_PAYROLL_SNAPSHOT_KINDS.length, 15);
  assert.equal(HR_PAYROLL_EXCEPTION_TYPES.length, 11);
  assert.equal(HR_PAYROLL_LOCK_LEVELS.length, 5);
  assert.equal(HR_PAYROLL_GROUP_EXAMPLES.length, 5);
});

test("payroll calendar and period contracts are foundation metadata only", () => {
  const calendar = definePayrollCalendar({
    branchId: null,
    code: "MONTHLY-EG",
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    frequency: "monthly",
    name: "Monthly Egypt Payroll",
    status: "active",
    tenantId: "tenant-1",
    timezone: "Africa/Cairo",
  });

  const period = definePayrollPeriod({
    branchId: null,
    companyId: "company-1",
    endDate: "2026-01-31",
    paymentDate: "2026-02-05",
    payrollCalendarId: "calendar-1",
    periodCode: "2026-01",
    periodName: "January 2026",
    startDate: "2026-01-01",
    status: "open",
    tenantId: "tenant-1",
  });

  assert.equal(calendar.frequency, "monthly");
  assert.equal(period.status, "open");
  assert.equal(HR_PAYROLL_PERIOD_STATUSES.includes("snapshot_ready"), true);
});

test("payroll group and batch contracts support batch lifecycle without calculation runtime", () => {
  const group = definePayrollGroup({
    branchId: "branch-1",
    code: "FACTORY_WORKERS",
    companyId: "company-1",
    employmentType: "full_time",
    gradeId: null,
    name: "Factory Workers",
    payrollCalendarId: "calendar-1",
    payrollPolicyVersionRef: "policy-version-1",
    status: "active",
    tenantId: "tenant-1",
  });

  const batch = definePayrollBatch({
    approvedAt: null,
    batchType: "regular",
    branchId: "branch-1",
    calculationRuntimeImplemented: false,
    closedAt: null,
    companyId: "company-1",
    inputCutoffDate: "2026-01-25",
    lockedAt: null,
    payrollGroupId: group.code,
    payrollPeriodId: "period-1",
    reviewedAt: null,
    snapshotCreatedAt: null,
    status: "collect_inputs",
    tenantId: "tenant-1",
  });

  assert.equal(group.code, "FACTORY_WORKERS");
  assert.equal(batch.calculationRuntimeImplemented, false);
  assert.equal(payrollBatchAllowsSnapshotMutation("snapshot"), true);
  assert.equal(payrollBatchAllowsSnapshotMutation("ready_to_calculate"), false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, true);
});

test("payslip and payslip line contracts keep amounts as metadata placeholders", () => {
  const payslip = definePayslip({
    approvalStatus: "draft",
    branchId: null,
    calculationRuntimeImplemented: false,
    companyId: "company-1",
    currency: "EGP",
    deductionAmountMetadata: null,
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    grossAmountMetadata: null,
    lockStatus: "unlocked",
    netAmountMetadata: null,
    payrollBatchId: "batch-1",
    payrollPeriodId: "period-1",
    snapshotRef: null,
    status: "draft",
    tenantId: "tenant-1",
  });

  const line = definePayslipLine({
    amountMetadata: null,
    branchId: null,
    calculationRuntimeImplemented: false,
    categorySnapshot: "basic",
    companyId: "company-1",
    componentCodeSnapshot: "BASIC",
    componentNameSnapshot: "Basic Salary",
    compensationComponentVersionId: "component-version-1",
    currency: "EGP",
    displayOrder: 10,
    earningOrDeduction: "earning",
    payslipId: "payslip-1",
    quantityMetadata: null,
    rateMetadata: null,
    sourceSnapshotRef: "snapshot-1",
    sourceType: "compensation",
    tenantId: "tenant-1",
  });

  assert.equal(payslip.calculationRuntimeImplemented, false);
  assert.equal(line.sourceType, "compensation");
  assert.equal(line.calculationRuntimeImplemented, false);
});

test("payroll snapshot model is snapshot-first and immutable after snapshot stage", () => {
  const snapshotInput = createPayrollSnapshotInput({
    effectiveDateUsed: "2026-01-31",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    payload: { baseSalary: 12000 },
    payrollBatchId: "batch-1",
    snapshotKind: "salary_package",
    sourceEngine: "compensation",
    sourceRecordId: "package-1",
    sourceVersionId: "package-version-1",
  });

  const snapshot = definePayrollSnapshot({
    branchId: null,
    checksumReadiness: "sha256-ready",
    companyId: "company-1",
    effectiveDateUsed: snapshotInput.effectiveDateUsed,
    employeeId: snapshotInput.employeeId,
    employmentProfileId: snapshotInput.employmentProfileId,
    immutableAfterSnapshotStage: true,
    lockStatus: snapshotInput.lockStatus,
    payload: snapshotInput.payload,
    payrollBatchId: snapshotInput.payrollBatchId,
    snapshotKind: snapshotInput.snapshotKind,
    sourceEngine: snapshotInput.sourceEngine,
    sourceRecordId: snapshotInput.sourceRecordId,
    sourceVersionId: snapshotInput.sourceVersionId,
    tenantId: "tenant-1",
  });

  assert.equal(snapshot.immutableAfterSnapshotStage, true);
  assert.equal(snapshot.lockStatus, "snapshot_created");
  assert.equal(HR_PAYROLL_SNAPSHOT_IMMUTABILITY_CONTRACT.supersededOnlyByCorrectionBatch, true);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.calculatesFromLiveSourceEngines, false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.calculatesFromSnapshotsOnly, true);
});

test("payroll exceptions, retro adjustments, and off-cycle readiness have no resolver runtime", () => {
  const exception = definePayrollException({
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    exceptionType: "missing_attendance_snapshot",
    payrollBatchId: "batch-1",
    payslipId: "payslip-1",
    resolverRuntimeImplemented: false,
    severity: "high",
    status: "open",
    tenantId: "tenant-1",
  });

  const retro = defineRetroAdjustment({
    affectedPeriodId: "period-1",
    branchId: null,
    calculationRuntimeImplemented: false,
    companyId: "company-1",
    correctionBatchId: "batch-correction-1",
    originalPayslipId: "payslip-1",
    reason: "Attendance corrected after payroll lock.",
    sourceReference: "attendance-snapshot-1",
    status: "pending",
    tenantId: "tenant-1",
  });

  assert.equal(exception.resolverRuntimeImplemented, false);
  assert.equal(retro.calculationRuntimeImplemented, false);
  assert.equal(HR_OFF_CYCLE_PAYROLL_READINESS.paymentExecutionImplemented, false);
  assert.equal(HR_OFF_CYCLE_PAYROLL_READINESS.supportedScenarios.includes("final_settlement"), true);
});

test("locking and posting readiness prepare finance integration without posting runtime", () => {
  assert.equal(HR_PAYROLL_LOCK_READINESS.retroAdjustmentAfterPayrollLocked, true);
  assert.equal(HR_PAYROLL_LOCK_READINESS.destructiveChangesAfterPayrollLocked, false);
  assert.equal(HR_PAYROLL_LOCK_READINESS.lockRuntimeImplemented, true);
  assert.equal(HR_PAYROLL_POSTING_READINESS.financePostingRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_POSTING_READINESS.bankPaymentRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_POSTING_READINESS.journalReadiness, true);
  assert.equal(HR_PAYROLL_PRODUCTION_INCENTIVE_SNAPSHOT_READINESS.manufacturingDependencyImplemented, false);
});

test("payroll foundation keeps calculation and finance posting disabled at HR boundary", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.payslipMathImplemented, false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.financePostingImplemented, false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.workflowRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.processingFlow.length, 9);
});

test("payroll permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.payroll.view",
    "hr.payroll.manage",
    "hr.payroll_batches.view",
    "hr.payroll_batches.manage",
    "hr.payslips.view",
    "hr.payslips.manage",
    "hr.payroll_snapshots.view",
    "hr.payroll_snapshots.manage",
    "hr.payroll_locks.manage",
    "hr.payroll_exceptions.view",
    "hr.payroll_exceptions.manage",
    "hr.payroll_posting.manage",
    "hr.payroll.run",
    "hr.payroll.approve",
    "hr.payroll.publish",
    "hr.payslips.view_self",
    "hr.payslips.publish",
    "hr.payroll.inputs.view",
    "hr.payroll.inputs.manage",
    "hr.payroll.adjustments.manage",
    "hr.payroll.exceptions.view",
    "hr.payroll.locks.manage",
    "hr.payroll.calculate",
    "hr.payroll.recalculate",
    "hr.payroll.trace.view",
    "hr.payroll.validate",
    "hr.payroll.lock",
    "hr.payroll.unlock",
    "hr.payroll.close",
    "hr.payroll.reopen",
    "hr.payroll.exception.manage",
    "hr.payslips.unpublish",
    "hr.payslips.audit.view",
    "hr.payroll.localization.view",
    "hr.payroll.localization.manage",
    "hr.payroll.localization.packs.manage",
    "hr.payroll.statutory_rules.manage",
    "hr.payroll.country_profiles.manage",
    "hr.payroll.finance.readiness.view",
    "hr.payroll.finance.readiness.manage",
    "hr.payroll.bank.readiness.manage",
    "hr.payroll.cost_allocation.manage",
    "hr.payroll.portal.security.view",
    "hr.payroll.portal.security.manage",
    "hr.payslips.download.authorize",
    "hr.payslips.access.revoke",
    "hr.payroll.ess.readiness.view",
    "hr.payroll.mss.readiness.view",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_PAYROLL_EVENT_DEFINITIONS.length, 17);
  assert.equal(HR_PAYROLL_AUDIT_ACTIONS.batchCreated, "hr.payroll.batch.created");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollTables.length, 11);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollBoundary.snapshotFirstProcessing, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.payroll.import"), true);
});

test("HR payroll migration adds foundation tables, snapshot immutability guard, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "prevent_hr_payroll_snapshot_mutation",
    "immutable_after_snapshot_stage",
    "live_source_querying_forbidden",
    "references public.hr_policy_versions",
    "references public.hr_compensation_component_versions",
    "references public.hr_employment_profiles",
    "runtime_calculation_implemented', false",
    "finance_posting_implemented', false",
    "hr.payroll_snapshots.manage",
    "hr.payroll_posting.manage",
    "correction_batch_id",
    "production_incentive",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "calculate_payroll",
    "calculate_net_salary",
    "finance_posting_runtime",
    "bank_payment_runtime",
    "workflow_runtime",
    "self_service",
    "manager_portal",
    "query_live_employment",
    "query_live_attendance",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Payroll migration must not include ${forbidden}`);
  }
});

test("payroll public contracts do not implement calculation, finance posting, or live-source querying", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payroll-foundation.ts"), "utf8");

  for (const forbidden of [
    "calculatePayroll",
    "calculateNetSalary",
    "processPayslip",
    "postToFinance",
    "executeBankPayment",
    "queryLiveEmploymentProfile",
    "queryLiveAttendance",
    "workflowRuntimeHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Payroll contracts must not include ${forbidden}`);
  }
});
