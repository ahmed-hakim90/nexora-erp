import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("hr enterprise: leave schema validates required fields", async () => {
  const { hrLeaveCreateSchema, hrLeavePolicyCreateSchema } = await import("@/features/hr/application/schemas/hr-leave.schema");
  const invalid = hrLeaveCreateSchema.safeParse({ employeeId: "550e8400-e29b-41d4-a716-446655440000" });
  assert.equal(invalid.success, false);
  const valid = hrLeaveCreateSchema.safeParse({
    employeeId: "550e8400-e29b-41d4-a716-446655440000",
    endsOn: "2026-01-05",
    leaveTypeId: "550e8400-e29b-41d4-a716-446655440001",
    startsOn: "2026-01-01",
  });
  assert.equal(valid.success, true);

  const policy = hrLeavePolicyCreateSchema.safeParse({
    annualEntitlement: 21,
    leaveTypeId: "550e8400-e29b-41d4-a716-446655440001",
  });
  assert.equal(policy.success, true);
  assert.equal(policy.success && policy.data.carryForwardAllowed, false);
});

test("hr enterprise: leave attendance payroll services are exported", async () => {
  const leave = await import("@/features/hr/application/services/hr-leave.service");
  const attendance = await import("@/features/hr/application/services/hr-attendance.service");
  const payroll = await import("@/features/hr/application/services/hr-payroll.service");
  const fileAttachment = await import("@/features/hr/application/services/hr-file-attachment.service");
  assert.equal(typeof leave.HrLeaveService, "function");
  assert.equal(typeof attendance.HrAttendanceService, "function");
  assert.equal(typeof payroll.HrPayrollService, "function");
  assert.equal(typeof fileAttachment.HrFileAttachmentService, "function");
});

test("hr enterprise: leave and payroll setup actions exist", async () => {
  const leaveActions = await import("@/features/hr/routes/actions/hr-leave.actions");
  const payrollActions = await import("@/features/hr/routes/actions/hr-payroll.actions");
  const attendanceActions = await import("@/features/hr/routes/actions/hr-attendance.actions");
  const compensationActions = await import("@/features/hr/routes/actions/hr-compensation.actions");
  assert.equal(typeof leaveActions.createLeaveTypeAction, "function");
  assert.equal(typeof leaveActions.updateLeaveTypeAction, "function");
  assert.equal(typeof leaveActions.archiveLeaveTypeAction, "function");
  assert.equal(typeof leaveActions.createLeavePolicyAction, "function");
  assert.equal(typeof leaveActions.updateLeavePolicyAction, "function");
  assert.equal(typeof leaveActions.activateLeavePolicyAction, "function");
  assert.equal(typeof payrollActions.createPayrollCalendarAction, "function");
  assert.equal(typeof payrollActions.createPayrollGroupAction, "function");
  assert.equal(typeof payrollActions.createPayrollPeriodAction, "function");
  assert.equal(typeof attendanceActions.recordAttendancePunchAction, "function");
  assert.equal(typeof compensationActions.createCompensationComponentAction, "function");
});

test("hr enterprise: penalties and bank accounts pages exist", () => {
  const penalties = path.join(process.cwd(), "src/app/(erp)/erp/hr/penalties/page.tsx");
  const bankAccounts = path.join(process.cwd(), "src/app/(erp)/erp/hr/bank-accounts/page.tsx");
  assert.ok(fs.existsSync(penalties));
  assert.ok(fs.existsSync(bankAccounts));
});

test("hr enterprise: financial export routes exist", () => {
  const advances = path.join(process.cwd(), "src/app/api/hr/advances/export/route.ts");
  const loans = path.join(process.cwd(), "src/app/api/hr/loans/export/route.ts");
  assert.ok(fs.existsSync(advances));
  assert.ok(fs.existsSync(loans));
});

test("hr enterprise: settings page wires leave and payroll CRUD without seeds", () => {
  const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/settings/page.tsx"), "utf8");
  const workspaceSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-settings-workspace.tsx"),
    "utf8",
  );
  assert.match(pageSource, /HrSettingsWorkspace/);
  assert.match(workspaceSource, /createLeaveTypeAction/);
  assert.match(workspaceSource, /createLeavePolicyAction/);
  assert.match(workspaceSource, /updateLeavePolicyAction/);
  assert.match(workspaceSource, /createPayrollCalendarAction/);
  assert.match(workspaceSource, /createPayrollGroupAction/);
  assert.match(workspaceSource, /createPayrollPeriodAction/);
  assert.doesNotMatch(workspaceSource, /ensureDefaultLeaveTypesAction|ensureDefaultPayrollSetupAction|Seed Default/);
});

test("hr enterprise: attendance leave workspace exposes leave calendar tab", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-attendance-leave-workspace.tsx"),
    "utf8",
  );
  assert.match(source, /tab: "calendar"/);
  assert.match(source, /HrLeaveCalendar/);
});

test("hr enterprise: documents storage migration defines hr-documents bucket", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260715120000_hr_documents_storage.sql"),
    "utf8",
  );
  assert.match(sql, /hr-documents/);
});
