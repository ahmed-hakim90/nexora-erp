import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";
import { defineAuditAction } from "@/platform/audit/public-api";

import {
  PAYROLL_PERIOD_FROZEN_STATUSES,
  PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
} from "../constants/hr-payroll-runtime.constants";
import { HrEmployeeDocumentComplianceService } from "./hr-employee-document-compliance.service";

type PayrollPeriodRow = Readonly<{
  end_date: string;
  id: string;
  period_code: string;
  period_name: string;
  start_date: string;
  status: string;
}>;

const HR_PAYROLL_PERIOD_AUDIT_ACTIONS = {
  closed: defineAuditAction("hr.payroll.period.closed"),
  locked: defineAuditAction("hr.payroll.period.locked"),
  opened: defineAuditAction("hr.payroll.period.opened"),
  reopened: defineAuditAction("hr.payroll.period.reopened"),
} as const;

export class HrPayrollPeriodLifecycleService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadPeriod(payrollPeriodId: string): Promise<PayrollPeriodRow> {
    const { data, error } = await this.supabase
      .from("hr_payroll_periods")
      .select("id, period_code, period_name, start_date, end_date, status")
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Payroll period not found." });
    }

    return {
      end_date: String(data.end_date),
      id: String(data.id),
      period_code: String(data.period_code),
      period_name: String(data.period_name),
      start_date: String(data.start_date),
      status: String(data.status),
    };
  }

  isPeriodFrozen(status: string): boolean {
    return PAYROLL_PERIOD_FROZEN_STATUSES.includes(status as (typeof PAYROLL_PERIOD_FROZEN_STATUSES)[number]);
  }

  async assertPeriodAllowsPayrollMutation(payrollPeriodId: string, operation: string): Promise<PayrollPeriodRow> {
    const period = await this.loadPeriod(payrollPeriodId);
    if (this.isPeriodFrozen(period.status)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll period "${period.period_name}" is ${period.status}. Reopen the period before ${operation}.`,
      });
    }
    return period;
  }

  async assertWorkDateAllowsAttendanceMutation(workDate: string): Promise<void> {
    await this.assertPayrollDateRangeAllowsMutation(workDate, workDate);
  }

  async assertPayrollDateRangeAllowsMutation(periodStart: string, periodEnd: string): Promise<void> {
    const { data: periods } = await this.supabase
      .from("hr_payroll_periods")
      .select("id, period_name, status, start_date, end_date")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .lte("start_date", periodEnd)
      .gte("end_date", periodStart)
      .is("deleted_at", null);

    const frozen = (periods ?? []).find((row) => this.isPeriodFrozen(String(row.status)));
    if (frozen) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll period "${String(frozen.period_name)}" is ${String(frozen.status)}. Reopen the period before changing attendance for ${periodStart} to ${periodEnd}.`,
      });
    }
  }

  async assertCompletedExportExists(period: PayrollPeriodRow): Promise<void> {
    const { count } = await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("period_start", period.start_date)
      .eq("period_end", period.end_date)
      .eq("status", "completed")
      .is("deleted_at", null);

    if ((count ?? 0) === 0) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
      });
    }
  }

  async openPeriod(payrollPeriodId: string): Promise<{ status: string }> {
    const period = await this.loadPeriod(payrollPeriodId);
    if (period.status === "open" || period.status === "input_collection") {
      return { status: period.status };
    }
    if (period.status === "cancelled") {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Cancelled payroll periods cannot be reopened through open. Use reopen instead.",
      });
    }

    const { error } = await this.supabase
      .from("hr_payroll_periods")
      .update({
        metadata: { period_lifecycle_runtime: true, reopened_at: new Date().toISOString() },
        status: "open",
        updated_by: this.context.userId,
      })
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not open payroll period.", cause: error });
    }

    await recordAuditEvent({
      action: HR_PAYROLL_PERIOD_AUDIT_ACTIONS.opened,
      category: "workflow",
      context: this.context,
      entityId: payrollPeriodId,
      entityType: "hr_payroll_periods",
      metadata: { message: `Payroll period opened: ${period.period_name}` },
      module: "hr",
    });

    return { status: "open" };
  }

  async lockPeriod(payrollPeriodId: string, reason?: string): Promise<{ status: string }> {
    const period = await this.assertPeriodAllowsPayrollMutation(payrollPeriodId, "locking");
    await this.validatePeriodForPayroll(payrollPeriodId);

    const correlationId = `period-lock:${payrollPeriodId}:${Date.now()}`;
    const { error: periodError } = await this.supabase
      .from("hr_payroll_periods")
      .update({
        metadata: { locked_at: new Date().toISOString(), period_lifecycle_runtime: true },
        status: "locked",
        updated_by: this.context.userId,
      })
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId);

    if (periodError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not lock payroll period.", cause: periodError });
    }

    await this.supabase.from("hr_payroll_runtime_locks").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      lock_scope: "payroll_period",
      locked_by: this.context.userId,
      metadata: { lock_runtime_implemented: true, reason: reason ?? null },
      payroll_period_id: payrollPeriodId,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    await recordAuditEvent({
      action: HR_PAYROLL_PERIOD_AUDIT_ACTIONS.locked,
      category: "workflow",
      context: this.context,
      entityId: payrollPeriodId,
      entityType: "hr_payroll_periods",
      metadata: {
        correlationId,
        message: reason ? `Payroll period locked: ${reason}` : `Payroll period locked: ${period.period_name}`,
      },
      module: "hr",
    });

    return { status: "locked" };
  }

  async closePeriod(payrollPeriodId: string, reason?: string): Promise<{ status: string }> {
    const period = await this.loadPeriod(payrollPeriodId);
    if (period.status !== "locked" && period.status !== "approved" && period.status !== "posted") {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Payroll period must be locked before closing (current status: ${period.status}).`,
      });
    }

    const correlationId = `period-close:${payrollPeriodId}:${Date.now()}`;
    const { error: periodError } = await this.supabase
      .from("hr_payroll_periods")
      .update({
        metadata: { closed_at: new Date().toISOString(), period_lifecycle_runtime: true },
        status: "closed",
        updated_by: this.context.userId,
      })
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId);

    if (periodError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not close payroll period.", cause: periodError });
    }

    await this.supabase.from("hr_payroll_closing_history").insert({
      branch_id: this.context.branchId,
      close_target: "payroll_period",
      company_id: this.context.companyId,
      correlation_id: correlationId,
      created_by: this.context.userId,
      freeze_inputs: true,
      freeze_payslips: true,
      freeze_results: true,
      freeze_snapshots: true,
      metadata: { closing_runtime_implemented: true },
      new_state: "closed",
      payroll_period_id: payrollPeriodId,
      previous_state: period.status,
      reason: reason ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    await recordAuditEvent({
      action: HR_PAYROLL_PERIOD_AUDIT_ACTIONS.closed,
      category: "workflow",
      context: this.context,
      entityId: payrollPeriodId,
      entityType: "hr_payroll_periods",
      metadata: {
        correlationId,
        message: reason ? `Payroll period closed: ${reason}` : `Payroll period closed: ${period.period_name}`,
      },
      module: "hr",
    });

    return { status: "closed" };
  }

  async reopenPeriod(payrollPeriodId: string, reason: string): Promise<{ status: string }> {
    const period = await this.loadPeriod(payrollPeriodId);
    if (!this.isPeriodFrozen(period.status) && period.status !== "cancelled") {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Only locked or closed payroll periods can be reopened (current status: ${period.status}).`,
      });
    }

    const correlationId = `period-reopen:${payrollPeriodId}:${Date.now()}`;
    await this.supabase.from("hr_payroll_reopen_requests").insert({
      approval_status: "approved",
      approved_by: this.context.userId,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      correlation_id: correlationId,
      created_by: this.context.userId,
      metadata: { reopen_runtime_implemented: true },
      payroll_period_id: payrollPeriodId,
      reason,
      reopen_target: "payroll_period",
      requested_by: this.context.userId,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    const deletedAt = new Date().toISOString();
    await this.supabase
      .from("hr_payroll_runtime_locks")
      .update({ deleted_at: deletedAt, deleted_by: this.context.userId, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("payroll_period_id", payrollPeriodId)
      .eq("lock_scope", "payroll_period")
      .is("deleted_at", null);

    const { error: periodError } = await this.supabase
      .from("hr_payroll_periods")
      .update({
        metadata: { period_lifecycle_runtime: true, reopened_at: new Date().toISOString() },
        status: "open",
        updated_by: this.context.userId,
      })
      .eq("id", payrollPeriodId)
      .eq("tenant_id", this.context.tenantId);

    if (periodError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reopen payroll period.", cause: periodError });
    }

    await recordAuditEvent({
      action: HR_PAYROLL_PERIOD_AUDIT_ACTIONS.reopened,
      category: "workflow",
      context: this.context,
      entityId: payrollPeriodId,
      entityType: "hr_payroll_periods",
      metadata: { correlationId, message: `Payroll period reopened: ${reason}` },
      module: "hr",
    });

    return { status: "open" };
  }

  async validatePeriodForPayroll(payrollPeriodId: string): Promise<{ issueCount: number; blockingCount: number }> {
    const period = await this.loadPeriod(payrollPeriodId);
    const correlationId = `period-validate:${payrollPeriodId}:${Date.now()}`;

    await this.supabase
      .from("hr_payroll_validation_results")
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, status: "dismissed", updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("payroll_period_id", payrollPeriodId)
      .eq("status", "open")
      .is("deleted_at", null);

    const issues: Array<{
      blocking: boolean;
      employeeId?: string;
      message: string;
      ruleCategory: string;
      ruleCode?: string;
      severity: string;
    }> = [];

    const complianceService = new HrEmployeeDocumentComplianceService(this.supabase, this.context);

    const { data: employees } = await this.supabase
      .from("hr_employees")
      .select("id, employee_number, full_name")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    for (const emp of employees ?? []) {
      const { data: profile } = await this.supabase
        .from("hr_employment_profiles")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();

      if (!profile) {
        issues.push({
          blocking: true,
          employeeId: String(emp.id),
          message: `Employee ${String(emp.full_name)} (${String(emp.employee_number)}) has no active employment profile.`,
          ruleCategory: "employee",
          severity: "blocking",
        });
      }

      const { data: snapshot } = await this.supabase
        .from("hr_attendance_payroll_snapshots")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", emp.id)
        .eq("period_start", period.start_date)
        .eq("period_end", period.end_date)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (!snapshot) {
        issues.push({
          blocking: true,
          employeeId: String(emp.id),
          message: `Employee ${String(emp.full_name)} (${String(emp.employee_number)}) has no attendance payroll snapshot for ${period.period_name}.`,
          ruleCategory: "snapshot",
          severity: "blocking",
        });
      }

      const compliance = await complianceService.evaluateEmployee(String(emp.id));
      if (compliance.resolution === "resolved" && compliance.summary.expired > 0) {
        issues.push({
          blocking: false,
          employeeId: String(emp.id),
          message: `Employee ${String(emp.full_name)} (${String(emp.employee_number)}) has expired required documents.`,
          ruleCategory: "employee",
          ruleCode: "expired_document",
          severity: "warning",
        });
      }
    }

    try {
      await this.assertCompletedExportExists(period);
    } catch {
      issues.push({
        blocking: true,
        message: PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
        ruleCategory: "snapshot",
        severity: "blocking",
      });
    }

    for (const issue of issues) {
      await this.supabase.from("hr_payroll_validation_results").insert({
        blocking: issue.blocking,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        employee_id: issue.employeeId ?? null,
        message: issue.message,
        metadata: issue.ruleCode ? { rule_code: issue.ruleCode, validation_runtime_implemented: true } : { validation_runtime_implemented: true },
        payroll_period_id: payrollPeriodId,
        rule_category: issue.ruleCategory,
        severity: issue.severity,
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      });
    }

    const blockingCount = issues.filter((issue) => issue.blocking).length;
    return { blockingCount, issueCount: issues.length };
  }
}
