import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import {
  payrollRunAllowsApproval,
  payrollRunAllowsCalculation,
  payrollRunAllowsPublish,
} from "../../payroll-calculation-foundation";
import type {
  HrPayrollCalendarCreateInput,
  HrPayrollCalendarUpdateInput,
  HrPayrollGroupCreateInput,
  HrPayrollGroupUpdateInput,
  HrPayrollPeriodCreateInput,
  HrPayrollPeriodUpdateInput,
} from "../schemas/hr-payroll-setup.schema";
import { HrPayrollCalculationService } from "./hr-payroll-calculation.service";
import { HrPayrollPeriodLifecycleService } from "./hr-payroll-period-lifecycle.service";

type ScopedPayrollRun = Readonly<{
  id: string;
  payroll_batch_id: string | null;
  payroll_group_id: string;
  payroll_period_id: string;
  status: string;
}>;

export class HrPayrollService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  private async loadScopedPayrollRun(payrollRunId: string): Promise<ScopedPayrollRun> {
    const { data, error } = await this.supabase
      .from("hr_payroll_runs")
      .select("id, payroll_batch_id, payroll_group_id, payroll_period_id, status")
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load payroll run.", cause: error });
    }
    if (!data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Payroll run not found." });
    }

    return {
      id: String(data.id),
      payroll_batch_id: data.payroll_batch_id ? String(data.payroll_batch_id) : null,
      payroll_group_id: String(data.payroll_group_id),
      payroll_period_id: String(data.payroll_period_id),
      status: String(data.status),
    };
  }

  private async clearPayrollRunCalculation(payrollRunId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const deletedBy = this.context.userId;

    const { data: existingResults } = await this.supabase
      .from("hr_payroll_results")
      .select("id")
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);

    const resultIds = (existingResults ?? []).map((row) => String(row.id));
    if (resultIds.length > 0) {
      const { error: componentsError } = await this.supabase
        .from("hr_payroll_result_components")
        .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
        .in("payroll_result_id", resultIds)
        .eq("tenant_id", this.context.tenantId)
        .is("deleted_at", null);
      if (componentsError) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reset payroll result components.", cause: componentsError });
      }
    }

    const { error: resultsError } = await this.supabase
      .from("hr_payroll_results")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (resultsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reset payroll results.", cause: resultsError });
    }

    const { error: snapshotsError } = await this.supabase
      .from("hr_payroll_employee_snapshots")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (snapshotsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reset payroll snapshots.", cause: snapshotsError });
    }
  }

  async createPayrollRun(input: { payrollPeriodId: string; payrollGroupId: string }) {
    const { data, error } = await this.supabase
      .from("hr_payroll_runs")
      .insert({
        company_id: this.context.companyId,
        created_by: this.context.userId,
        metadata: { payroll_calculation_implemented: true },
        payroll_group_id: input.payrollGroupId,
        payroll_period_id: input.payrollPeriodId,
        requested_by: this.context.userId,
        run_type: "regular",
        status: "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payroll run.", cause: error });
    return { id: String(data.id) };
  }

  async validatePayrollRun(payrollRunId: string): Promise<{ issueCount: number }> {
    const run = await this.loadScopedPayrollRun(payrollRunId);
    if (run.status === "paid" || run.status === "cancelled" || run.status === "failed") {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll run in status "${run.status}" cannot be validated.`,
      });
    }

    const { data: employees } = await this.supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    let issueCount = 0;
    for (const emp of employees ?? []) {
      const { data: profile } = await this.supabase
        .from("hr_employment_profiles")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();
      if (!profile) issueCount += 1;
    }

    await this.supabase
      .from("hr_payroll_runs")
      .update({ status: issueCount === 0 ? "ready" : "validating", updated_by: this.context.userId })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId);

    return { issueCount };
  }

  async calculatePayrollRun(payrollRunId: string): Promise<{ employeeCount: number }> {
    const run = await this.loadScopedPayrollRun(payrollRunId);
    if (!payrollRunAllowsCalculation(run.status)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll run must be ready before calculation (current status: ${run.status}).`,
      });
    }

    const periodLifecycle = new HrPayrollPeriodLifecycleService(this.supabase, this.context);
    const period = await periodLifecycle.assertPeriodAllowsPayrollMutation(run.payroll_period_id, "calculating payroll");
    await periodLifecycle.assertCompletedExportExists(period);

    if (run.status === "completed" || run.status === "processing") {
      await this.clearPayrollRunCalculation(payrollRunId);
    }

    await this.supabase
      .from("hr_payroll_runs")
      .update({ status: "processing", updated_by: this.context.userId })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId);

    const calculationService = new HrPayrollCalculationService(this.supabase, this.context);

    const { data: employees } = await this.supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    let count = 0;
    for (const emp of employees ?? []) {
      const employeeId = String(emp.id);
      const { data: profile } = await this.supabase
        .from("hr_employment_profiles")
        .select("id, salary_package_ref")
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();
      if (!profile) continue;

      const calculation = await calculationService.calculateEmployeePayroll({
        employeeId,
        employmentProfileId: String(profile.id),
        payrollPeriodId: run.payroll_period_id,
        salaryPackageRef: profile.salary_package_ref ? String(profile.salary_package_ref) : null,
      });

      const { data: snapshot } = await this.supabase
        .from("hr_payroll_employee_snapshots")
        .insert({
          attendance_summary: calculation.attendanceSummary,
          basic_salary: calculation.basicSalary,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          employee_id: employeeId,
          employment_profile_id: profile.id,
          leave_summary: calculation.leaveSummary,
          loan_advance_summary: calculation.loanAdvanceSummary,
          metadata: {
            egypt_localization: true,
            payroll_calculation_implemented: true,
            payroll_calculation_runtime: true,
          },
          overtime_summary: calculation.overtimeSummary,
          penalties_summary: calculation.penaltiesSummary,
          payroll_run_id: payrollRunId,
          salary_components: calculation.salaryComponents,
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        })
        .select("id")
        .single();
      if (!snapshot) continue;

      const { data: result } = await this.supabase
        .from("hr_payroll_results")
        .insert({
          company_id: this.context.companyId,
          created_by: this.context.userId,
          currency: calculation.currency,
          employee_id: employeeId,
          employee_snapshot_id: snapshot.id,
          gross_earnings: calculation.grossEarnings,
          metadata: {
            egypt_breakdown: calculation.egyptBreakdown,
            egypt_localization: true,
            payroll_calculation_runtime: true,
          },
          net_pay: calculation.netPay,
          payroll_run_id: payrollRunId,
          status: "completed",
          tenant_id: this.context.tenantId,
          total_deductions: calculation.totalDeductions,
          total_employer_contributions: calculation.totalEmployerContributions,
          updated_by: this.context.userId,
        })
        .select("id")
        .single();
      if (!result) continue;

      const resultId = String(result.id);
      for (const component of calculation.components) {
        await this.supabase.from("hr_payroll_result_components").insert({
          amount: component.amount,
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          component_code: component.componentCode,
          component_name: component.componentName,
          component_type: component.componentType,
          created_by: this.context.userId,
          currency: calculation.currency,
          display_order: component.displayOrder,
          metadata: {
            category_key: component.categoryKey ?? null,
            payroll_calculation_runtime: true,
          },
          payroll_result_id: resultId,
          quantity: component.quantity ?? null,
          rate: component.rate ?? null,
          source: component.source,
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        });
      }

      count += 1;
    }

    await this.supabase
      .from("hr_payroll_runs")
      .update({ status: "completed", updated_by: this.context.userId })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId);
    return { employeeCount: count };
  }

  async approvePayrollRun(payrollRunId: string) {
    const run = await this.loadScopedPayrollRun(payrollRunId);
    if (!payrollRunAllowsApproval(run.status)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll run must be completed before approval (current status: ${run.status}).`,
      });
    }

    const periodLifecycle = new HrPayrollPeriodLifecycleService(this.supabase, this.context);
    await periodLifecycle.assertPeriodAllowsPayrollMutation(run.payroll_period_id, "approving payroll");

    const { error } = await this.supabase
      .from("hr_payroll_runs")
      .update({ approved_at: new Date().toISOString(), approved_by: this.context.userId, status: "approved", updated_by: this.context.userId })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve payroll run.", cause: error });
  }

  async publishPayslips(payrollRunId: string): Promise<{ publishedCount: number }> {
    const run = await this.loadScopedPayrollRun(payrollRunId);
    if (!payrollRunAllowsPublish(run.status)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll run must be approved before publishing payslips (current status: ${run.status}).`,
      });
    }

    const periodLifecycle = new HrPayrollPeriodLifecycleService(this.supabase, this.context);
    await periodLifecycle.assertPeriodAllowsPayrollMutation(run.payroll_period_id, "publishing payslips");

    let batchId = run.payroll_batch_id;
    if (!batchId) {
      const { data: batch, error: batchError } = await this.supabase
        .from("hr_payroll_batches")
        .insert({
          batch_type: "regular",
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          metadata: { payroll_runtime_implemented: true, source_payroll_run_id: payrollRunId },
          payroll_group_id: run.payroll_group_id,
          payroll_period_id: run.payroll_period_id,
          status: "approved",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        })
        .select("id")
        .single();
      if (batchError || !batch) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payroll batch for publishing.", cause: batchError });
      }
      batchId = String(batch.id);
      await this.supabase
        .from("hr_payroll_runs")
        .update({ payroll_batch_id: batchId, updated_by: this.context.userId })
        .eq("id", payrollRunId)
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId);
    }

    const { data: results, error: resultsError } = await this.supabase
      .from("hr_payroll_results")
      .select("id, employee_id, gross_earnings, total_deductions, net_pay, currency, employee_snapshot_id")
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (resultsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load payroll results for publishing.", cause: resultsError });
    }

    const publishedAt = new Date().toISOString();
    let publishedCount = 0;

    for (const result of results ?? []) {
      const employeeId = String(result.employee_id);
      const payrollResultId = String(result.id);
      const { data: snapshot, error: snapshotError } = await this.supabase
        .from("hr_payroll_employee_snapshots")
        .select("employment_profile_id")
        .eq("id", result.employee_snapshot_id)
        .eq("tenant_id", this.context.tenantId)
        .is("deleted_at", null)
        .maybeSingle();
      if (snapshotError || !snapshot?.employment_profile_id) {
        continue;
      }

      const { data: existingPayslip } = await this.supabase
        .from("hr_payslips")
        .select("id")
        .eq("payroll_run_id", payrollRunId)
        .eq("employee_id", employeeId)
        .eq("tenant_id", this.context.tenantId)
        .is("deleted_at", null)
        .maybeSingle();

      let payslipId = existingPayslip?.id ? String(existingPayslip.id) : null;
      if (!payslipId) {
        const { data: payslip, error: payslipError } = await this.supabase
          .from("hr_payslips")
          .insert({
            approval_status: "approved",
            branch_id: this.context.branchId,
            company_id: this.context.companyId,
            created_by: this.context.userId,
            currency: String(result.currency ?? "EGP"),
            deduction_amount_metadata: Number(result.total_deductions ?? 0),
            employee_id: employeeId,
            employment_profile_id: snapshot.employment_profile_id,
            gross_amount_metadata: Number(result.gross_earnings ?? 0),
            metadata: { payroll_runtime_implemented: true, published_from_run: payrollRunId },
            net_amount_metadata: Number(result.net_pay ?? 0),
            payroll_batch_id: batchId,
            payroll_period_id: run.payroll_period_id,
            payroll_run_id: payrollRunId,
            runtime_payslip_status: "published",
            snapshot_ref: result.employee_snapshot_id,
            status: "approved",
            tenant_id: this.context.tenantId,
            updated_by: this.context.userId,
          })
          .select("id")
          .single();
        if (payslipError || !payslip) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payslip for publishing.", cause: payslipError });
        }
        payslipId = String(payslip.id);
      }

      const { count: existingLineCount } = await this.supabase
        .from("hr_payslip_lines")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("payslip_id", payslipId)
        .is("deleted_at", null);

      if ((existingLineCount ?? 0) === 0) {
        const { data: resultComponents } = await this.supabase
          .from("hr_payroll_result_components")
          .select("id, component_code, component_name, component_type, amount, quantity, rate, currency, display_order, metadata")
          .eq("tenant_id", this.context.tenantId)
          .eq("payroll_result_id", payrollResultId)
          .is("deleted_at", null)
          .order("display_order", { ascending: true });

        for (const line of resultComponents ?? []) {
          const metadata = (line.metadata && typeof line.metadata === "object" && !Array.isArray(line.metadata))
            ? line.metadata as Record<string, unknown>
            : {};
          const categorySnapshot = String(metadata.category_key ?? line.component_type);
          const earningOrDeduction = ["earning", "employer_contribution", "benefit"].includes(String(line.component_type))
            ? "earning"
            : "deduction";
          const sourceType = String(line.component_type) === "deduction" && categorySnapshot === "loan"
            ? "loan"
            : categorySnapshot === "tax"
              ? "tax"
              : categorySnapshot === "insurance"
                ? "insurance"
                : categorySnapshot === "overtime"
                  ? "attendance"
                  : "compensation";

          await this.supabase.from("hr_payslip_lines").insert({
            amount_metadata: Number(line.amount ?? 0),
            branch_id: this.context.branchId,
            category_snapshot: categorySnapshot,
            company_id: this.context.companyId,
            component_code_snapshot: String(line.component_code),
            component_name_snapshot: String(line.component_name),
            created_by: this.context.userId,
            currency: String(line.currency ?? result.currency ?? "EGP"),
            display_order: Number(line.display_order ?? 100),
            earning_or_deduction: earningOrDeduction,
            metadata: { payroll_calculation_runtime: true, payroll_result_component_id: line.id },
            payslip_id: payslipId,
            quantity_metadata: line.quantity != null ? Number(line.quantity) : null,
            rate_metadata: line.rate != null ? Number(line.rate) : null,
            source_snapshot_ref: String(line.id),
            source_type: sourceType,
            tenant_id: this.context.tenantId,
            updated_by: this.context.userId,
          });
        }
      }

      const correlationId = `run:${payrollRunId}:employee:${employeeId}`;
      const { data: existingPublication } = await this.supabase
        .from("hr_payslip_publications")
        .select("id, publishing_status")
        .eq("tenant_id", this.context.tenantId)
        .eq("correlation_id", correlationId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingPublication?.publishing_status === "published") {
        publishedCount += 1;
        continue;
      }

      if (existingPublication?.id) {
        const { error: updatePublicationError } = await this.supabase
          .from("hr_payslip_publications")
          .update({
            payroll_approved: true,
            payslip_generated: true,
            published_at: publishedAt,
            published_by: this.context.userId,
            publishing_status: "published",
            updated_by: this.context.userId,
            validation_passed: true,
          })
          .eq("id", existingPublication.id);
        if (updatePublicationError) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not publish payslip.", cause: updatePublicationError });
        }
      } else {
        const { error: publicationError } = await this.supabase.from("hr_payslip_publications").insert({
          blocking_exceptions_cleared: true,
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          correlation_id: correlationId,
          created_by: this.context.userId,
          employee_active: true,
          employee_id: employeeId,
          metadata: { publishing_runtime_implemented: true },
          payroll_approved: true,
          payroll_period_id: run.payroll_period_id,
          payroll_run_id: payrollRunId,
          payslip_generated: true,
          payslip_id: payslipId,
          publication_action: "publish",
          publication_scope: "single_employee",
          published_at: publishedAt,
          published_by: this.context.userId,
          publishing_status: "published",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
          validation_passed: true,
        });
        if (publicationError) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payslip publication.", cause: publicationError });
        }
      }

      publishedCount += 1;
    }

    const { error: batchUpdateError } = await this.supabase
      .from("hr_payroll_batches")
      .update({ approved_at: publishedAt, status: "approved", updated_by: this.context.userId })
      .eq("id", batchId)
      .eq("tenant_id", this.context.tenantId);
    if (batchUpdateError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not finalize payroll batch.", cause: batchUpdateError });
    }

    const { error: runUpdateError } = await this.supabase
      .from("hr_payroll_runs")
      .update({ status: "paid", updated_by: this.context.userId })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId);
    if (runUpdateError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not mark payroll run as paid.", cause: runUpdateError });
    }

    return { publishedCount };
  }

  async deletePayrollRun(payrollRunId: string) {
    const { data: run, error: runError } = await this.supabase
      .from("hr_payroll_runs")
      .select("id, status")
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (runError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load payroll run.", cause: runError });
    }
    if (!run) {
      return;
    }
    if (run.status === "paid") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Paid payroll runs cannot be deleted." });
    }

    const deletedAt = new Date().toISOString();
    const deletedBy = this.context.userId;

    const { error: resultsError } = await this.supabase
      .from("hr_payroll_results")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (resultsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not delete payroll results.", cause: resultsError });
    }

    const { error: snapshotsError } = await this.supabase
      .from("hr_payroll_employee_snapshots")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("payroll_run_id", payrollRunId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (snapshotsError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not delete payroll snapshots.", cause: snapshotsError });
    }

    const { error: deleteRunError } = await this.supabase
      .from("hr_payroll_runs")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("id", payrollRunId)
      .eq("tenant_id", this.context.tenantId);
    if (deleteRunError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not delete payroll run.", cause: deleteRunError });
    }
  }

  private async softArchive(table: "hr_payroll_calendars" | "hr_payroll_groups" | "hr_payroll_periods", id: string, notFoundMessage: string) {
    const deletedAt = new Date().toISOString();
    const { data: existing, error: readError } = await this.supabase
      .from(table)
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: notFoundMessage });
    }

    const { error } = await this.supabase
      .from(table)
      .update({
        deleted_at: deletedAt,
        deleted_by: this.context.userId,
        is_active: false,
        ...(table === "hr_payroll_periods" ? {} : { status: "archived" }),
        updated_by: this.context.userId,
      })
      .eq("id", id)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not archive ${table}.`, cause: error });
    }
  }

  async createPayrollCalendar(input: HrPayrollCalendarCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_payroll_calendars")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: input.effectiveFrom,
        frequency: input.frequency,
        is_active: input.status !== "inactive",
        metadata: { payroll_runtime_implemented: true },
        name: input.name,
        status: input.status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payroll calendar.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updatePayrollCalendar(input: HrPayrollCalendarUpdateInput): Promise<void> {
    const { data: existing, error: readError } = await this.supabase
      .from("hr_payroll_calendars")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.calendarId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Payroll calendar not found." });
    }

    const { error } = await this.supabase
      .from("hr_payroll_calendars")
      .update({
        code: input.code,
        effective_from: input.effectiveFrom,
        frequency: input.frequency,
        is_active: input.status !== "inactive",
        name: input.name,
        status: input.status,
        updated_by: this.context.userId,
      })
      .eq("id", input.calendarId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update payroll calendar.", cause: error });
    }
  }

  async archivePayrollCalendar(calendarId: string): Promise<void> {
    await this.softArchive("hr_payroll_calendars", calendarId, "Payroll calendar not found.");
  }

  async createPayrollGroup(input: HrPayrollGroupCreateInput): Promise<{ id: string }> {
    const { data: calendar } = await this.supabase
      .from("hr_payroll_calendars")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.payrollCalendarId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!calendar) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Selected payroll calendar was not found." });
    }

    const { data: policyVersion } = await this.supabase
      .from("hr_policy_versions")
      .select("id, policy_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.payrollPolicyVersionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!policyVersion) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Selected payroll policy version was not found. Create an active payroll policy version first.",
      });
    }

    const { data: policy } = await this.supabase
      .from("hr_policies")
      .select("id, policy_type_id")
      .eq("id", policyVersion.policy_id)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!policy) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Payroll policy for the selected version was not found." });
    }

    const { data: policyType } = await this.supabase
      .from("hr_policy_types")
      .select("id, policy_type_key")
      .eq("id", policy.policy_type_id)
      .maybeSingle();
    if (!policyType || String(policyType.policy_type_key) !== "payroll") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Policy version must belong to a payroll policy type." });
    }

    const { data, error } = await this.supabase
      .from("hr_payroll_groups")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        is_active: input.status !== "inactive",
        metadata: { payroll_runtime_implemented: true },
        name: input.name,
        payroll_calendar_id: input.payrollCalendarId,
        payroll_policy_version_id: input.payrollPolicyVersionId,
        status: input.status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payroll group.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updatePayrollGroup(input: HrPayrollGroupUpdateInput): Promise<void> {
    const { data: existing, error: readError } = await this.supabase
      .from("hr_payroll_groups")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.groupId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Payroll group not found." });
    }

    const { error } = await this.supabase
      .from("hr_payroll_groups")
      .update({
        code: input.code,
        is_active: input.status !== "inactive",
        name: input.name,
        payroll_calendar_id: input.payrollCalendarId,
        payroll_policy_version_id: input.payrollPolicyVersionId,
        status: input.status,
        updated_by: this.context.userId,
      })
      .eq("id", input.groupId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update payroll group.", cause: error });
    }
  }

  async archivePayrollGroup(groupId: string): Promise<void> {
    await this.softArchive("hr_payroll_groups", groupId, "Payroll group not found.");
  }

  async createPayrollPeriod(input: HrPayrollPeriodCreateInput): Promise<{ id: string }> {
    if (input.endDate < input.startDate) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Period end date must be on or after start date." });
    }
    const paymentDate = input.paymentDate || input.endDate;

    const { data: calendar } = await this.supabase
      .from("hr_payroll_calendars")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.payrollCalendarId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!calendar) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Selected payroll calendar was not found." });
    }

    const { data, error } = await this.supabase
      .from("hr_payroll_periods")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        cutoff_date: input.endDate,
        end_date: input.endDate,
        metadata: { payroll_runtime_implemented: true },
        payment_date: paymentDate,
        payroll_calendar_id: input.payrollCalendarId,
        period_code: input.periodCode,
        period_name: input.periodName,
        start_date: input.startDate,
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create payroll period.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updatePayrollPeriod(input: HrPayrollPeriodUpdateInput): Promise<void> {
    if (input.endDate < input.startDate) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Period end date must be on or after start date." });
    }
    const paymentDate = input.paymentDate || input.endDate;

    const { data: existing, error: readError } = await this.supabase
      .from("hr_payroll_periods")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.periodId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Payroll period not found." });
    }
    if (["locked", "closed"].includes(String(existing.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Locked or closed payroll periods cannot be edited." });
    }

    const { error } = await this.supabase
      .from("hr_payroll_periods")
      .update({
        cutoff_date: input.endDate,
        end_date: input.endDate,
        payment_date: paymentDate,
        payroll_calendar_id: input.payrollCalendarId,
        period_code: input.periodCode,
        period_name: input.periodName,
        start_date: input.startDate,
        updated_by: this.context.userId,
      })
      .eq("id", input.periodId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update payroll period.", cause: error });
    }
  }

  async archivePayrollPeriod(periodId: string): Promise<void> {
    await this.softArchive("hr_payroll_periods", periodId, "Payroll period not found.");
  }

  async resetSeededPayrollSetup() {
    const deletedAt = new Date().toISOString();
    const deletedBy = this.context.userId;

    const { count: activeRunCount } = await this.supabase
      .from("hr_payroll_runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);
    if ((activeRunCount ?? 0) > 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Delete all payroll runs before resetting seeded setup." });
    }

    await this.supabase
      .from("hr_payroll_periods")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .contains("metadata", { seeded: true });

    await this.supabase
      .from("hr_payroll_groups")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .contains("metadata", { seeded: true });

    const { data: seededPolicyVersions } = await this.supabase
      .from("hr_policy_versions")
      .select("id, policy_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .contains("metadata", { seeded: true });

    const policyVersionIds = (seededPolicyVersions ?? []).map((row) => String(row.id));
    const policyIds = [...new Set((seededPolicyVersions ?? []).map((row) => String(row.policy_id)))];

    if (policyVersionIds.length > 0) {
      await this.supabase
        .from("hr_policy_versions")
        .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
        .in("id", policyVersionIds);
    }

    if (policyIds.length > 0) {
      await this.supabase
        .from("hr_policies")
        .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
        .in("id", policyIds)
        .contains("metadata", { seeded: true });
    }

    await this.supabase
      .from("hr_payroll_calendars")
      .update({ deleted_at: deletedAt, deleted_by: deletedBy, updated_by: deletedBy })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .contains("metadata", { seeded: true });
  }

  async ensureDefaultSetup(): Promise<{ calendarId: string; groupId: string; periodId: string }> {
    const { count: groupCount } = await this.supabase
      .from("hr_payroll_groups")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    if ((groupCount ?? 0) > 0) {
      const { data: existingGroup } = await this.supabase
        .from("hr_payroll_groups")
        .select("id, payroll_calendar_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      const { data: existingPeriod } = await this.supabase
        .from("hr_payroll_periods")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!existingGroup || !existingPeriod) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Payroll setup is incomplete." });
      }
      return {
        calendarId: String(existingGroup.payroll_calendar_id),
        groupId: String(existingGroup.id),
        periodId: String(existingPeriod.id),
      };
    }

    const { data: policyType, error: policyTypeError } = await this.supabase
      .from("hr_policy_types")
      .select("id")
      .eq("policy_type_key", "payroll")
      .maybeSingle();
    if (policyTypeError || !policyType) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Payroll policy type is not configured.", cause: policyTypeError });
    }

    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const startDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    const periodCode = `${year}-${String(month + 1).padStart(2, "0")}`;

    const { data: calendar, error: calendarError } = await this.supabase
      .from("hr_payroll_calendars")
      .insert({
        branch_id: this.context.branchId,
        code: "MONTHLY",
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: startDate,
        frequency: "monthly",
        metadata: { payroll_runtime_implemented: true, seeded: true },
        name: "Monthly Payroll Calendar",
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (calendarError || !calendar) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed payroll calendar.", cause: calendarError });
    }

    const { data: policy, error: policyError } = await this.supabase
      .from("hr_policies")
      .insert({
        branch_id: this.context.branchId,
        code: "DEFAULT-PAYROLL",
        company_id: this.context.companyId,
        created_by: this.context.userId,
        metadata: { payroll_runtime_implemented: true, seeded: true },
        name: "Default Payroll Policy",
        policy_type_id: policyType.id,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (policyError || !policy) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed payroll policy.", cause: policyError });
    }

    const { data: policyVersion, error: policyVersionError } = await this.supabase
      .from("hr_policy_versions")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: startDate,
        metadata: { payroll_runtime_implemented: true, seeded: true },
        policy_id: policy.id,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        version_no: 1,
      })
      .select("id")
      .single();
    if (policyVersionError || !policyVersion) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed payroll policy version.", cause: policyVersionError });
    }

    const calendarId = String(calendar.id);
    const policyVersionId = String(policyVersion.id);

    const { data: group, error: groupError } = await this.supabase
      .from("hr_payroll_groups")
      .insert({
        branch_id: this.context.branchId,
        code: "DEFAULT",
        company_id: this.context.companyId,
        created_by: this.context.userId,
        metadata: { payroll_runtime_implemented: true, seeded: true },
        name: "Default Payroll Group",
        payroll_calendar_id: calendarId,
        payroll_policy_version_id: policyVersionId,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (groupError || !group) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed payroll group.", cause: groupError });
    }

    const { data: period, error: periodError } = await this.supabase
      .from("hr_payroll_periods")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        cutoff_date: endDate,
        end_date: endDate,
        metadata: { payroll_runtime_implemented: true, seeded: true },
        payment_date: endDate,
        payroll_calendar_id: calendarId,
        period_code: periodCode,
        period_name: `${periodCode} Payroll Period`,
        start_date: startDate,
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (periodError || !period) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed payroll period.", cause: periodError });
    }

    return { calendarId, groupId: String(group.id), periodId: String(period.id) };
  }
}
