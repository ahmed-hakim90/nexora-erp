import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("hr overtime runtime: schemas validate", async () => {
  const { hrOvertimeCreateSchema, hrOvertimeCandidateActionSchema } = await import(
    "@/features/hr/application/schemas/hr-overtime-runtime.schema"
  );
  assert.equal(
    hrOvertimeCreateSchema.safeParse({
      employeeId: "550e8400-e29b-41d4-a716-446655440000",
      hours: 2,
      workDate: "2026-07-07",
    }).success,
    true,
  );
  assert.equal(
    hrOvertimeCandidateActionSchema.safeParse({
      action: "approve",
      candidateId: "550e8400-e29b-41d4-a716-446655440001",
    }).success,
    true,
  );
});

test("hr overtime runtime: engines and services exist", () => {
  const files = [
    "src/features/hr/application/services/hr-overtime-policy.engine.ts",
    "src/features/hr/application/services/hr-overtime-validation.engine.ts",
    "src/features/hr/application/services/hr-overtime-runtime.service.ts",
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(process.cwd(), file)));
  }
  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-overtime-runtime.service.ts"),
    "utf8",
  );
  assert.match(runtimeSource, /export class HrOvertimePayrollInputService/);
  assert.match(runtimeSource, /export class HrOvertimeRuntimeService/);
  assert.match(runtimeSource, /countOpenOvertimeOverlappingPeriod/);
  assert.match(runtimeSource, /resolveOvertimeCandidate/);
  assert.match(runtimeSource, /syncCandidateFromAttendance/);
});

test("hr overtime runtime: actions and loader exist", () => {
  const actionsSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/actions/hr-overtime-runtime.actions.ts"),
    "utf8",
  );
  const loaderSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/loaders/hr-overtime-runtime.loader.ts"),
    "utf8",
  );
  assert.match(actionsSource, /export async function createOvertimeRequestAction/);
  assert.match(actionsSource, /export async function resolveOvertimeCandidateAction/);
  assert.match(loaderSource, /export async function loadHrOvertimeRuntimeWorkspace/);
});

test("hr overtime runtime: permissions registered", async () => {
  const { HR_PERMISSIONS } = await import("@/features/hr/public-api");
  assert.equal(HR_PERMISSIONS.overtimeView, "hr.overtime.view");
  assert.equal(HR_PERMISSIONS.overtimeManage, "hr.overtime.manage");
  assert.equal(HR_PERMISSIONS.overtimeRequest, "hr.overtime.request");
  assert.equal(HR_PERMISSIONS.overtimeApprove, "hr.overtime.approve");
  assert.equal(HR_PERMISSIONS.overtimeExport, "hr.overtime.export");
});

test("hr overtime runtime: migration defines production tables", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260707150000_hr_overtime_runtime_production.sql"),
    "utf8",
  );
  assert.match(sql, /hr_overtime_policies/);
  assert.match(sql, /hr_overtime_approval_events/);
  assert.match(sql, /hr_overtime_candidates/);
  assert.match(sql, /hr\.overtime\.view/);
  assert.match(sql, /under_review/);
});

test("hr overtime runtime: UI pages exist", () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/overtime/page.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/overtime/reports/page.tsx")));
});

test("hr overtime runtime: payroll export uses overtime input service", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance-payroll-export.service.ts"),
    "utf8",
  );
  assert.match(source, /HrOvertimePayrollInputService/);
  assert.match(source, /countOpenOvertimeOverlappingPeriod/);
  assert.match(source, /getEmployeePayrollInputs/);
});

test("hr overtime runtime: attendance integrates overtime candidates", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance.service.ts"),
    "utf8",
  );
  assert.match(source, /HrOvertimeRuntimeService/);
  assert.match(source, /syncCandidateFromAttendance/);
  assert.match(source, /calculateOvertimeMinutes/);
});

test("hr overtime runtime: foundation flags runtime implemented", async () => {
  const foundation = await import("@/features/hr/overtime-foundation");
  assert.ok(foundation.HR_OVERTIME_RUNTIME_TABLES.includes("hr_overtime_candidates"));
  assert.equal(foundation.HR_OVERTIME_RUNTIME_BOUNDARY.runtimeOvertimeCalculationImplemented, true);
});

test("hr overtime runtime: conflict codes defined", async () => {
  const constants = await import("@/features/hr/application/constants/hr-overtime-runtime.constants");
  assert.ok(constants.OVERTIME_CONFLICT_CODES.includes("leave_conflict"));
  assert.ok(constants.HR_OVERTIME_TYPES.length >= 8);
});

test("hr overtime runtime: workforce actions re-export overtime runtime", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/actions/hr-workforce-runtime.actions.ts"),
    "utf8",
  );
  assert.match(source, /hr-overtime-runtime\.actions/);
  assert.doesNotMatch(source, /HrWorkforceRuntimeService.*createOvertimeRequest/);
});
