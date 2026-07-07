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
import { HR_EMPLOYEE_IMPORT_CONTRACT, defineHrEmployee } from "@/features/hr/public-api";

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
  const { hrEmployeeWizardSchema } = await import("@/features/hr/application/schemas/hr-employees.schema");
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
  const { hrEmployeeWizardSchema } = await import("@/features/hr/application/schemas/hr-employees.schema");
  const parsed = hrEmployeeWizardSchema.safeParse({
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
    effectiveFrom: "2026-01-01",
    employmentType: "full-time",
    fullName: "Jane Smith",
  });

  assert.equal(parsed.success, false);
});

test("hr employee quick edit schema accepts attendanceCode update and blank clear", async () => {
  const { hrEmployeeQuickEditSchema } = await import("@/features/hr/application/schemas/hr-employees.schema");
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

test("hr employee import contract maps attendance code column", () => {
  const mapping = HR_EMPLOYEE_IMPORT_CONTRACT.mappings.find((item) => item.targetField === "attendanceCode");
  assert.ok(mapping, "Import contract must map Attendance Code.");
  assert.equal(mapping.sourceColumn, "Attendance Code");
  assert.equal(
    HR_EMPLOYEE_IMPORT_CONTRACT.validationRules.some((rule) => rule.fieldKey === "attendanceCode"),
    true,
  );
});

test("hr employee import and export columns include attendanceCode", () => {
  assert.ok(HR_EMPLOYEE_IMPORT_COLUMNS.some((column) => column.field === "attendanceCode"));
  assert.ok(HR_EMPLOYEE_EXPORT_COLUMNS.some((column) => column.field === "attendanceCode"));
  assert.ok(HR_EMPLOYEE_IMPORT_VALIDATION_RULES.some((rule) => rule.includes("Attendance code")));
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

test("hr employee wizard and edit UI modules export attendance code surfaces", async () => {
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

  assert.match(wizardSource, /name="attendanceCode"/);
  assert.match(wizardSource, /name="employeeNumber"/);
  assert.match(wizardSource, /Attendance Code \/ رمز الحضور/);
  assert.match(editSource, /name="attendanceCode"/);
  assert.match(editSource, /name="employeeNumber"/);
  assert.match(tableSource, /attendanceCode/);
});
