import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrAttendanceDevice,
  defineHrHoliday,
  defineHrHolidayCalendar,
  defineHrShiftDefinition,
  defineHrShiftRotation,
  defineHrShiftSchedule,
  defineHrShiftTemplate,
  defineHrShiftVersion,
  defineHrWorkforceAssignment,
  HR_ATTENDANCE_DEVICE_TYPES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_SHIFT_KINDS,
  HR_SHIFT_ROTATION_EXAMPLES,
  HR_SHIFT_TEMPLATE_EXAMPLES,
  HR_WORKFORCE_AUDIT_ACTIONS,
  HR_WORKFORCE_AVAILABILITY_CONTRACT,
  HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT,
  HR_WORKFORCE_EFFECTIVE_DATING_CONTRACT,
  HR_WORKFORCE_EVENT_DEFINITIONS,
  HR_WORKFORCE_FOUNDATION_TABLES,
  HR_WORKFORCE_MANUFACTURING_READINESS,
  HR_WORKFORCE_PLANNING_READINESS,
  shiftScheduleAppliesOn,
  shiftSchedulesOverlap,
  shiftVersionAppliesOn,
  workforceAssignmentAppliesOn,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630172000_hr_workforce_engine_foundation.sql");

test("HR Workforce Foundation exposes shift kinds and template examples", () => {
  assert.equal(HR_SHIFT_KINDS.length, 8);
  assert.equal(HR_SHIFT_TEMPLATE_EXAMPLES.length, 5);
  assert.equal(HR_SHIFT_ROTATION_EXAMPLES[0]?.patternWeeks.length, 3);
});

test("shift definition contract separates identity from versioned planning metadata", () => {
  const shift = defineHrShiftDefinition({
    branchId: null,
    code: "FACTORY_DAY",
    companyId: "company-1",
    name: "Factory Day Shift",
    shiftKind: "morning",
    status: "active",
    tenantId: "tenant-1",
  });
  const version = defineHrShiftVersion({
    branchId: null,
    companyId: "company-1",
    crossesMidnight: false,
    effectiveFrom: "2026-01-01",
    endTime: "17:00",
    gracePeriodMinutes: 10,
    overtimeEligible: true,
    paidBreakMinutes: 30,
    shiftId: "shift-1",
    startTime: "08:00",
    status: "active",
    tenantId: "tenant-1",
    totalPlannedHours: 8,
    unpaidBreakMinutes: 0,
    version: 1,
  });

  assert.equal(shift.shiftKind, "morning");
  assert.equal(version.totalPlannedHours, 8);
  assert.equal("startTime" in shift, false);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.schedulerRuntimeImplemented, false);
});

test("shift versioning and effective dating preserve historical behavior", () => {
  const v1 = defineHrShiftVersion({
    companyId: "company-1",
    crossesMidnight: false,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    endTime: "17:00",
    gracePeriodMinutes: 10,
    overtimeEligible: true,
    paidBreakMinutes: 30,
    shiftId: "shift-1",
    startTime: "08:00",
    status: "active",
    tenantId: "tenant-1",
    totalPlannedHours: 8,
    unpaidBreakMinutes: 0,
    version: 1,
  });
  const v2 = defineHrShiftVersion({
    companyId: "company-1",
    crossesMidnight: false,
    effectiveFrom: "2026-07-01",
    endTime: "18:00",
    gracePeriodMinutes: 10,
    overtimeEligible: true,
    paidBreakMinutes: 30,
    shiftId: "shift-1",
    startTime: "08:00",
    status: "active",
    tenantId: "tenant-1",
    totalPlannedHours: 9,
    unpaidBreakMinutes: 0,
    version: 2,
  });

  assert.equal(shiftVersionAppliesOn(v1, "2026-03-01"), true);
  assert.equal(shiftVersionAppliesOn(v2, "2026-03-01"), false);
  assert.equal(HR_WORKFORCE_EFFECTIVE_DATING_CONTRACT.historicalVersionsMutableByDirectEdit, false);
});

test("shift templates and rotations are planning metadata without scheduler runtime", () => {
  const template = defineHrShiftTemplate({
    branchId: null,
    code: "FACTORY_DAY",
    companyId: "company-1",
    defaultRestDays: [5, 6],
    name: "Factory Day Shift",
    rotationReady: true,
    status: "active",
    tenantId: "tenant-1",
    weeklyPattern: [1, 1, 1, 1, 1, 0, 0],
  });
  const rotation = defineHrShiftRotation({
    branchId: null,
    cadence: "weekly",
    code: "ABC_WEEKLY",
    companyId: "company-1",
    name: "Week A → Week B → Week C",
    patternWeeks: ["Week A", "Week B", "Week C"],
    repeatFromWeekIndex: 0,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(template.rotationReady, true);
  assert.equal(rotation.patternWeeks.length, 3);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.schedulerRuntimeImplemented, false);
});

test("shift schedule contracts enforce one active schedule per employee date range readiness", () => {
  const schedule = defineHrShiftSchedule({
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    shiftRotationId: "rotation-1",
    shiftTemplateId: "template-1",
    status: "active",
    tenantId: "tenant-1",
    workCalendarId: "calendar-1",
  });
  const overlapping = { ...schedule, effectiveFrom: "2026-06-01", effectiveTo: "2026-12-31" };
  const nonOverlapping = { ...schedule, effectiveFrom: "2027-01-01", effectiveTo: null };

  assert.equal(shiftScheduleAppliesOn(schedule, "2026-03-01"), true);
  assert.equal(shiftSchedulesOverlap(schedule, overlapping), true);
  assert.equal(shiftSchedulesOverlap({ ...schedule, effectiveTo: "2026-12-31" }, nonOverlapping), false);
  assert.equal(HR_WORKFORCE_EFFECTIVE_DATING_CONTRACT.oneActiveShiftSchedulePerEmployeeDateRange, true);
});

test("holiday calendar contracts support effective-dated holiday types", () => {
  const calendar = defineHrHolidayCalendar({
    branchId: null,
    calendarScope: "company",
    code: "COMPANY_HOLIDAYS",
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    name: "Company Holidays",
    status: "active",
    tenantId: "tenant-1",
    workCalendarId: "calendar-1",
  });
  const holiday = defineHrHoliday({
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    holidayCalendarId: "holiday-calendar-1",
    holidayDate: "2026-12-25",
    holidayType: "company",
    isHalfDay: false,
    name: "Christmas Day",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(calendar.calendarScope, "company");
  assert.equal(holiday.holidayType, "company");
});

test("temporary workforce assignments support approval and timeline readiness without workflow runtime", () => {
  const assignment = defineHrWorkforceAssignment({
    assignmentType: "temporary_production_line",
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-02-01",
    effectiveTo: "2026-02-28",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    reason: "Peak production coverage.",
    status: "active",
    targetProductionLineRef: "production-line-1",
    tenantId: "tenant-1",
    timelineEventReadiness: true,
  });

  assert.equal(assignment.timelineEventReadiness, true);
  assert.equal(workforceAssignmentAppliesOn(assignment, "2026-02-15"), true);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.attendanceCalculationImplemented, false);
});

test("attendance device readiness supports vendor types without synchronization runtime", () => {
  assert.equal(HR_ATTENDANCE_DEVICE_TYPES.length, 7);
  const device = defineHrAttendanceDevice({
    branchId: "branch-1",
    code: "ZK-MAIN-GATE",
    companyId: "company-1",
    deviceType: "zkteco",
    ipAddress: "192.168.1.50",
    name: "Main Gate ZKTeco",
    status: "active",
    synchronizationRuntimeImplemented: false,
    tenantId: "tenant-1",
    timezone: "Asia/Riyadh",
  });

  assert.equal(device.deviceType, "zkteco");
  assert.equal(device.synchronizationRuntimeImplemented, false);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.biometricSynchronizationImplemented, false);
});

test("manufacturing and planning readiness are metadata-only without manufacturing dependency", () => {
  assert.equal(HR_WORKFORCE_MANUFACTURING_READINESS.manufacturingDependencyImplemented, false);
  assert.equal(HR_WORKFORCE_MANUFACTURING_READINESS.supportedFutureReferences.includes("production_line"), true);
  assert.equal(HR_WORKFORCE_PLANNING_READINESS.runtimeCalculationImplemented, false);
  assert.equal(HR_WORKFORCE_PLANNING_READINESS.metadataFields.includes("production_coverage"), true);
});

test("workforce availability contract defines states without runtime evaluation", () => {
  assert.equal(HR_WORKFORCE_AVAILABILITY_CONTRACT.states.length, 8);
  assert.equal(HR_WORKFORCE_AVAILABILITY_CONTRACT.runtimeEvaluationImplemented, false);
  assert.equal(HR_WORKFORCE_AVAILABILITY_CONTRACT.states.includes("shift_assigned"), true);
});

test("workforce foundation keeps planning separate from attendance observation", () => {
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.workforcePlansWhenEmployeeExpectedToWork, true);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.attendanceObservesWhatHappened, true);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.payrollPaysWhatGetsPaid, true);
  assert.equal(HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT.mixesWorkforceWithAttendanceRecords, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsWorkforceEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsAttendanceCalculation, false);
});

test("workforce permissions, events, and platform contracts are registered", () => {
  for (const permission of [
    "hr.workforce.view",
    "hr.workforce.manage",
    "hr.headcount.manage",
    "hr.vacancies.manage",
    "hr.hiring_requests.manage",
    "hr.shifts.view",
    "hr.shifts.manage",
    "hr.calendars.view",
    "hr.calendars.manage",
    "hr.devices.view",
    "hr.devices.manage",
  ]) {
    assert.equal(HR_PERMISSION_LIST.map(String).includes(permission), true);
  }
  assert.equal(HR_WORKFORCE_EVENT_DEFINITIONS.length, 10);
  assert.equal(HR_WORKFORCE_AUDIT_ACTIONS.deviceRegistered, "hr.workforce.device.registered");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.workforce-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.workforceTables.length, 12);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.workforce.import"), true);
});

test("HR workforce migration adds foundation tables, one-active schedule constraint, and employment profile linkage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_WORKFORCE_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_shift_schedules_one_active_schedule_per_range",
    "hr_shift_versions_one_active_version_per_range",
    "prevent_hr_shift_version_history_rewrite",
    "hr_employment_profiles_shift_schedule_ref_fk",
    "shift_policy_version_id uuid references public.hr_policy_versions",
    "synchronization_runtime_implemented', false",
    "timeline_event_readiness', true",
    "hr.workforce.view",
    "hr.devices.manage",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "attendance_calculation",
    "attendance_records",
    "biometric_sync",
    "punch_log",
    "clock_in",
    "clock_out",
    "payroll_batch",
    "self_service",
    "manager_portal",
    "workflow_runtime",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Workforce migration must not include ${forbidden}`);
  }
});

test("workforce public contracts do not implement attendance runtime", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/workforce-foundation.ts"), "utf8");

  for (const forbidden of [
    "calculateAttendance",
    "syncBiometricDevice",
    "processPunchLog",
    "runScheduler(",
  ]) {
    assert.equal(source.includes(forbidden), false, `Workforce contracts must not include ${forbidden}`);
  }
});
