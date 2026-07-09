import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import { generateWpsBankFileContent, type WpsBankFileRow } from "./hr-payroll-egypt.service";

export class HrPayrollWpsService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async generateWpsBankFile(payrollRunId: string): Promise<{ content: string; rowCount: number }> {
    const { data: run, error: runError } = await this.supabase
      .from("hr_payroll_runs")
      .select("id, status, payroll_period_id")
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (runError || !run) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Payroll run not found." });
    }
    if (!["approved", "paid", "completed"].includes(String(run.status))) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "WPS file can only be generated for approved or paid payroll runs.",
      });
    }

    const { data: results, error: resultsError } = await this.supabase
      .from("hr_payroll_results")
      .select("employee_id, net_pay, currency")
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (resultsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load payroll results.", cause: resultsError });
    }

    const rows: WpsBankFileRow[] = [];
    for (const result of results ?? []) {
      const employeeId = String(result.employee_id);
      const [{ data: employee }, { data: bankAccount }] = await Promise.all([
        this.supabase
          .from("hr_employees")
          .select("full_name, employee_number")
          .eq("id", employeeId)
          .eq("tenant_id", this.context.tenantId)
          .maybeSingle(),
        this.supabase
          .from("hr_employee_bank_accounts")
          .select("account_number, bank_name, metadata, is_primary")
          .eq("employee_id", employeeId)
          .eq("tenant_id", this.context.tenantId)
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!employee || !bankAccount?.account_number) continue;

      const metadata =
        bankAccount.metadata && typeof bankAccount.metadata === "object" && !Array.isArray(bankAccount.metadata)
          ? (bankAccount.metadata as Record<string, unknown>)
          : {};
      const bankCode = String(metadata.bank_code ?? bankAccount.bank_name ?? "EG");

      rows.push({
        accountNumber: String(bankAccount.account_number),
        amount: Number(result.net_pay ?? 0),
        bankCode,
        currency: String(result.currency ?? "EGP"),
        employeeName: String(employee.full_name),
        employeeNumber: String(employee.employee_number),
        reference: `PAYROLL-${payrollRunId.slice(0, 8)}`,
      });
    }

    return {
      content: generateWpsBankFileContent(rows),
      rowCount: rows.length,
    };
  }
}
