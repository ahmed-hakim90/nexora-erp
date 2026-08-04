import assert from "node:assert/strict";
import test from "node:test";

import { HR_ONBOARDING_CHECKLIST_ITEMS } from "@/features/hr/template-lifecycle-foundation";
import { hrEmployeeWizardSchema } from "@/features/hr/server-api";

const DEFAULT_WORKING_WEEK_DAYS = [0, 1, 2, 3, 4] as const;

const DEPT_ID = "22222222-2222-4222-8222-222222222222";
const PACKAGE_ID = "44444444-4444-4444-8444-444444444444";
const SHIFT_ID = "33333333-3333-4333-8333-333333333333";
const CONTRACT_TYPE_ID = "11111111-1111-4111-8111-111111111111";

test("hr employee wizard schema: contract type requires start date", () => {
  assert.throws(() =>
    hrEmployeeWizardSchema.parse({
      contractTypeVersionId: CONTRACT_TYPE_ID,
      departmentId: DEPT_ID,
      effectiveFrom: "2026-07-01",
      employeeNumber: "EMP-001",
      employmentType: "full-time",
      fullName: "Ahmed Ali",
    }),
  );
});

test("hr employee wizard schema: partial bank details are rejected", () => {
  assert.throws(() =>
    hrEmployeeWizardSchema.parse({
      bankName: "Bank",
      departmentId: DEPT_ID,
      effectiveFrom: "2026-07-01",
      employeeNumber: "EMP-001",
      employmentType: "full-time",
      fullName: "Ahmed Ali",
    }),
  );
});

test("hr employee wizard schema: shift without working-week flag requires day", () => {
  assert.throws(() =>
    hrEmployeeWizardSchema.parse({
      departmentId: DEPT_ID,
      effectiveFrom: "2026-07-01",
      employeeNumber: "EMP-001",
      employmentType: "full-time",
      fullName: "Ahmed Ali",
      shiftApplyWorkingDays: false,
      shiftId: SHIFT_ID,
    }),
  );
});

test("hr employee wizard schema: maps salary package version alias", () => {
  const parsed = hrEmployeeWizardSchema.parse({
    departmentId: DEPT_ID,
    effectiveFrom: "2026-07-01",
    employeeNumber: "EMP-001",
    employmentType: "full-time",
    fullName: "Ahmed Ali",
    salaryPackageRef: PACKAGE_ID,
  });
  assert.equal(parsed.salaryPackageVersionId, PACKAGE_ID);
});

test("hr shift runtime: default working week is Sun-Thu", () => {
  assert.deepEqual(DEFAULT_WORKING_WEEK_DAYS, [0, 1, 2, 3, 4]);
});

test("hr onboarding checklist seeds 14 foundation items", () => {
  assert.equal(HR_ONBOARDING_CHECKLIST_ITEMS.length, 14);
});
