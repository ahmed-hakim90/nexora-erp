import assert from "node:assert/strict";
import test from "node:test";

import {
  HR_BASIC_SALARY_CONFLICT_MESSAGE,
  resolveEmployeeCompensation,
  type HrResolvedCompensationPackageLine,
} from "@/features/hr/application/services/hr-employee-compensation-resolve";

const basicComponent = {
  amount: 6500,
  componentCode: "BASIC",
  componentName: "Basic Salary",
  componentVersionId: "basic-version-1",
  earningOrDeduction: "earning" as const,
  includedInGrossSalary: true,
  insurable: true,
  taxable: true,
};

function packageLine(
  overrides: Partial<HrResolvedCompensationPackageLine> & Pick<HrResolvedCompensationPackageLine, "amount" | "categoryKey" | "code" | "name">,
): HrResolvedCompensationPackageLine {
  return {
    componentVersionId: "component-version-1",
    earningOrDeduction: "earning",
    includedInGrossSalary: true,
    insurable: false,
    source: "package",
    taxable: true,
    ...overrides,
  };
}

test("resolveEmployeeCompensation uses profile override with package allowances", () => {
  const result = resolveEmployeeCompensation({
    basicOverride: basicComponent,
    packageLines: [
      packageLine({ amount: 400, categoryKey: "allowance", code: "TRANSPORT", name: "Transport" }),
      packageLine({ amount: 800, categoryKey: "allowance", code: "HOUSING", name: "Housing" }),
    ],
  });

  assert.equal(result.conflict, false);
  assert.equal(result.basicSalarySource, "profile");
  assert.equal(result.basicSalaryAmount, 6500);
  assert.equal(result.packageAllowanceTotal, 1200);
  assert.equal(result.resolvedMonthlyTotal, 7700);
  assert.equal(result.hourlyRate, 27.08);
  assert.equal(result.lines.some((line) => line.categoryKey === "basic_salary" && line.source === "profile"), true);
  assert.equal(result.lines.filter((line) => line.categoryKey === "basic_salary").length, 1);
});

test("resolveEmployeeCompensation falls back to package basic salary", () => {
  const result = resolveEmployeeCompensation({
    basicOverride: null,
    packageLines: [
      packageLine({ amount: 5000, categoryKey: "basic_salary", code: "BASIC", name: "Basic Salary" }),
      packageLine({ amount: 500, categoryKey: "allowance", code: "TRANSPORT", name: "Transport" }),
    ],
  });

  assert.equal(result.conflict, false);
  assert.equal(result.basicSalarySource, "package");
  assert.equal(result.basicSalaryAmount, 5000);
  assert.equal(result.resolvedMonthlyTotal, 5500);
});

test("resolveEmployeeCompensation blocks profile and package basic conflict", () => {
  const result = resolveEmployeeCompensation({
    basicOverride: basicComponent,
    packageLines: [packageLine({ amount: 5000, categoryKey: "basic_salary", code: "BASIC", name: "Basic Salary" })],
  });

  assert.equal(result.conflict, true);
  assert.equal(result.conflictMessage, HR_BASIC_SALARY_CONFLICT_MESSAGE);
  assert.equal(result.basicSalarySource, null);
});

test("resolveEmployeeCompensation supports override only without package", () => {
  const result = resolveEmployeeCompensation({
    basicOverride: basicComponent,
    packageLines: [],
  });

  assert.equal(result.conflict, false);
  assert.equal(result.missingCompensation, false);
  assert.equal(result.basicSalaryAmount, 6500);
  assert.equal(result.resolvedMonthlyTotal, 6500);
});

test("resolveEmployeeCompensation marks missing compensation when no sources exist", () => {
  const result = resolveEmployeeCompensation({
    basicOverride: null,
    packageLines: [],
  });

  assert.equal(result.missingCompensation, true);
  assert.equal(result.basicSalaryAmount, null);
});

test("hr employee basic salary override schema accepts nullable clear payload", async () => {
  const { hrEmployeeBasicSalaryOverrideSchema } = await import("@/features/hr/application/schemas/hr-compensation.schema");
  const parsed = hrEmployeeBasicSalaryOverrideSchema.parse({
    basicSalary: "",
    employeeId: "11111111-1111-4111-8111-111111111111",
  });
  assert.equal(parsed.basicSalary, null);
});
