import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("hr leave runtime: schemas validate", async () => {
  const { hrLeaveCarryForwardPreviewSchema, hrLeaveEncashmentCreateSchema } = await import(
    "@/features/hr/server-api"
  );
  assert.equal(
    hrLeaveCarryForwardPreviewSchema.safeParse({
      scope: "company_closing",
      sourcePeriodEnd: "2026-12-31",
      targetPeriodStart: "2027-01-01",
    }).success,
    true,
  );
  assert.equal(
    hrLeaveEncashmentCreateSchema.safeParse({
      employeeId: "550e8400-e29b-41d4-a716-446655440000",
      leaveTypeId: "550e8400-e29b-41d4-a716-446655440001",
      requestedQuantity: 2,
    }).success,
    true,
  );
});

test("hr leave runtime: engines and services exist", () => {
  const files = [
    "src/features/hr/application/services/hr-leave-policy.engine.ts",
    "src/features/hr/application/services/hr-leave-balance.engine.ts",
    "src/features/hr/application/services/hr-leave-conflict.engine.ts",
    "src/features/hr/application/services/hr-leave-runtime.service.ts",
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(process.cwd(), file)));
  }
  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-leave-runtime.service.ts"),
    "utf8",
  );
  assert.match(runtimeSource, /export class HrLeavePayrollInputService/);
  assert.match(runtimeSource, /export class HrLeaveRuntimeService/);
  assert.match(runtimeSource, /countOpenLeaveOverlappingPeriod/);
});

test("hr leave runtime: actions and loader exist", () => {
  const actionsSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/actions/hr-leave-runtime.actions.ts"),
    "utf8",
  );
  const loaderSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/loaders/hr-leave-runtime.loader.ts"),
    "utf8",
  );
  assert.match(actionsSource, /export async function previewCarryForwardAction/);
  assert.match(actionsSource, /export async function approveEncashmentAction/);
  assert.match(loaderSource, /export async function loadHrLeaveRuntimeWorkspace/);
});

test("hr leave runtime: permissions registered", async () => {
  const { HR_PERMISSIONS } = await import("@/features/hr/server-api");
  assert.equal(HR_PERMISSIONS.leaveCarryForward, "hr.leave.carry_forward");
  assert.equal(HR_PERMISSIONS.leaveEncashment, "hr.leave.encashment");
  assert.equal(HR_PERMISSIONS.leaveReportsView, "hr.leave.reports.view");
});

test("hr leave runtime: migration defines production tables", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260707140000_hr_leave_runtime_production.sql"),
    "utf8",
  );
  assert.match(sql, /hr_leave_balance_ledger/);
  assert.match(sql, /hr_leave_carry_forward_runs/);
  assert.match(sql, /hr_leave_encashment_requests/);
  assert.match(sql, /hr\.leave\.carry_forward/);
});

test("hr leave runtime: UI pages exist", () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/leave/page.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/leave/reports/page.tsx")));
});

test("hr leave runtime: payroll export uses leave input service", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance-payroll-export.service.ts"),
    "utf8",
  );
  assert.match(source, /HrLeavePayrollInputService/);
  assert.match(source, /countOpenLeaveOverlappingPeriod/);
  assert.match(source, /getEmployeePayrollInputs/);
});

test("hr leave runtime: foundation flags runtime implemented", async () => {
  const foundation = await import("@/features/hr/leave-absence-foundation");
  assert.ok(foundation.HR_LEAVE_RUNTIME_TABLES.includes("hr_leave_encashment_requests"));
});

test("hr leave runtime: conflict codes defined", async () => {
  const constants = await import("@/features/hr/server-api");
  assert.ok(constants.LEAVE_CONFLICT_CODES.includes("insufficient_balance"));
});

test("hr leave runtime: leave type schema validates create payload", async () => {
  const { hrLeaveTypeCreateSchema } = await import("@/features/hr/server-api");
  const parsed = hrLeaveTypeCreateSchema.parse({
    code: "annual",
    name: "Annual Leave",
    paid: "on",
    status: "active",
  });
  assert.equal(parsed.code, "ANNUAL");
  assert.equal(parsed.paid, true);
});
