import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("hr attendance payroll export: schemas validate", async () => {
  const {
    hrAttendanceClosingCreateSchema,
    hrAttendanceExportExecuteSchema,
    hrAttendanceReopenSchema,
  } = await import("@/features/hr/application/schemas/hr-attendance-payroll-export.schema");

  const closing = hrAttendanceClosingCreateSchema.safeParse({
    periodEnd: "2026-07-31",
    periodStart: "2026-07-01",
    scope: "monthly",
  });
  assert.equal(closing.success, true);

  const exportInput = hrAttendanceExportExecuteSchema.safeParse({
    confirmed: true,
    periodEnd: "2026-07-31",
    periodStart: "2026-07-01",
  });
  assert.equal(exportInput.success, true);

  const reopenInvalid = hrAttendanceReopenSchema.safeParse({
    closingId: "550e8400-e29b-41d4-a716-446655440000",
    reason: "short",
  });
  assert.equal(reopenInvalid.success, false);

  const reopenValid = hrAttendanceReopenSchema.safeParse({
    closingId: "550e8400-e29b-41d4-a716-446655440000",
    reason: "Payroll correction required after supervisor review.",
  });
  assert.equal(reopenValid.success, true);
});

test("hr attendance payroll export: service and actions exported", async () => {
  const service = await import("@/features/hr/application/services/hr-attendance-payroll-export.service");
  const actions = await import("@/features/hr/routes/actions/hr-attendance-payroll-export.actions");
  const loader = await import("@/features/hr/routes/loaders/hr-attendance-export.loader");

  assert.equal(typeof service.HrAttendancePayrollExportService, "function");
  assert.equal(typeof actions.executeAttendanceExportAction, "function");
  assert.equal(typeof actions.reopenAttendanceClosingAction, "function");
  assert.equal(typeof loader.loadHrAttendanceExportWorkspace, "function");
});

test("hr attendance payroll export: permissions registered", async () => {
  const { HR_PERMISSIONS } = await import("@/features/hr/permissions/permission-registry");
  assert.equal(HR_PERMISSIONS.attendanceExport, "hr.attendance.export");
  assert.equal(HR_PERMISSIONS.attendanceReopen, "hr.attendance.reopen");
  assert.equal(HR_PERMISSIONS.attendanceSnapshotView, "hr.attendance.snapshot.view");
});

test("hr attendance payroll export: migration defines runtime tables", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260707130000_hr_attendance_payroll_export_runtime.sql"),
    "utf8",
  );
  assert.match(sql, /hr_attendance_closings/);
  assert.match(sql, /hr_attendance_payroll_export_batches/);
  assert.match(sql, /hr_attendance_payroll_snapshots/);
  assert.match(sql, /hr\.attendance\.export/);
  assert.match(sql, /hr\.attendance\.reopen/);
  assert.match(sql, /prevent_hr_attendance_payroll_snapshot_mutation/);
});

test("hr attendance payroll export: UI workspace and page exist", () => {
  const page = path.join(process.cwd(), "src/app/(erp)/erp/hr/attendance-export/page.tsx");
  const workspace = path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-attendance-export.tsx");
  assert.ok(fs.existsSync(page));
  assert.ok(fs.existsSync(workspace));
});

test("hr attendance payroll export: constants define jobs and validation codes", async () => {
  const constants = await import("@/features/hr/application/constants/hr-attendance-payroll.constants");
  assert.equal(constants.ATTENDANCE_EXPORT_JOB.key, "hr.attendance.payroll-export");
  assert.ok(constants.PAYROLL_EXPORT_VALIDATION_CODES.includes("missing_punches"));
  assert.ok(constants.HR_ATTENDANCE_PAYROLL_EVENT_KEYS.attendanceExported);
});

test("hr attendance payroll export: attendance service enforces lock guards", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance.service.ts"),
    "utf8",
  );
  assert.match(source, /assertDayMutable/);
  assert.match(source, /LOCKED_ATTENDANCE_DAY_STATUSES/);
});

test("hr attendance payroll export: foundation flags runtime implemented", async () => {
  const foundation = await import("@/features/hr/attendance-foundation");
  assert.equal(foundation.HR_ATTENDANCE_PAYROLL_SNAPSHOT_READINESS.payrollRuntimeImplemented, true);
  assert.equal(foundation.HR_ATTENDANCE_LOCK_READINESS.payrollLockRuntimeImplemented, true);
  assert.ok(foundation.HR_ATTENDANCE_PAYROLL_EXPORT_TABLES.includes("hr_attendance_payroll_snapshots"));
});
