export const HR_EMPLOYEE_COMPENSATION_MONTHLY_WORKING_DAYS = 30;
export const HR_EMPLOYEE_COMPENSATION_DAILY_WORKING_HOURS = 8;

export const HR_BASIC_SALARY_CONFLICT_MESSAGE =
  "Basic salary is defined in both the employee profile and the salary package. Remove one source before continuing.";

export const HR_MISSING_COMPENSATION_MESSAGE =
  "No compensation source found. Assign a salary package or set basic salary on the employee profile.";

export type HrResolvedCompensationPackageLine = Readonly<{
  amount: number;
  categoryKey: string;
  code: string;
  componentVersionId: string;
  earningOrDeduction: "earning" | "deduction";
  includedInGrossSalary: boolean;
  insurable: boolean;
  name: string;
  source: "package" | "profile";
  taxable: boolean;
}>;

export type HrEmployeeCompensationResolution = Readonly<{
  allowanceTotal: number;
  basicSalaryAmount: number | null;
  basicSalaryFromPackage: number | null;
  basicSalaryOverride: number | null;
  basicSalarySource: "profile" | "package" | null;
  conflict: boolean;
  conflictMessage: string | null;
  hourlyRate: number | null;
  lines: readonly HrResolvedCompensationPackageLine[];
  missingCompensation: boolean;
  packageAllowanceTotal: number;
  resolvedMonthlyTotal: number;
}>;

export type HrEmployeeCompensationResolveInput = Readonly<{
  basicOverride: Readonly<{
    amount: number;
    componentVersionId: string;
    componentCode: string;
    componentName: string;
    earningOrDeduction: "earning" | "deduction";
    includedInGrossSalary: boolean;
    insurable: boolean;
    taxable: boolean;
  }> | null;
  packageLines: readonly HrResolvedCompensationPackageLine[];
}>;

function isBasicSalaryLine(line: Pick<HrResolvedCompensationPackageLine, "categoryKey" | "earningOrDeduction">): boolean {
  return line.categoryKey === "basic_salary" && line.earningOrDeduction === "earning";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeHourlyRate(basicSalary: number | null): number | null {
  if (basicSalary === null || basicSalary <= 0) return null;
  return round2(basicSalary / HR_EMPLOYEE_COMPENSATION_MONTHLY_WORKING_DAYS / HR_EMPLOYEE_COMPENSATION_DAILY_WORKING_HOURS);
}

export function resolveEmployeeCompensation(input: HrEmployeeCompensationResolveInput): HrEmployeeCompensationResolution {
  const packageBasicLines = input.packageLines.filter(isBasicSalaryLine);
  const packageBasicAmount = packageBasicLines.reduce((sum, line) => sum + line.amount, 0);
  const packageBasicAmountOrNull = packageBasicAmount > 0 ? packageBasicAmount : null;
  const hasOverride = input.basicOverride !== null && input.basicOverride.amount > 0;
  const nonBasicPackageLines = input.packageLines.filter((line) => !isBasicSalaryLine(line));

  if (hasOverride && packageBasicAmountOrNull !== null) {
    return {
      allowanceTotal: nonBasicPackageLines
        .filter((line) => line.earningOrDeduction === "earning" && line.includedInGrossSalary)
        .reduce((sum, line) => sum + line.amount, 0),
      basicSalaryAmount: null,
      basicSalaryFromPackage: packageBasicAmountOrNull,
      basicSalaryOverride: input.basicOverride?.amount ?? null,
      basicSalarySource: null,
      conflict: true,
      conflictMessage: HR_BASIC_SALARY_CONFLICT_MESSAGE,
      hourlyRate: null,
      lines: input.packageLines,
      missingCompensation: false,
      packageAllowanceTotal: nonBasicPackageLines
        .filter((line) => line.earningOrDeduction === "earning")
        .reduce((sum, line) => sum + line.amount, 0),
      resolvedMonthlyTotal: 0,
    };
  }

  const resolvedLines: HrResolvedCompensationPackageLine[] = [...nonBasicPackageLines];

  let basicSalarySource: "profile" | "package" | null = null;
  let basicSalaryAmount: number | null = null;

  if (hasOverride && input.basicOverride) {
    basicSalarySource = "profile";
    basicSalaryAmount = input.basicOverride.amount;
    resolvedLines.unshift({
      amount: input.basicOverride.amount,
      categoryKey: "basic_salary",
      code: input.basicOverride.componentCode,
      componentVersionId: input.basicOverride.componentVersionId,
      earningOrDeduction: input.basicOverride.earningOrDeduction,
      includedInGrossSalary: input.basicOverride.includedInGrossSalary,
      insurable: input.basicOverride.insurable,
      name: input.basicOverride.componentName,
      source: "profile",
      taxable: input.basicOverride.taxable,
    });
  } else if (packageBasicAmountOrNull !== null) {
    basicSalarySource = "package";
    basicSalaryAmount = packageBasicAmountOrNull;
    resolvedLines.unshift(...packageBasicLines.map((line) => ({ ...line, source: "package" as const })));
  } else if (input.packageLines.length > 0) {
    const fallbackBasic = input.packageLines
      .filter((line) => line.earningOrDeduction === "earning")
      .reduce((sum, line) => sum + line.amount, 0);
    if (fallbackBasic > 0) {
      basicSalaryAmount = fallbackBasic;
      basicSalarySource = "package";
    }
  }

  const allowanceTotal = resolvedLines
    .filter((line) => line.earningOrDeduction === "earning" && line.includedInGrossSalary && !isBasicSalaryLine(line))
    .reduce((sum, line) => sum + line.amount, 0);

  const packageAllowanceTotal = nonBasicPackageLines
    .filter((line) => line.earningOrDeduction === "earning")
    .reduce((sum, line) => sum + line.amount, 0);

  const resolvedMonthlyTotal = resolvedLines
    .filter((line) => line.earningOrDeduction === "earning")
    .reduce((sum, line) => sum + line.amount, 0);

  const missingCompensation = basicSalaryAmount === null && input.packageLines.length === 0;

  return {
    allowanceTotal: round2(allowanceTotal),
    basicSalaryAmount: basicSalaryAmount === null ? null : round2(basicSalaryAmount),
    basicSalaryFromPackage: packageBasicAmountOrNull === null ? null : round2(packageBasicAmountOrNull),
    basicSalaryOverride: hasOverride ? round2(input.basicOverride?.amount ?? 0) : null,
    basicSalarySource,
    conflict: false,
    conflictMessage: null,
    hourlyRate: computeHourlyRate(basicSalaryAmount),
    lines: resolvedLines,
    missingCompensation,
    packageAllowanceTotal: round2(packageAllowanceTotal),
    resolvedMonthlyTotal: round2(resolvedMonthlyTotal),
  };
}
