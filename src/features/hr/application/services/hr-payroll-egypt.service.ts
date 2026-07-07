import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

/** Egypt payroll statutory rates (simplified MVP pack for OP-25). */
export const HR_EGYPT_PAYROLL_RATES = {
  countryCode: "EG",
  currency: "EGP",
  /** Employee social insurance ~14% on insurable salary (capped). */
  employeeSocialInsuranceRate: 0.14,
  /** Employer social insurance ~18.75%. */
  employerSocialInsuranceRate: 0.1875,
  socialInsuranceSalaryCap: 12600,
  /** Annual tax exemption threshold (EGP). */
  annualTaxExemption: 15000,
  /** Progressive monthly tax brackets (simplified). */
  monthlyTaxBrackets: [
    { upTo: 15000, rate: 0 },
    { upTo: 30000, rate: 0.1 },
    { upTo: 45000, rate: 0.15 },
    { upTo: 60000, rate: 0.2 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.225 },
  ],
} as const;

export type HrEgyptPayrollBreakdown = Readonly<{
  basicSalary: number;
  grossEarnings: number;
  employeeSocialInsurance: number;
  employerSocialInsurance: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
}>;

export function calculateEgyptPayrollBreakdown(
  grossEarnings: number,
  additionalDeductions = 0,
  insurableSalary?: number,
): HrEgyptPayrollBreakdown {
  const insurableBase = Math.min(insurableSalary ?? grossEarnings, HR_EGYPT_PAYROLL_RATES.socialInsuranceSalaryCap);
  const employeeSocialInsurance = round2(insurableBase * HR_EGYPT_PAYROLL_RATES.employeeSocialInsuranceRate);
  const employerSocialInsurance = round2(insurableBase * HR_EGYPT_PAYROLL_RATES.employerSocialInsuranceRate);

  const taxableIncome = Math.max(0, grossEarnings - employeeSocialInsurance);
  const incomeTax = round2(calculateEgyptMonthlyTax(taxableIncome));

  const totalDeductions = round2(employeeSocialInsurance + incomeTax + additionalDeductions);
  const netPay = round2(Math.max(0, grossEarnings - totalDeductions));

  return {
    basicSalary: round2(insurableSalary ?? grossEarnings),
    currency: HR_EGYPT_PAYROLL_RATES.currency,
    employeeSocialInsurance,
    employerSocialInsurance,
    grossEarnings: round2(grossEarnings),
    incomeTax,
    netPay,
    totalDeductions,
  };
}

export type HrEgyptEndOfServiceBreakdown = Readonly<{
  currency: string;
  endOfServiceAmount: number;
  yearsOfService: number;
}>;

/** Simplified Egypt EOS: 1 month salary per year for first 5 years, 1.5 months thereafter. */
export function calculateEgyptEndOfService(basicSalary: number, yearsOfService: number): HrEgyptEndOfServiceBreakdown {
  const cappedYears = Math.max(0, yearsOfService);
  const firstBandYears = Math.min(cappedYears, 5);
  const remainingYears = Math.max(0, cappedYears - 5);
  const endOfServiceAmount = round2(basicSalary * firstBandYears + basicSalary * 1.5 * remainingYears);
  return {
    currency: HR_EGYPT_PAYROLL_RATES.currency,
    endOfServiceAmount,
    yearsOfService: cappedYears,
  };
}

export type WpsBankFileRow = Readonly<{
  accountNumber: string;
  amount: number;
  bankCode: string;
  currency: string;
  employeeName: string;
  employeeNumber: string;
  reference: string;
}>;

export function generateWpsBankFileContent(rows: readonly WpsBankFileRow[]): string {
  const header = "EmployeeNumber|EmployeeName|BankCode|AccountNumber|Amount|Currency|Reference";
  const lines = rows.map((row) =>
    [
      row.employeeNumber,
      row.employeeName,
      row.bankCode,
      row.accountNumber,
      row.amount.toFixed(2),
      row.currency,
      row.reference,
    ].join("|"),
  );
  return [header, ...lines].join("\n");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateEgyptMonthlyTax(taxableMonthly: number): number {
  let remaining = taxableMonthly;
  let tax = 0;
  let previousCap = 0;
  for (const bracket of HR_EGYPT_PAYROLL_RATES.monthlyTaxBrackets) {
    const band = Math.min(remaining, bracket.upTo - previousCap);
    if (band <= 0) break;
    tax += band * bracket.rate;
    remaining -= band;
    previousCap = bracket.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

export class HrPayrollEgyptService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async ensureEgyptLocalizationPack(): Promise<{ packId: string }> {
    const { data: existing } = await this.supabase
      .from("hr_payroll_localization_packs")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("pack_code", "EG-V1")
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) return { packId: String(existing.id) };

    const { data, error } = await this.supabase
      .from("hr_payroll_localization_packs")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        country_code: HR_EGYPT_PAYROLL_RATES.countryCode,
        created_by: this.context.userId,
        metadata: {
          country_calculations_implemented: true,
          employee_social_insurance_rate: HR_EGYPT_PAYROLL_RATES.employeeSocialInsuranceRate,
          employer_social_insurance_rate: HR_EGYPT_PAYROLL_RATES.employerSocialInsuranceRate,
          statutory_runtime_implemented: true,
        },
        pack_code: "EG-V1",
        pack_name: "Egypt Payroll Pack v1",
        pack_version: "1.0.0",
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed Egypt payroll pack.", cause: error });
    return { packId: String(data.id) };
  }
}
