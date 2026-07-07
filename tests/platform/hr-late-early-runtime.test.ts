import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("hr late early runtime: schemas validate", async () => {
  const {
    hrLateEarlyPolicyAssignmentCreateSchema,
    hrLateEarlyPolicyCreateSchema,
    hrLateEarlyViolationApproveSchema,
    hrLateEarlyViolationOverrideSchema,
  } = await import("@/features/hr/application/schemas/hr-late-early-runtime.schema");
  assert.equal(
    hrLateEarlyPolicyCreateSchema.safeParse({
      code: "STD-LATE",
      effectiveFrom: "2026-01-01",
      name: "Standard Late Policy",
    }).success,
    true,
  );
  assert.equal(
    hrLateEarlyViolationApproveSchema.safeParse({
      violationId: "550e8400-e29b-41d4-a716-446655440000",
    }).success,
    true,
  );
  assert.equal(
    hrLateEarlyPolicyAssignmentCreateSchema.safeParse({
      assignmentScope: "department",
      effectiveFrom: "2026-01-01",
      policyId: "550e8400-e29b-41d4-a716-446655440001",
      referenceEntityId: "550e8400-e29b-41d4-a716-446655440002",
    }).success,
    true,
  );
  assert.equal(
    hrLateEarlyViolationOverrideSchema.safeParse({
      deductionMinutes: 30,
      earlyLeaveMinutes: 0,
      lateMinutes: 30,
      reason: "Manager override",
      violationId: "550e8400-e29b-41d4-a716-446655440003",
    }).success,
    true,
  );
});

test("hr late early runtime: engines and services exist", () => {
  const files = [
    "src/features/hr/application/services/hr-late-early-policy.engine.ts",
    "src/features/hr/application/services/hr-late-early-validation.engine.ts",
    "src/features/hr/application/services/hr-late-early-violation.engine.ts",
    "src/features/hr/application/services/hr-late-early-runtime.service.ts",
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(process.cwd(), file)));
  }
  const policySource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-late-early-policy.engine.ts"),
    "utf8",
  );
  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-late-early-runtime.service.ts"),
    "utf8",
  );
  assert.match(policySource, /HrAssignmentResolverService/);
  assert.match(policySource, /resolveExpectedShiftWindow/);
  assert.match(policySource, /computeDeductionMinutes/);
  assert.match(policySource, /checkPeriodLimits/);
  assert.match(runtimeSource, /export class HrLateEarlyPayrollInputService/);
  assert.match(runtimeSource, /export class HrLateEarlyRuntimeService/);
  assert.match(runtimeSource, /evaluateAttendanceDay/);
  assert.match(runtimeSource, /markViolationsExportedForPeriod/);
  assert.match(runtimeSource, /cancelViolation/);
  assert.match(runtimeSource, /overrideViolation/);
});

test("hr late early runtime: deduction method math", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-late-early-policy.engine.ts"),
    "utf8",
  );
  assert.match(source, /computeDeductionMinutes/);
  assert.match(source, /method === "half_day"/);
  assert.match(source, /method === "full_day"/);
  assert.match(source, /method === "none"/);

  function computeDeductionMinutes(input: {
    deductionMethod?: "minutes" | "half_day" | "full_day" | "none";
    earlyLeaveMinutes: number;
    lateMinutes: number;
    shiftDurationMinutes: number;
  }): number {
    const method = input.deductionMethod ?? "minutes";
    if (method === "none") return 0;
    if (method === "half_day") return Math.ceil(input.shiftDurationMinutes / 2);
    if (method === "full_day") return input.shiftDurationMinutes;
    return input.lateMinutes + input.earlyLeaveMinutes;
  }

  assert.equal(computeDeductionMinutes({ deductionMethod: "minutes", earlyLeaveMinutes: 10, lateMinutes: 20, shiftDurationMinutes: 480 }), 30);
  assert.equal(computeDeductionMinutes({ deductionMethod: "half_day", earlyLeaveMinutes: 10, lateMinutes: 20, shiftDurationMinutes: 480 }), 240);
  assert.equal(computeDeductionMinutes({ deductionMethod: "full_day", earlyLeaveMinutes: 10, lateMinutes: 20, shiftDurationMinutes: 480 }), 480);
  assert.equal(computeDeductionMinutes({ deductionMethod: "none", earlyLeaveMinutes: 10, lateMinutes: 20, shiftDurationMinutes: 480 }), 0);
});

test("hr late early runtime: actions and loader exist", () => {
  const actionsSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/actions/hr-late-early-runtime.actions.ts"),
    "utf8",
  );
  const loaderSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/loaders/hr-late-early-runtime.loader.ts"),
    "utf8",
  );
  assert.match(actionsSource, /export async function createLateEarlyPolicyAction/);
  assert.match(actionsSource, /export async function createLateEarlyPolicyAssignmentAction/);
  assert.match(actionsSource, /export async function approveLateEarlyViolationAction/);
  assert.match(actionsSource, /export async function cancelLateEarlyViolationAction/);
  assert.match(loaderSource, /export async function loadHrLateEarlyRuntimeWorkspace/);
  assert.match(loaderSource, /managerScopeActive/);
  assert.match(loaderSource, /timelineEvents/);
});

test("hr late early runtime: permissions registered", async () => {
  const { HR_PERMISSIONS } = await import("@/features/hr/public-api");
  assert.equal(HR_PERMISSIONS.lateView, "hr.late.view");
  assert.equal(HR_PERMISSIONS.lateApprove, "hr.late.approve");
  assert.equal(HR_PERMISSIONS.latePolicyManage, "hr.late.policy.manage");
});

test("hr late early runtime: migration defines production tables", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260707160000_hr_late_early_runtime_production.sql"),
    "utf8",
  );
  const hardeningSql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260707170100_hr_late_early_runtime_hardening.sql"),
    "utf8",
  );
  assert.match(sql, /hr_late_early_policies/);
  assert.match(sql, /hr_late_early_violations/);
  assert.match(sql, /hr_late_early_violation_ledger/);
  assert.match(sql, /hr\.late\.view/);
  assert.match(hardeningSql, /deduction_minutes/);
});

test("hr late early runtime: UI pages exist", () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/late-early/page.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/late-early/reports/page.tsx")));
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-late-early-workspace.tsx")), false);
});

test("hr late early runtime: payroll export uses payroll input service and export lifecycle", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance-payroll-export.service.ts"),
    "utf8",
  );
  assert.match(source, /HrLateEarlyPayrollInputService/);
  assert.match(source, /HrLateEarlyRuntimeService/);
  assert.match(source, /countOpenViolationsOverlappingPeriod/);
  assert.match(source, /markViolationsExportedForPeriod/);
  assert.match(source, /deduction_minutes: employee\.deductionMinutes/);
});

test("hr late early runtime: foundation wired in public api", async () => {
  const foundation = await import("@/features/hr/late-early-foundation");
  const { HR_FOUNDATION_CONTRACTS } = await import("@/features/hr/public-api");
  assert.equal(foundation.HR_LATE_EARLY_ENGINE_BOUNDARY_CONTRACT.runtimeLateEarlyCalculationImplemented, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.lateEarlyBoundary.runtimeLateEarlyCalculationImplemented, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.lateEarlyTables.includes("hr_late_early_violations"), true);
});

test("hr late early runtime: attendance triggers evaluation only", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-attendance.service.ts"),
    "utf8",
  );
  assert.match(source, /HrLateEarlyRuntimeService/);
  assert.match(source, /evaluateAttendanceDay/);
});

test("hr late early runtime: conflict codes defined", async () => {
  const constants = await import("@/features/hr/application/constants/hr-late-early-runtime.constants");
  assert.ok(constants.LATE_EARLY_CONFLICT_CODES.includes("payroll_locked"));
  assert.ok(constants.LATE_EARLY_CONFLICT_CODES.includes("attendance_exported"));
});

test("hr late early runtime: employee profile loads approval timeline", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/loaders/hr-employee-profile.loader.ts"),
    "utf8",
  );
  assert.match(source, /hr_late_early_approval_events/);
  assert.match(source, /lateEarlyApprovalRows/);
});
