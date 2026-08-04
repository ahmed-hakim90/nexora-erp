import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  HR_EMPLOYEE_EXPORT_COLUMNS,
  HR_EMPLOYEE_IMPORT_COLUMNS,
  HR_EMPLOYEE_IMPORT_VALIDATION_RULES,
  HR_PRODUCTION_VALIDATION_RULES,
  HR_SEARCH_ENTITY_PROVIDERS,
} from "@/features/hr/hr-production-readiness-foundation";
import { HR_EMPLOYEE_IMPORT_CONTRACT, defineHrEmployee } from "@/features/hr/server-api";

function hasColumnField(columns: readonly { field: string }[], field: string): boolean {
  return columns.some((column) => column.field === field);
}

function hasColumnAlias(columns: readonly { aliases?: readonly string[] }[], alias: string): boolean {
  return columns.some((column) => column.aliases?.includes(alias) ?? false);
}

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260714120000_hr_employee_attendance_code.sql",
);

test("hr employee attendance code migration adds column, constraints, and indexes", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /add column if not exists attendance_code text/);
  assert.match(sql, /hr_employees_attendance_code_length_chk/);
  assert.match(sql, /hr_employees_attendance_code_active_uq/);
  assert.match(sql, /lower\(trim\(attendance_code\)\)/);
  assert.match(sql, /hr_employees_attendance_code_search_idx/);
  assert.match(sql, /hr_employees_attendance_code_trgm_idx/);
});

test("hr employee definition supports optional attendanceCode on identity master", () => {
  const employee = defineHrEmployee({
    attendanceCode: "FP-1001",
    branchId: "branch-1",
    companyId: "company-1",
    employeeNumber: "E-001",
    fullName: "Nexora Employee",
    partyId: "party-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(employee.attendanceCode, "FP-1001");
});

test("hr employee wizard schema accepts attendanceCode on create", async () => {
  const { hrEmployeeWizardSchema } = await import("@/features/hr/server-api");
  const parsed = hrEmployeeWizardSchema.safeParse({
    attendanceCode: "  FP-42  ",
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
    effectiveFrom: "2026-01-01",
    employeeNumber: "  e-100  ",
    employmentType: "full-time",
    fullName: "Jane Smith",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.attendanceCode, "FP-42");
    assert.equal(parsed.data.employeeNumber, "E-100");
  }
});

test("hr employee wizard schema requires employeeNumber", async () => {
  const { hrEmployeeWizardSchema } = await import("@/features/hr/server-api");
  const parsed = hrEmployeeWizardSchema.safeParse({
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
    effectiveFrom: "2026-01-01",
    employmentType: "full-time",
    fullName: "Jane Smith",
  });

  assert.equal(parsed.success, false);
});

test("hr employee quick edit schema accepts attendanceCode update and blank clear", async () => {
  const { hrEmployeeQuickEditSchema } = await import("@/features/hr/server-api");
  const parsed = hrEmployeeQuickEditSchema.safeParse({
    attendanceCode: "   ",
    employeeId: "550e8400-e29b-41d4-a716-446655440000",
    employeeNumber: "E-001",
    fullName: "Ahmed Hassan",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.attendanceCode, undefined);
  }
});

test("hr employee import contract uses unified employee code", () => {
  const mapping = HR_EMPLOYEE_IMPORT_CONTRACT.mappings.find((item) => item.targetField === "employeeNumber");
  assert.ok(mapping, "Import contract must map Employee Code.");
  assert.equal(mapping.sourceColumn, "Employee Code");
  assert.equal(
    HR_EMPLOYEE_IMPORT_CONTRACT.mappings.some((item) => item.targetField === "attendanceCode"),
    false,
  );
  assert.equal(
    HR_EMPLOYEE_IMPORT_CONTRACT.validationRules.some((rule) => rule.fieldKey === "employeeNumber" && rule.type === "duplicate"),
    true,
  );
});

test("hr employee import has one code column; export drops separate attendance column", () => {
  assert.equal(HR_EMPLOYEE_IMPORT_COLUMNS.filter((column) => column.field === "employeeNumber").length, 1);
  assert.equal(
    hasColumnField(HR_EMPLOYEE_IMPORT_COLUMNS, "attendanceCode"),
    false,
  );
  assert.ok(hasColumnAlias(HR_EMPLOYEE_IMPORT_COLUMNS, "كود الحضور"));
  assert.ok(hasColumnAlias(HR_EMPLOYEE_IMPORT_COLUMNS, "attendance code"));
  assert.equal(
    hasColumnField(HR_EMPLOYEE_EXPORT_COLUMNS, "attendanceCode"),
    false,
  );
  assert.ok(HR_EMPLOYEE_EXPORT_COLUMNS.some((column) => column.field === "employeeNumber"));
  assert.ok(HR_EMPLOYEE_IMPORT_VALIDATION_RULES.some((rule) => rule.includes("Employee code")));
});

test("hr employee search provider includes attendanceCode field", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((item) => item.key === "hr.employees.search");
  assert.ok(provider);
  assert.ok(provider.fields.includes("attendanceCode"));
  assert.match(provider.description, /attendance code/i);
});

test("hr employee production validation rules include duplicate attendance code message", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.employee.find((item) => item.code === "duplicate_attendance_code");
  assert.ok(rule);
  assert.equal(rule.message, "This attendance code is already assigned to another employee.");
});

test("hr employee validation service defines duplicate attendance code guard", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-employee-validation.service.ts"),
    "utf8",
  );
  assert.match(source, /duplicate_attendance_code/);
  assert.match(source, /This attendance code is already assigned to another employee\./);
  assert.match(source, /attendanceCode/);
});

test("hr employee wizard and edit UI use employee code as attendance identity", async () => {
  const wizardSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-employee-wizard.tsx"),
    "utf8",
  );
  const editSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-employee-edit-modal.tsx"),
    "utf8",
  );
  const tableSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-employees-table.tsx"),
    "utf8",
  );
  const createActionSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/routes/actions/hr-employees.actions.ts"),
    "utf8",
  );

  assert.match(wizardSource, /name="employeeNumber"/);
  assert.doesNotMatch(wizardSource, /name="attendanceCode"/);
  assert.match(wizardSource, /Employee code \/ كود الموظف|hr\.employees\.(wizard|form|column)\.employeeCode|كود الموظف/);
  assert.match(editSource, /name="employeeNumber"/);
  assert.doesNotMatch(editSource, /name="attendanceCode"/);
  assert.match(tableSource, /hr\.employees\.column\.employeeCode|Employee code \/ كود الموظف/);
  assert.match(createActionSource, /resolveEmployeeAttendanceCode/);
});

test("employee identity helpers unify job code and attendance code", async () => {
  const { resolveEmployeeAttendanceCode, resolveEmployeeIdentityCode } = await import(
    "@/features/hr/server-api"
  );

  assert.equal(resolveEmployeeAttendanceCode("  emp-12  "), "EMP-12");
  assert.equal(resolveEmployeeIdentityCode({ employeeNumber: "e-9", attendanceCode: "FP-1" }), "E-9");
  assert.equal(resolveEmployeeIdentityCode({ attendanceCode: "  fp-77  " }), "FP-77");
  assert.equal(resolveEmployeeIdentityCode({}), null);
});
