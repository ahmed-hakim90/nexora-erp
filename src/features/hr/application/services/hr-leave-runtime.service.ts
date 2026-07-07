import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import {
  HR_LEAVE_RUNTIME_AUDIT_ACTIONS,
  HR_LEAVE_RUNTIME_EVENT_KEYS,
} from "../constants/hr-leave-runtime.constants";
import type { HrLeaveCarryForwardPreviewInput, HrLeaveEncashmentCreateInput } from "../schemas/hr-leave-runtime.schema";
import { HrLeaveBalanceEngine } from "./hr-leave-balance.engine";

export type LeavePayrollInputSnapshot = Readonly<{
  carryForwardFlag: boolean;
  employeeId: string;
  encashmentFlag: boolean;
  leaveDays: number;
  leaveHours: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}>;

export class HrLeavePayrollInputService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  /** Canonical leave payroll input reader — attendance/payroll must use this only. */
  async getEmployeePayrollInputs(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<LeavePayrollInputSnapshot> {
    const { data: requests } = await this.supabase
      .from("hr_leave_requests")
      .select("quantity, status, leave_type_id, hr_leave_types(paid, impacts_payroll)")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .lte("starts_on", periodEnd)
      .gte("ends_on", periodStart)
      .is("deleted_at", null);

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let leaveDays = 0;
    for (const row of requests ?? []) {
      const qty = Number(row.quantity ?? 0);
      const leaveType = row.hr_leave_types as { impacts_payroll?: boolean; paid?: boolean } | null;
      const paid = Boolean(leaveType?.paid ?? true);
      leaveDays += qty;
      if (paid) paidLeaveDays += qty;
      else unpaidLeaveDays += qty;
    }

    const { count: encashmentCount } = await this.supabase
      .from("hr_leave_encashment_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .eq("payroll_export_flag", true)
      .is("deleted_at", null);

    const { count: carryCount } = await this.supabase
      .from("hr_leave_carry_forward_runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("status", "active")
      .gte("target_period_start", periodStart)
      .lte("source_period_end", periodEnd)
      .is("deleted_at", null);

    return {
      carryForwardFlag: (carryCount ?? 0) > 0,
      employeeId,
      encashmentFlag: (encashmentCount ?? 0) > 0,
      leaveDays,
      leaveHours: leaveDays * 8,
      paidLeaveDays,
      unpaidLeaveDays,
    };
  }

  async countOpenLeaveOverlappingPeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("hr_leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .in("status", ["submitted", "under_review"])
      .lte("starts_on", periodEnd)
      .gte("ends_on", periodStart)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate open leave requests.", cause: error });
    }
    return count ?? 0;
  }
}

export class HrLeaveRuntimeService {
  private readonly balanceEngine: HrLeaveBalanceEngine;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.balanceEngine = new HrLeaveBalanceEngine(supabase, context);
  }

  private async notify(input: { body: string; eventKey: string; idempotencyKey: string; severity: "info" | "warning" | "error"; title: string }) {
    await this.supabase.from("hr_operator_notifications").insert({
      body: input.body,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_key: input.eventKey,
      idempotency_key: input.idempotencyKey,
      severity: input.severity,
      tenant_id: this.context.tenantId,
      title: input.title,
      updated_by: this.context.userId,
    });
  }

  async recordApprovalEvent(leaveRequestId: string, eventKind: string, reason?: string, approvalLevel = 1) {
    await this.supabase.from("hr_leave_approval_events").insert({
      actor_user_id: this.context.userId,
      approval_level: approvalLevel,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_kind: eventKind,
      leave_request_id: leaveRequestId,
      metadata: { runtime_implemented: true },
      reason: reason ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
  }

  async previewCarryForward(input: HrLeaveCarryForwardPreviewInput) {
    const { data: employees } = await this.supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    const previewRows: Array<{ carryQuantity: number; employeeId: string; leaveTypeId: string }> = [];

    for (const employee of employees ?? []) {
      const { data: policies } = await this.supabase
        .from("hr_leave_policies")
        .select("leave_type_id, carry_forward_allowed, policy_rules")
        .eq("tenant_id", this.context.tenantId)
        .eq("status", "active")
        .eq("carry_forward_allowed", true)
        .is("deleted_at", null);

      for (const policy of policies ?? []) {
        const snapshot = await this.balanceEngine.recalculateBalance(String(employee.id), String(policy.leave_type_id));
        const rules = (policy.policy_rules ?? {}) as { carryForwardMax?: number };
        const maxCarry = Number(rules.carryForwardMax ?? snapshot.available);
        const carryQuantity = Math.min(snapshot.available, maxCarry);
        if (carryQuantity > 0) {
          previewRows.push({ carryQuantity, employeeId: String(employee.id), leaveTypeId: String(policy.leave_type_id) });
        }
      }
    }

    const { data: run, error } = await this.supabase
      .from("hr_leave_carry_forward_runs")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_count: new Set(previewRows.map((row) => row.employeeId)).size,
        metadata: { runtime_implemented: true },
        preview_payload: { rows: previewRows },
        scope: input.scope,
        source_period_end: input.sourcePeriodEnd,
        status: "draft",
        target_period_start: input.targetPeriodStart,
        tenant_id: this.context.tenantId,
        total_quantity_carried: previewRows.reduce((sum, row) => sum + row.carryQuantity, 0),
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !run) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create carry-forward preview.", cause: error });

    await recordAuditEvent({
      action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.carryForwardPreviewed,
      category: "data-access",
      context: this.context,
      entityId: String(run.id),
      entityType: "hr_leave_carry_forward_runs",
      metadata: { rowCount: previewRows.length },
      module: "hr",
    });

    return { previewRows, runId: String(run.id) };
  }

  async executeCarryForward(runId: string) {
    const { data: run, error: readError } = await this.supabase
      .from("hr_leave_carry_forward_runs")
      .select("id, preview_payload, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", runId)
      .maybeSingle();

    if (readError || !run) throw new ApplicationError({ code: "NOT_FOUND", message: "Carry-forward run not found." });
    const preview = (run.preview_payload ?? {}) as { rows?: Array<{ carryQuantity: number; employeeId: string; leaveTypeId: string }> };

    for (const row of preview.rows ?? []) {
      const balance = await this.balanceEngine.getOrCreateBalance(row.employeeId, row.leaveTypeId);
      await this.supabase
        .from("hr_leave_balances")
        .update({
          carried_forward_quantity: Number(balance.carried_forward_quantity ?? 0) + row.carryQuantity,
          updated_by: this.context.userId,
        })
        .eq("id", balance.id);

      await this.balanceEngine.writeLedgerEntry({
        balanceAfter: Number(balance.available_quantity ?? 0) + row.carryQuantity,
        balanceId: String(balance.id),
        employeeId: row.employeeId,
        leaveTypeId: row.leaveTypeId,
        movementKind: "carry_forward_in",
        quantity: row.carryQuantity,
        referenceId: runId,
        referenceType: "hr_leave_carry_forward_runs",
      });
    }

    await this.supabase
      .from("hr_leave_carry_forward_runs")
      .update({
        executed_at: new Date().toISOString(),
        executed_by: this.context.userId,
        status: "active",
        updated_by: this.context.userId,
      })
      .eq("id", runId);

    await recordAuditEvent({
      action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.carryForwardExecuted,
      category: "data-access",
      context: this.context,
      entityId: runId,
      entityType: "hr_leave_carry_forward_runs",
      module: "hr",
    });

    await this.notify({
      body: "Leave carry-forward executed successfully.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.carryForwardDue,
      idempotencyKey: `carry-forward:${runId}`,
      severity: "info",
      title: "Carry forward completed",
    });
  }

  async createEncashment(input: HrLeaveEncashmentCreateInput): Promise<{ id: string }> {
    const { data: profile } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (!profile) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active employment profile required." });

    const snapshot = await this.balanceEngine.recalculateBalance(input.employeeId, input.leaveTypeId);
    if (snapshot.available < input.requestedQuantity) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Insufficient balance for encashment." });
    }

    const { data, error } = await this.supabase
      .from("hr_leave_encashment_requests")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_id: input.employeeId,
        employment_profile_id: String(profile.id),
        encashment_kind: input.encashmentKind,
        leave_type_id: input.leaveTypeId,
        max_percentage: input.maxPercentage ?? null,
        metadata: { runtime_implemented: true },
        requested_quantity: input.requestedQuantity,
        status: "submitted",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create encashment request.", cause: error });

    await recordAuditEvent({
      action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.encashmentCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_leave_encashment_requests",
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async approveEncashment(encashmentId: string): Promise<void> {
    const { data: row } = await this.supabase
      .from("hr_leave_encashment_requests")
      .select("employee_id, leave_type_id, requested_quantity, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", encashmentId)
      .maybeSingle();

    if (!row || String(row.status) !== "submitted") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Encashment cannot be approved in current state." });
    }

    await this.supabase
      .from("hr_leave_encashment_requests")
      .update({
        approved_at: new Date().toISOString(),
        approved_by: this.context.userId,
        payroll_export_flag: true,
        status: "approved",
        updated_by: this.context.userId,
      })
      .eq("id", encashmentId);

    await this.balanceEngine.writeLedgerEntry({
      balanceAfter: 0,
      employeeId: String(row.employee_id),
      leaveTypeId: String(row.leave_type_id),
      movementKind: "encashment",
      quantity: Number(row.requested_quantity),
      referenceId: encashmentId,
      referenceType: "hr_leave_encashment_requests",
    });

    await this.balanceEngine.recalculateBalance(String(row.employee_id), String(row.leave_type_id));

    await recordAuditEvent({
      action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.encashmentApproved,
      category: "data-access",
      context: this.context,
      entityId: encashmentId,
      entityType: "hr_leave_encashment_requests",
      module: "hr",
    });

    await this.notify({
      body: "Leave encashment approved and flagged for payroll export.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.encashmentApproved,
      idempotencyKey: `encashment-approved:${encashmentId}`,
      severity: "info",
      title: "Encashment approved",
    });
  }

  async getDashboardMetrics() {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

    const [pending, away, carryDue, encashmentPending, lowBalance] = await Promise.all([
      this.supabase.from("hr_leave_requests").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).in("status", ["submitted", "under_review"]).is("deleted_at", null),
      this.supabase.from("hr_leave_requests").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).eq("status", "approved").lte("starts_on", today).gte("ends_on", today).is("deleted_at", null),
      this.supabase.from("hr_leave_carry_forward_runs").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).eq("status", "draft").is("deleted_at", null),
      this.supabase.from("hr_leave_encashment_requests").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).eq("status", "submitted").is("deleted_at", null),
      this.supabase.from("hr_leave_balances").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).lte("available_quantity", 2).is("deleted_at", null),
    ]);

    return {
      carryForwardDue: carryDue.count ?? 0,
      employeesCurrentlyAway: away.count ?? 0,
      encashmentPending: encashmentPending.count ?? 0,
      leaveBalanceRisk: lowBalance.count ?? 0,
      pendingApprovals: pending.count ?? 0,
      upcomingLeaveWindowEnd: in30,
    };
  }
}
