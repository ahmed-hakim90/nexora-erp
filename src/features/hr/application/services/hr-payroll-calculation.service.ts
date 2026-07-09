import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrCompensationCategoryKey } from "../../compensation-foundation";
import {
  isPayrollLiveFallbackAllowed,
  PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
} from "../constants/hr-payroll-runtime.constants";
import { calculateEgyptPayrollBreakdown, HR_EGYPT_PAYROLL_RATES } from "./hr-payroll-egypt.service";
import { HrEmployeeCompensationService } from "./hr-employee-compensation.service";
import { HR_BASIC_SALARY_CONFLICT_MESSAGE, HR_MISSING_COMPENSATION_MESSAGE } from "./hr-employee-compensation-resolve";
import { HrLateEarlyPayrollInputService } from "./hr-late-early-runtime.service";
import { HrLeavePayrollInputService } from "./hr-leave-runtime.service";
import { HrOvertimePayrollInputService } from "./hr-overtime-runtime.service";

const MONTHLY_WORKING_DAYS = 30;
const DAILY_WORKING_HOURS = 8;
const OVERTIME_MULTIPLIER = 1.25;

export type PayrollCalculationLine = Readonly<{
  amount: number;
  categoryKey?: HrCompensationCategoryKey | string;
  componentCode: string;
  componentName: string;
  componentType: "earning" | "deduction" | "employer_contribution" | "benefit" | "informational";
  compensationComponentVersionId?: string | null;
  displayOrder: number;
  quantity?: number | null;
  rate?: number | null;
  source:
    | "contract"
    | "assignment"
    | "attendance"
    | "leave"
    | "overtime"
    | "penalty"
    | "loan"
    | "manual_adjustment"
    | "payroll_policy";
}>;

export type PayrollEmployeeCalculation = Readonly<{
  attendanceSummary: Record<string, unknown>;
  basicSalary: number;
  components: readonly PayrollCalculationLine[];
  currency: string;
  egyptBreakdown: ReturnType<typeof calculateEgyptPayrollBreakdown>;
  employeeId: string;
  employmentProfileId: string;
  grossEarnings: number;
  leaveSummary: Record<string, unknown>;
  loanAdvanceSummary: Record<string, unknown>;
  netPay: number;
  overtimeSummary: Record<string, unknown>;
  penaltiesSummary: Record<string, unknown>;
  salaryComponents: readonly Record<string, unknown>[];
  totalDeductions: number;
  totalEmployerContributions: number;
}>;

type PayrollPeriodContext = Readonly<{
  endDate: string;
  payrollPeriodId: string;
  startDate: string;
}>;

type SalaryPackageLine = Readonly<{
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function readCategoryKey(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "allowance";
  const row = value as { category_key?: string };
  return String(row.category_key ?? "allowance");
}

export class HrPayrollCalculationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadPeriodContext(payrollPeriodId: string): Promise<PayrollPeriodContext> {
    const { data, error } = await this.supabase
      .from("hr_payroll_periods")
      .select("id, start_date, end_date")
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Payroll period not found." });
    }
    return {
      endDate: String(data.end_date),
      payrollPeriodId: String(data.id),
      startDate: String(data.start_date),
    };
  }

  private async loadSalaryPackageLines(salaryPackageRef: string | null): Promise<readonly SalaryPackageLine[]> {
    if (!salaryPackageRef) return [];

    const { data: lines, error } = await this.supabase
      .from("hr_salary_package_lines")
      .select(
        "amount_override, component_version_id, display_order, hr_compensation_component_versions!inner(id, earning_or_deduction, taxable, insurable, included_in_gross_salary, hr_compensation_components!inner(code, name, hr_compensation_categories!inner(category_key)))",
      )
      .eq("salary_package_version_id", salaryPackageRef)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load salary package lines.", cause: error });
    }

    return (lines ?? []).map((line) => {
      const version = line.hr_compensation_component_versions as unknown as {
        earning_or_deduction: "earning" | "deduction";
        hr_compensation_components: {
          code: string;
          name: string;
          hr_compensation_categories: { category_key: string };
        };
        id: string;
        included_in_gross_salary: boolean;
        insurable: boolean;
        taxable: boolean;
      };
      const component = version.hr_compensation_components;
      return {
        amount: Number(line.amount_override ?? 0),
        categoryKey: readCategoryKey(component.hr_compensation_categories),
        code: String(component.code),
        componentVersionId: String(version.id),
        earningOrDeduction: version.earning_or_deduction,
        includedInGrossSalary: Boolean(version.included_in_gross_salary),
        insurable: Boolean(version.insurable),
        name: String(component.name),
        source: "package",
        taxable: Boolean(version.taxable),
      };
    });
  }

  private async loadAttendanceSnapshot(
    employeeId: string,
    period: PayrollPeriodContext,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.supabase
      .from("hr_attendance_payroll_snapshots")
      .select(
        "worked_days, worked_hours, late_minutes, early_leave_minutes, overtime_hours, leave_days, absence_days, paid_days, unpaid_days, deduction_minutes, payload",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("period_start", period.startDate)
      .eq("period_end", period.endDate)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      absenceDays: Number(data.absence_days ?? 0),
      deductionMinutes: Number(data.deduction_minutes ?? 0),
      earlyLeaveMinutes: Number(data.early_leave_minutes ?? 0),
      lateMinutes: Number(data.late_minutes ?? 0),
      leaveDays: Number(data.leave_days ?? 0),
      overtimeHours: Number(data.overtime_hours ?? 0),
      paidDays: Number(data.paid_days ?? 0),
      payload: data.payload ?? {},
      unpaidDays: Number(data.unpaid_days ?? 0),
      workedDays: Number(data.worked_days ?? 0),
      workedHours: Number(data.worked_hours ?? 0),
    };
  }

  private async resolveAttendanceInputsForPayroll(
    employeeId: string,
    period: PayrollPeriodContext,
  ): Promise<Record<string, unknown>> {
    const snapshot = await this.loadAttendanceSnapshot(employeeId, period);
    if (snapshot) return snapshot;

    if (isPayrollLiveFallbackAllowed()) {
      return this.loadLiveAttendanceInputs(employeeId, period);
    }

    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
    });
  }

  private async loadLiveAttendanceInputs(employeeId: string, period: PayrollPeriodContext) {
    const leaveService = new HrLeavePayrollInputService(this.supabase, this.context);
    const overtimeService = new HrOvertimePayrollInputService(this.supabase, this.context);
    const lateEarlyService = new HrLateEarlyPayrollInputService(this.supabase, this.context);

    const [leave, overtime, lateEarly] = await Promise.all([
      leaveService.getEmployeePayrollInputs(employeeId, period.startDate, period.endDate),
      overtimeService.getEmployeePayrollInputs(employeeId, period.startDate, period.endDate),
      lateEarlyService.getEmployeePayrollInputs(employeeId, period.startDate, period.endDate),
    ]);

    return {
      absenceDays: 0,
      deductionMinutes: lateEarly.approvedDeductionMinutes,
      earlyLeaveMinutes: lateEarly.earlyLeaveMinutes,
      lateMinutes: lateEarly.lateMinutes,
      leaveDays: leave.leaveDays,
      overtimeHours: overtime.payrollEligibleHours,
      paidDays: leave.paidLeaveDays,
      payload: { source: "live_inputs" },
      unpaidDays: leave.unpaidLeaveDays,
      workedDays: 0,
      workedHours: 0,
    };
  }

  private async loadPayrollInputAmounts(employeeId: string, payrollPeriodId: string) {
    const { data } = await this.supabase
      .from("hr_payroll_inputs")
      .select("input_kind, amount, source, status, approval_status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("payroll_period_id", payrollPeriodId)
      .in("status", ["approved", "locked", "submitted"])
      .is("deleted_at", null);

    let overtimeAmount = 0;
    let bonusAmount = 0;
    let penaltyAmount = 0;
    let allowanceAmount = 0;
    let deductionAmount = 0;

    for (const row of data ?? []) {
      const amount = Number(row.amount ?? 0);
      if (amount === 0) continue;
      switch (String(row.input_kind)) {
        case "overtime":
          overtimeAmount += amount;
          break;
        case "bonus":
        case "commission":
        case "incentive":
          bonusAmount += amount;
          break;
        case "penalty_summary":
        case "deduction_adjustment":
          penaltyAmount += amount;
          break;
        case "allowance_adjustment":
          allowanceAmount += amount;
          break;
        case "manual_adjustment":
          if (amount >= 0) allowanceAmount += amount;
          else deductionAmount += Math.abs(amount);
          break;
        default:
          break;
      }
    }

    return { allowanceAmount, bonusAmount, deductionAmount, overtimeAmount, penaltyAmount };
  }

  private async loadFinancialItems(employeeId: string, period: PayrollPeriodContext) {
    const [advances, loans, bonuses, incentives, penalties] = await Promise.all([
      this.supabase
        .from("hr_employee_advances")
        .select("monthly_deduction, document_number")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .in("status", ["disbursed", "partially_settled"])
        .is("deleted_at", null),
      this.supabase
        .from("hr_employee_loans")
        .select("monthly_installment, document_number")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null),
      this.supabase
        .from("hr_employee_bonuses")
        .select("amount, document_number, bonus_type")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .gte("effective_date", period.startDate)
        .lte("effective_date", period.endDate)
        .is("deleted_at", null),
      this.supabase
        .from("hr_employee_incentives")
        .select("amount, document_number, incentive_type")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .gte("effective_date", period.startDate)
        .lte("effective_date", period.endDate)
        .is("deleted_at", null),
      this.supabase
        .from("hr_employee_penalties")
        .select("amount, document_number, penalty_type")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .in("status", ["issued", "acknowledged"])
        .gte("effective_date", period.startDate)
        .lte("effective_date", period.endDate)
        .is("deleted_at", null),
    ]);

    return {
      advances: advances.data ?? [],
      bonuses: bonuses.data ?? [],
      incentives: incentives.data ?? [],
      loans: loans.data ?? [],
      penalties: penalties.data ?? [],
    };
  }

  async calculateEmployeePayroll(input: {
    employeeId: string;
    employmentProfileId: string;
    payrollPeriodId: string;
    salaryPackageRef: string | null;
  }): Promise<PayrollEmployeeCalculation> {
    const period = await this.loadPeriodContext(input.payrollPeriodId);
    const compensationService = new HrEmployeeCompensationService(this.supabase, this.context);
    const compensation = await compensationService.resolveEmployeeCompensation({
      asOfDate: period.endDate,
      employeeId: input.employeeId,
      employmentProfileId: input.employmentProfileId,
      salaryPackageRef: input.salaryPackageRef,
    });

    if (compensation.conflict) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: compensation.conflictMessage ?? HR_BASIC_SALARY_CONFLICT_MESSAGE,
      });
    }
    if (compensation.missingCompensation) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: HR_MISSING_COMPENSATION_MESSAGE,
      });
    }

    const packageLines: SalaryPackageLine[] = compensation.lines.map((line) => ({
      amount: line.amount,
      categoryKey: line.categoryKey,
      code: line.code,
      componentVersionId: line.componentVersionId,
      earningOrDeduction: line.earningOrDeduction,
      includedInGrossSalary: line.includedInGrossSalary,
      insurable: line.insurable,
      name: line.name,
      source: line.source,
      taxable: line.taxable,
    }));

    const snapshot = await this.resolveAttendanceInputsForPayroll(input.employeeId, period);
    const payrollInputs = await this.loadPayrollInputAmounts(input.employeeId, input.payrollPeriodId);
    const financial = await this.loadFinancialItems(input.employeeId, period);

    const components: PayrollCalculationLine[] = [];
    let displayOrder = 10;
    let basicSalary = 0;
    let grossEarnings = 0;

    for (const line of packageLines) {
      if (line.amount === 0) continue;
      const componentType = line.earningOrDeduction === "earning" ? "earning" : "deduction";
      components.push({
        amount: round2(line.amount),
        categoryKey: line.categoryKey,
        componentCode: line.code,
        componentName: line.name,
        componentType,
        compensationComponentVersionId: line.componentVersionId,
        displayOrder,
        source: line.source === "profile" ? "assignment" : "contract",
      });
      displayOrder += 10;
      if (line.categoryKey === "basic_salary" && line.earningOrDeduction === "earning") {
        basicSalary += line.amount;
      }
      if (line.earningOrDeduction === "earning" && line.includedInGrossSalary) {
        grossEarnings += line.amount;
      } else if (line.earningOrDeduction === "deduction") {
        grossEarnings -= line.amount;
      }
    }

    if (basicSalary === 0) {
      basicSalary = packageLines
        .filter((line) => line.earningOrDeduction === "earning")
        .reduce((sum, line) => sum + line.amount, 0);
      if (grossEarnings === 0) grossEarnings = basicSalary;
    }

    const dailyRate = basicSalary / MONTHLY_WORKING_DAYS;
    const hourlyRate = dailyRate / DAILY_WORKING_HOURS;
    const minuteRate = hourlyRate / 60;

    const overtimeHours = Number(snapshot.overtimeHours ?? 0);
    const overtimePay = round2(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER + payrollInputs.overtimeAmount);
    if (overtimePay > 0) {
      components.push({
        amount: overtimePay,
        categoryKey: "overtime",
        componentCode: "OT-PAY",
        componentName: "Overtime Pay",
        componentType: "earning",
        displayOrder,
        quantity: overtimeHours,
        rate: round2(hourlyRate * OVERTIME_MULTIPLIER),
        source: "overtime",
      });
      displayOrder += 10;
      grossEarnings += overtimePay;
    }

    const bonusTotal =
      financial.bonuses.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
      + financial.incentives.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
      + payrollInputs.bonusAmount;
    if (bonusTotal > 0) {
      components.push({
        amount: round2(bonusTotal),
        categoryKey: "bonus",
        componentCode: "BONUS",
        componentName: "Bonuses & Incentives",
        componentType: "earning",
        displayOrder,
        source: "manual_adjustment",
      });
      displayOrder += 10;
      grossEarnings += bonusTotal;
    }

    if (payrollInputs.allowanceAmount > 0) {
      components.push({
        amount: round2(payrollInputs.allowanceAmount),
        categoryKey: "allowance",
        componentCode: "ALLOW-ADJ",
        componentName: "Allowance Adjustment",
        componentType: "earning",
        displayOrder,
        source: "manual_adjustment",
      });
      displayOrder += 10;
      grossEarnings += payrollInputs.allowanceAmount;
    }

    const unpaidLeaveDays = Number(snapshot.unpaidDays ?? 0);
    const unpaidLeaveDeduction = round2(unpaidLeaveDays * dailyRate);
    if (unpaidLeaveDeduction > 0) {
      components.push({
        amount: unpaidLeaveDeduction,
        categoryKey: "deduction",
        componentCode: "UNPAID-LEAVE",
        componentName: "Unpaid Leave Deduction",
        componentType: "deduction",
        displayOrder,
        quantity: unpaidLeaveDays,
        rate: round2(dailyRate),
        source: "leave",
      });
      displayOrder += 10;
    }

    const deductionMinutes = Number(snapshot.deductionMinutes ?? 0);
    const lateDeduction = round2(deductionMinutes * minuteRate);
    if (lateDeduction > 0) {
      components.push({
        amount: lateDeduction,
        categoryKey: "penalty",
        componentCode: "LATE-DED",
        componentName: "Late / Early Deduction",
        componentType: "deduction",
        displayOrder,
        quantity: deductionMinutes,
        rate: round2(minuteRate),
        source: "attendance",
      });
      displayOrder += 10;
    }

    const penaltyTotal =
      financial.penalties.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
      + payrollInputs.penaltyAmount
      + payrollInputs.deductionAmount;
    if (penaltyTotal > 0) {
      components.push({
        amount: round2(penaltyTotal),
        categoryKey: "penalty",
        componentCode: "PENALTY",
        componentName: "Penalties",
        componentType: "deduction",
        displayOrder,
        source: "penalty",
      });
      displayOrder += 10;
    }

    let loanAdvanceDeductions = 0;
    for (const advance of financial.advances) {
      const amount = Number(advance.monthly_deduction ?? 0);
      if (amount <= 0) continue;
      loanAdvanceDeductions += amount;
      components.push({
        amount: round2(amount),
        categoryKey: "advance",
        componentCode: "ADVANCE",
        componentName: `Advance ${String(advance.document_number ?? "")}`.trim(),
        componentType: "deduction",
        displayOrder,
        source: "loan",
      });
      displayOrder += 10;
    }

    for (const loan of financial.loans) {
      const amount = Number(loan.monthly_installment ?? 0);
      if (amount <= 0) continue;
      loanAdvanceDeductions += amount;
      components.push({
        amount: round2(amount),
        categoryKey: "loan",
        componentCode: "LOAN",
        componentName: `Loan ${String(loan.document_number ?? "")}`.trim(),
        componentType: "deduction",
        displayOrder,
        source: "loan",
      });
      displayOrder += 10;
    }

    const preStatutoryDeductions = unpaidLeaveDeduction + lateDeduction + penaltyTotal + loanAdvanceDeductions;
    const egyptBreakdown = calculateEgyptPayrollBreakdown(grossEarnings, preStatutoryDeductions, basicSalary);

    components.push({
      amount: egyptBreakdown.employeeSocialInsurance,
      categoryKey: "insurance",
      componentCode: "EG-SI-EE",
      componentName: "Social Insurance (Employee)",
      componentType: "deduction",
      displayOrder,
      source: "payroll_policy",
    });
    displayOrder += 10;

    components.push({
      amount: egyptBreakdown.incomeTax,
      categoryKey: "tax",
      componentCode: "EG-TAX",
      componentName: "Income Tax",
      componentType: "deduction",
      displayOrder,
      source: "payroll_policy",
    });
    displayOrder += 10;

    components.push({
      amount: egyptBreakdown.employerSocialInsurance,
      categoryKey: "employer_contribution",
      componentCode: "EG-SI-ER",
      componentName: "Social Insurance (Employer)",
      componentType: "employer_contribution",
      displayOrder,
      source: "payroll_policy",
    });

    const salaryComponents = packageLines.map((line) => ({
      amount: line.amount,
      categoryKey: line.categoryKey,
      code: line.code,
      componentVersionId: line.componentVersionId,
      name: line.name,
    }));

    return {
      attendanceSummary: snapshot,
      basicSalary: round2(basicSalary),
      components,
      currency: HR_EGYPT_PAYROLL_RATES.currency,
      egyptBreakdown,
      employeeId: input.employeeId,
      employmentProfileId: input.employmentProfileId,
      grossEarnings: egyptBreakdown.grossEarnings,
      leaveSummary: {
        leaveDays: Number(snapshot.leaveDays ?? 0),
        paidDays: Number(snapshot.paidDays ?? 0),
        unpaidDays: unpaidLeaveDays,
        unpaidLeaveDeduction,
      },
      loanAdvanceSummary: {
        advanceCount: financial.advances.length,
        loanCount: financial.loans.length,
        totalDeductions: round2(loanAdvanceDeductions),
      },
      netPay: egyptBreakdown.netPay,
      overtimeSummary: {
        hourlyRate: round2(hourlyRate),
        overtimeHours,
        overtimePay,
      },
      penaltiesSummary: {
        lateDeduction,
        penaltyTotal: round2(penaltyTotal),
      },
      salaryComponents,
      totalDeductions: egyptBreakdown.totalDeductions,
      totalEmployerContributions: egyptBreakdown.employerSocialInsurance,
    };
  }
}
