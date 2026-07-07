import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import { HR_LEAVE_RUNTIME_AUDIT_ACTIONS } from "../constants/hr-leave-runtime.constants";

export type LeaveBalanceSnapshot = Readonly<{
  approved: number;
  available: number;
  carriedForward: number;
  consumed: number;
  employeeId: string;
  expired: number;
  leaveTypeId: string;
  negative: number;
  pending: number;
  projected: number;
  scheduled: number;
}>;

export class HrLeaveBalanceEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async getOrCreateBalance(employeeId: string, leaveTypeId: string, annualEntitlement = 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await this.supabase
      .from("hr_leave_balances")
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("leave_type_id", leaveTypeId)
      .is("deleted_at", null)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await this.supabase
      .from("hr_leave_balances")
      .insert({
        as_of_date: today,
        available_quantity: annualEntitlement,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        metadata: { runtime_calculation_implemented: true },
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("*")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not initialize leave balance.", cause: error });
    return data;
  }

  async recalculateBalance(employeeId: string, leaveTypeId: string): Promise<LeaveBalanceSnapshot> {
    const { data: requests } = await this.supabase
      .from("hr_leave_requests")
      .select("quantity, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("leave_type_id", leaveTypeId)
      .is("deleted_at", null);

    let pending = 0;
    let consumed = 0;
    let scheduled = 0;
    for (const row of requests ?? []) {
      const qty = Number(row.quantity ?? 0);
      if (["submitted", "under_review"].includes(String(row.status))) pending += qty;
      if (String(row.status) === "approved") consumed += qty;
      if (String(row.status) === "draft") scheduled += qty;
    }

    const balanceRow = await this.getOrCreateBalance(employeeId, leaveTypeId);
    const entitled = Number(balanceRow.available_quantity ?? 0) + consumed + pending;
    const carriedForward = Number(balanceRow.carried_forward_quantity ?? 0);
    const expired = Number(balanceRow.expired_quantity ?? 0);
    const available = Math.max(0, entitled + carriedForward - consumed - pending - expired);
    const negative = available < 0 ? Math.abs(available) : 0;
    const projected = available - pending;

    await this.supabase
      .from("hr_leave_balances")
      .update({
        available_quantity: available,
        consumed_quantity: consumed,
        metadata: { negative, projected, runtime_calculation_implemented: true },
        pending_quantity: pending,
        projected_quantity: projected,
        scheduled_quantity: scheduled,
        updated_by: this.context.userId,
      })
      .eq("id", balanceRow.id);

    await recordAuditEvent({
      action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.balanceRecalculated,
      category: "data-access",
      context: this.context,
      entityId: String(balanceRow.id),
      entityType: "hr_leave_balances",
      metadata: { available, employeeId, leaveTypeId },
      module: "hr",
    });

    return {
      approved: consumed,
      available,
      carriedForward,
      consumed,
      employeeId,
      expired,
      leaveTypeId,
      negative,
      pending,
      projected,
      scheduled,
    };
  }

  async writeLedgerEntry(input: {
    balanceAfter: number;
    balanceId?: string;
    employeeId: string;
    leaveTypeId: string;
    movementKind: string;
    quantity: number;
    referenceId?: string;
    referenceType?: string;
  }) {
    await this.supabase.from("hr_leave_balance_ledger").insert({
      as_of_date: new Date().toISOString().slice(0, 10),
      balance_after: input.balanceAfter,
      balance_id: input.balanceId ?? null,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: input.employeeId,
      leave_type_id: input.leaveTypeId,
      movement_kind: input.movementKind,
      metadata: { runtime_implemented: true },
      quantity: input.quantity,
      reference_id: input.referenceId ?? null,
      reference_type: input.referenceType ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
  }

  async applyPending(employeeId: string, leaveTypeId: string, quantity: number, requestId: string) {
    const snapshot = await this.recalculateBalance(employeeId, leaveTypeId);
    await this.writeLedgerEntry({
      balanceAfter: snapshot.available,
      employeeId,
      leaveTypeId,
      movementKind: "request_pending",
      quantity,
      referenceId: requestId,
      referenceType: "hr_leave_requests",
    });
  }

  async applyApproved(employeeId: string, leaveTypeId: string, quantity: number, requestId: string) {
    const snapshot = await this.recalculateBalance(employeeId, leaveTypeId);
    await this.writeLedgerEntry({
      balanceAfter: snapshot.available,
      employeeId,
      leaveTypeId,
      movementKind: "request_approved",
      quantity,
      referenceId: requestId,
      referenceType: "hr_leave_requests",
    });
  }
}
