import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createAttendancePayrollSnapshotReadinessInput,
  createExpectedVsActualMetadata,
  defineAttendanceAdjustment,
  defineAttendanceCalculatedDay,
  defineAttendanceException,
  defineAttendancePunchLog,
  defineAttendanceRawEvent,
  HR_ATTENDANCE_ADJUSTMENT_TYPES,
  HR_ATTENDANCE_APPROVAL_READINESS,
  HR_ATTENDANCE_AUDIT_ACTIONS,
  HR_ATTENDANCE_DAY_STATUSES,
  HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT,
  HR_ATTENDANCE_EVENT_DEFINITIONS,
  HR_ATTENDANCE_EXCEPTION_TYPES,
  HR_ATTENDANCE_FOUNDATION_TABLES,
  HR_ATTENDANCE_LOCK_READINESS,
  HR_ATTENDANCE_PAYROLL_SNAPSHOT_READINESS,
  HR_ATTENDANCE_POLICY_INTEGRATION_CONTRACT,
  HR_ATTENDANCE_PUNCH_TYPES,
  HR_ATTENDANCE_REVIEW_QUEUE_READINESS,
  HR_ATTENDANCE_WORKFORCE_INTEGRATION_CONTRACT,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630173000_hr_attendance_engine_foundation.sql");

test("HR Attendance Foundation exposes punch types, day statuses, and exception types", () => {
  assert.equal(HR_ATTENDANCE_PUNCH_TYPES.length, 5);
  assert.equal(HR_ATTENDANCE_DAY_STATUSES.length, 7);
  assert.equal(HR_ATTENDANCE_EXCEPTION_TYPES.length, 12);
  assert.equal(HR_ATTENDANCE_ADJUSTMENT_TYPES.length, 9);
});

test("attendance punch log contract is append-only foundation metadata", () => {
  const punchLog = defineAttendancePunchLog({
    appendOnly: true,
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-1",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    importedAt: "2026-03-01T08:00:00.000Z",
    punchTime: "2026-03-01T08:00:00.000Z",
    punchType: "in",
    rawPayload: { deviceEventId: "evt-1" },
    source: "biometric_device",
    status: "imported",
    tenantId: "tenant-1",
  });

  assert.equal(punchLog.appendOnly, true);
  assert.equal(punchLog.punchType, "in");
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.punchLogsAppendOnly, true);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.deviceLogsNeverOverwritten, true);
});

test("raw attendance event preserves source punch log relation without calculation", () => {
  const rawEvent = defineAttendanceRawEvent({
    branchId: null,
    companyId: "company-1",
    confidence: 0.95,
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    eventTime: "2026-03-01T08:00:00.000Z",
    eventType: "clock_in",
    source: "biometric_device",
    sourcePunchLogId: "punch-log-1",
    status: "normalized",
    tenantId: "tenant-1",
  });

  assert.equal(rawEvent.sourcePunchLogId, "punch-log-1");
  assert.equal(rawEvent.eventType, "clock_in");
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.fullAttendanceCalculationImplemented, false);
});

test("expected vs actual metadata is readiness-only", () => {
  const metadata = createExpectedVsActualMetadata({
    actualFirstIn: "2026-03-01T08:05:00.000Z",
    expectedEnd: "2026-03-01T17:00:00.000Z",
    expectedStart: "2026-03-01T08:00:00.000Z",
    lateMinutes: 5,
    missingIn: false,
    shiftScheduleRef: "schedule-1",
  });

  assert.equal(metadata.lateMinutes, 5);
  assert.equal(metadata.runtimeCalculationImplemented, false);
});

test("attendance day foundation supports review lifecycle statuses without payroll export runtime", () => {
  const day = defineAttendanceCalculatedDay({
    attendancePolicyVersionRef: "policy-version-1",
    branchId: null,
    calculationRuntimeImplemented: false,
    companyId: "company-1",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    expectedVsActual: createExpectedVsActualMetadata({
      absenceFlag: false,
      expectedStart: "2026-03-01T08:00:00.000Z",
    }),
    status: "needs_review",
    tenantId: "tenant-1",
    workDate: "2026-03-01",
    workforceRefs: {
      shiftScheduleId: "schedule-1",
      shiftVersionId: "shift-version-1",
    },
  });

  assert.equal(day.status, "needs_review");
  assert.equal(day.workforceRefs?.shiftScheduleId, "schedule-1");
  assert.equal(day.calculationRuntimeImplemented, false);
  assert.equal(HR_ATTENDANCE_DAY_STATUSES.includes("exported_to_payroll"), true);
});

test("attendance exceptions support resolution readiness without workflow runtime", () => {
  const exception = defineAttendanceException({
    attendanceDayId: "day-1",
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    exceptionType: "missing_punch_out",
    resolutionReference: "resolution-1",
    reviewerEmployeeId: "employee-2",
    severity: "high",
    source: "observation",
    status: "open",
    tenantId: "tenant-1",
  });

  assert.equal(exception.exceptionType, "missing_punch_out");
  assert.equal(HR_ATTENDANCE_APPROVAL_READINESS.workflowRuntimeImplemented, false);
});

test("attendance adjustment readiness references HR Action documents without workflow runtime", () => {
  const adjustment = defineAttendanceAdjustment({
    adjustmentType: "add_punch",
    attendanceDayId: "day-1",
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    hrActionDocumentRef: "hr-action-doc-1",
    reason: "Missing punch correction request.",
    tenantId: "tenant-1",
    workflowRuntimeImplemented: false,
  });

  assert.equal(adjustment.hrActionDocumentRef, "hr-action-doc-1");
  assert.equal(adjustment.workflowRuntimeImplemented, false);
});

test("review queue readiness is scoped metadata with processing UI runtime", () => {
  assert.equal(HR_ATTENDANCE_REVIEW_QUEUE_READINESS.itemTypes.length, 6);
  assert.equal(HR_ATTENDANCE_REVIEW_QUEUE_READINESS.runtimeUiImplemented, true);
  assert.equal(HR_ATTENDANCE_REVIEW_QUEUE_READINESS.scopedAndPermissionAware, true);
});

test("attendance policy integration references policy engine without duplicating logic", () => {
  assert.equal(HR_ATTENDANCE_POLICY_INTEGRATION_CONTRACT.policyRefsOnly, true);
  assert.equal(HR_ATTENDANCE_POLICY_INTEGRATION_CONTRACT.runtimePolicyEvaluationImplemented, false);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.policyLogicDuplicatedInAttendance, false);
  assert.equal(HR_ATTENDANCE_POLICY_INTEGRATION_CONTRACT.supportedRuleCategories.includes("grace_period"), true);
});

test("attendance workforce integration references schedules without owning planned work", () => {
  assert.equal(HR_ATTENDANCE_WORKFORCE_INTEGRATION_CONTRACT.attendanceNeverOwnsPlannedSchedules, true);
  assert.equal(HR_ATTENDANCE_WORKFORCE_INTEGRATION_CONTRACT.workforceReferences.includes("shift_schedule"), true);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.workforceOwnsExpectedSchedule, true);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.attendanceOwnsObservedFacts, true);
});

test("payroll snapshot and lock readiness prepare payroll consumption without payroll math", () => {
  const snapshot = createAttendancePayrollSnapshotReadinessInput({
    absenceFlag: false,
    approvalStatus: "approved",
    approvedAttendanceDayId: "day-1",
    earlyLeaveMinutes: 0,
    holidayWorkMinutes: 0,
    lateMinutes: 15,
    lockStatus: "review_locked",
    overtimeMinutes: 30,
    sourceCalculationVersion: "attendance-foundation-v1",
    workedMinutes: 480,
  });

  assert.equal(snapshot.workedMinutes, 480);
  assert.equal(HR_ATTENDANCE_PAYROLL_SNAPSHOT_READINESS.payrollRuntimeImplemented, true);
  assert.equal(HR_ATTENDANCE_LOCK_READINESS.payrollLockRuntimeImplemented, true);
  assert.equal(HR_ATTENDANCE_LOCK_READINESS.retroAdjustmentAfterPayrollLock, true);
});

test("attendance foundation keeps payroll and biometric runtime disabled", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsAttendanceEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsAttendanceCalculation, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.biometricSynchronizationImplemented, false);
  assert.equal(HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
});

test("attendance permissions, events, and platform contracts are registered", () => {
  for (const permission of [
    "hr.attendance.view",
    "hr.attendance.manage",
    "hr.attendance.review",
    "hr.attendance.adjust",
    "hr.attendance.lock",
    "hr.attendance.import",
    "hr.attendance.devices.view",
    "hr.attendance.devices.sync",
    "hr.attendance.devices.sync.cancel",
    "hr.attendance.devices.import.approve",
    "hr.attendance.devices.logs.view",
    "hr.attendance.devices.reports.download",
    "hr.attendance.exceptions.view",
    "hr.attendance.exceptions.manage",
    "hr.attendance.monitor.view",
    "hr.attendance.monitor.manage",
    "hr.attendance.exception.resolve",
    "hr.attendance.live.export",
  ]) {
    assert.equal(HR_PERMISSION_LIST.map(String).includes(permission), true);
  }
  assert.equal(HR_ATTENDANCE_EVENT_DEFINITIONS.length, 10);
  assert.equal(HR_ATTENDANCE_AUDIT_ACTIONS.punchImported, "hr.attendance.punch.imported");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.attendance-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.attendanceTables.length, 7);
});

test("HR attendance migration adds foundation tables, append-only punch logs, and workforce/policy links", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_ATTENDANCE_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "prevent_hr_attendance_punch_log_rewrite",
    "append_only', true",
    "device_logs_never_overwritten",
    "references public.hr_attendance_devices",
    "references public.hr_shift_schedules",
    "references public.hr_policy_versions",
    "hr_attendance_days_employee_work_date_uq",
    "runtime_calculation_implemented', false",
    "hr.attendance.import",
    "hr.attendance.lock",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "payroll_batch",
    "calculate_payroll",
    "payslip",
    "biometric_sync",
    "sync_biometric",
    "attendance_calculation_engine",
    "self_service",
    "manager_portal",
    "leave_runtime",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Attendance migration must not include ${forbidden}`);
  }
});

test("attendance public contracts do not implement payroll calculation or biometric sync", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/attendance-foundation.ts"), "utf8");

  for (const forbidden of [
    "calculatePayroll",
    "calculateNetSalary",
    "syncBiometricDevice",
    "runAttendanceCalculation",
    "processPayslip",
  ]) {
    assert.equal(source.includes(forbidden), false, `Attendance contracts must not include ${forbidden}`);
  }
});
