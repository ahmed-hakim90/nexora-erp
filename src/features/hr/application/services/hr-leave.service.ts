import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import { HR_LEAVE_RUNTIME_AUDIT_ACTIONS, HR_LEAVE_RUNTIME_EVENT_KEYS } from "../constants/hr-leave-runtime.constants";
import type {
  HrLeaveCreateInput,
  HrLeavePolicyCreateInput,
  HrLeavePolicyUpdateInput,
  HrLeaveTypeCreateInput,
  HrLeaveTypeUpdateInput,
} from "../schemas/hr-leave.schema";
import { HrLeaveBalanceEngine } from "./hr-leave-balance.engine";
import { HrLeaveConflictEngine } from "./hr-leave-conflict.engine";
import { HrLeavePolicyEngine } from "./hr-leave-policy.engine";
import { HrLeaveRuntimeService } from "./hr-leave-runtime.service";

function daysBetweenInclusive(startsOn: string, endsOn: string): number {
  const start = new Date(`${startsOn}T00:00:00.000Z`);
  const end = new Date(`${endsOn}T00:00:00.000Z`);
  if (end < start) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "End date must be on or after start date." });
  }
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export class HrLeaveService {
  private readonly balanceEngine: HrLeaveBalanceEngine;
  private readonly conflictEngine: HrLeaveConflictEngine;
  private readonly policyEngine: HrLeavePolicyEngine;
  private readonly runtimeService: HrLeaveRuntimeService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.balanceEngine = new HrLeaveBalanceEngine(supabase, context);
    this.conflictEngine = new HrLeaveConflictEngine(supabase, context);
    this.policyEngine = new HrLeavePolicyEngine(supabase, context);
    this.runtimeService = new HrLeaveRuntimeService(supabase, context);
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

  private async getActiveEmploymentProfileId(employeeId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee must have an active employment profile." });
    }
    return String(data.id);
  }

  async createLeaveRequest(input: HrLeaveCreateInput): Promise<{ id: string }> {
    const employmentProfileId = await this.getActiveEmploymentProfileId(input.employeeId);
    const quantity = daysBetweenInclusive(input.startsOn, input.endsOn);
    const policy = await this.policyEngine.resolveActivePolicy(input.leaveTypeId);

    if (!policy) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "No active leave policy for this leave type." });
    }

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.employeeId)
      .maybeSingle();

    this.policyEngine.validateRequestAgainstPolicy({
      employeeHireDate: null,
      employeeOnProbation: String(employee?.status) === "probation",
      policy,
      quantity,
    });

    await this.balanceEngine.getOrCreateBalance(input.employeeId, input.leaveTypeId, policy.annualEntitlement);

    const conflicts = await this.conflictEngine.detectConflicts({
      employeeId: input.employeeId,
      endsOn: input.endsOn,
      leaveTypeId: input.leaveTypeId,
      quantity,
      startsOn: input.startsOn,
    });

    if (conflicts.length > 0) {
      await recordAuditEvent({
        action: HR_LEAVE_RUNTIME_AUDIT_ACTIONS.requestConflictBlocked,
        category: "data-access",
        context: this.context,
        entityType: "hr_leave_requests",
        metadata: { conflicts },
        module: "hr",
      });
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        details: { conflicts },
        message: conflicts[0]?.message ?? "Leave request blocked by conflict engine.",
      });
    }

    const { data, error } = await this.supabase
      .from("hr_leave_requests")
      .insert({
        approval_status: policy.policyRules.autoApproval ? "approved" : "pending_approval",
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_id: input.employeeId,
        employment_profile_id: employmentProfileId,
        ends_on: input.endsOn,
        leave_type_id: input.leaveTypeId,
        metadata: { notes: input.notes ?? null, policy_id: policy.id, workflow_runtime_implemented: true },
        quantity,
        starts_on: input.startsOn,
        status: policy.policyRules.autoApproval ? "approved" : "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create leave request.", cause: error });
    }

    const requestId = String(data.id);
    if (policy.policyRules.autoApproval) {
      await this.balanceEngine.applyApproved(input.employeeId, input.leaveTypeId, quantity, requestId);
      await this.runtimeService.recordApprovalEvent(requestId, "approved", "Auto-approved by policy");
    }

    return { id: requestId };
  }

  async submitLeaveRequest(leaveRequestId: string): Promise<void> {
    const request = await this.getLeaveRequest(leaveRequestId);
    await this.transitionLeaveRequest(leaveRequestId, "draft", "submitted");

    await this.supabase
      .from("hr_leave_requests")
      .update({ approval_status: "pending_approval", updated_by: this.context.userId })
      .eq("id", leaveRequestId);

    await this.balanceEngine.applyPending(String(request.employee_id), String(request.leave_type_id), Number(request.quantity), leaveRequestId);
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "submitted");

    await this.notify({
      body: "A leave request was submitted for approval.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.requestSubmitted,
      idempotencyKey: `leave-submitted:${leaveRequestId}`,
      severity: "info",
      title: "Leave submitted",
    });
  }

  async withdrawLeaveRequest(leaveRequestId: string, reason?: string): Promise<void> {
    await this.transitionLeaveRequest(leaveRequestId, "submitted", "draft", ["submitted", "under_review"]);
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "withdrawn", reason);
  }

  async returnLeaveRequest(leaveRequestId: string, reason: string): Promise<void> {
    await this.transitionLeaveRequest(leaveRequestId, "submitted", "draft", ["submitted", "under_review"]);
    await this.supabase
      .from("hr_leave_requests")
      .update({ approval_status: "pending_approval", status: "draft", updated_by: this.context.userId })
      .eq("id", leaveRequestId);
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "returned", reason);
  }

  async approveLeaveRequest(leaveRequestId: string): Promise<void> {
    const request = await this.getLeaveRequest(leaveRequestId);
    if (!["submitted", "under_review"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted leave requests can be approved." });
    }

    const { error } = await this.supabase
      .from("hr_leave_requests")
      .update({ approval_status: "approved", status: "approved", updated_by: this.context.userId })
      .eq("id", leaveRequestId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve leave request.", cause: error });

    await this.balanceEngine.applyApproved(String(request.employee_id), String(request.leave_type_id), Number(request.quantity), leaveRequestId);
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "approved");

    await this.notify({
      body: "Leave request approved.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.requestApproved,
      idempotencyKey: `leave-approved:${leaveRequestId}`,
      severity: "info",
      title: "Leave approved",
    });
  }

  async rejectLeaveRequest(leaveRequestId: string, reason?: string): Promise<void> {
    const request = await this.getLeaveRequest(leaveRequestId);
    if (!["submitted", "under_review", "draft"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Leave request cannot be rejected in its current state." });
    }

    const { error } = await this.supabase
      .from("hr_leave_requests")
      .update({ approval_status: "rejected", status: "rejected", updated_by: this.context.userId })
      .eq("id", leaveRequestId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reject leave request.", cause: error });

    await this.balanceEngine.recalculateBalance(String(request.employee_id), String(request.leave_type_id));
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "rejected", reason);

    await this.notify({
      body: reason ?? "Leave request rejected.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.requestRejected,
      idempotencyKey: `leave-rejected:${leaveRequestId}`,
      severity: "warning",
      title: "Leave rejected",
    });
  }

  async cancelLeaveRequest(leaveRequestId: string): Promise<void> {
    const request = await this.getLeaveRequest(leaveRequestId);
    if (String(request.status) === "approved") {
      await this.balanceEngine.recalculateBalance(String(request.employee_id), String(request.leave_type_id));
    }
    await this.transitionLeaveRequest(leaveRequestId, String(request.status), "cancelled", ["draft", "submitted", "approved"]);
    await this.supabase
      .from("hr_leave_requests")
      .update({ approval_status: "cancelled", status: "cancelled", updated_by: this.context.userId })
      .eq("id", leaveRequestId);
    await this.runtimeService.recordApprovalEvent(leaveRequestId, "cancelled");
    await this.notify({
      body: "Leave request cancelled.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.requestCancelled,
      idempotencyKey: `leave-cancelled:${leaveRequestId}`,
      severity: "info",
      title: "Leave cancelled",
    });
  }

  async createLeaveType(input: HrLeaveTypeCreateInput): Promise<{ id: string }> {
    const paid = input.paid ?? true;
    const { data, error } = await this.supabase
      .from("hr_leave_types")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        impacts_payroll: input.impactsPayroll ?? paid,
        is_active: input.status !== "inactive",
        metadata: { leave_runtime_implemented: true },
        name: input.name,
        paid,
        requires_approval: input.requiresApproval ?? true,
        status: input.status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create leave type.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updateLeaveType(input: HrLeaveTypeUpdateInput): Promise<void> {
    const paid = input.paid ?? true;
    const { data: existing, error: readError } = await this.supabase
      .from("hr_leave_types")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.leaveTypeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Leave type not found." });
    }

    const { error } = await this.supabase
      .from("hr_leave_types")
      .update({
        code: input.code,
        impacts_payroll: input.impactsPayroll ?? paid,
        is_active: input.status !== "inactive",
        name: input.name,
        paid,
        requires_approval: input.requiresApproval ?? true,
        status: input.status,
        updated_by: this.context.userId,
      })
      .eq("id", input.leaveTypeId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update leave type.", cause: error });
    }
  }

  async archiveLeaveType(leaveTypeId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { data: existing, error: readError } = await this.supabase
      .from("hr_leave_types")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", leaveTypeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Leave type not found." });
    }

    const { error } = await this.supabase
      .from("hr_leave_types")
      .update({
        deleted_at: deletedAt,
        deleted_by: this.context.userId,
        is_active: false,
        status: "archived",
        updated_by: this.context.userId,
      })
      .eq("id", leaveTypeId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive leave type.", cause: error });
    }
  }

  async createLeavePolicy(input: HrLeavePolicyCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_leave_policies")
      .insert({
        annual_entitlement: input.annualEntitlement,
        branch_id: this.context.branchId,
        carry_forward_allowed: input.carryForwardAllowed ?? false,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        entitlement_unit: input.entitlementUnit,
        leave_type_id: input.leaveTypeId,
        metadata: { leave_calculation_runtime_implemented: true, policy_admin_runtime_implemented: true },
        policy_rules: input.policyRules ?? {},
        status: "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create leave policy.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updateLeavePolicy(input: HrLeavePolicyUpdateInput): Promise<void> {
    const { data: policy, error: readError } = await this.supabase
      .from("hr_leave_policies")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.policyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !policy) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Leave policy not found." });
    }
    if (String(policy.status) === "archived") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Archived leave policies cannot be edited." });
    }

    const { error } = await this.supabase
      .from("hr_leave_policies")
      .update({
        annual_entitlement: input.annualEntitlement,
        carry_forward_allowed: input.carryForwardAllowed ?? false,
        entitlement_unit: input.entitlementUnit,
        metadata: { leave_calculation_runtime_implemented: true, policy_admin_runtime_implemented: true },
        updated_by: this.context.userId,
      })
      .eq("id", input.policyId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update leave policy.", cause: error });
    }

    await this.notify({
      body: "A leave policy was updated.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.policyChanged,
      idempotencyKey: `policy-updated:${input.policyId}:${Date.now()}`,
      severity: "info",
      title: "Leave policy changed",
    });
  }

  async activateLeavePolicy(policyId: string): Promise<void> {
    await this.transitionLeavePolicy(policyId, ["draft", "inactive"], "active");
    await this.notify({
      body: "A leave policy was activated.",
      eventKey: HR_LEAVE_RUNTIME_EVENT_KEYS.policyChanged,
      idempotencyKey: `policy-activated:${policyId}`,
      severity: "info",
      title: "Leave policy changed",
    });
  }

  async archiveLeavePolicy(policyId: string): Promise<void> {
    await this.transitionLeavePolicy(policyId, ["draft", "active", "inactive"], "archived");
  }

  async adjustLeaveBalance(balanceId: string, availableQuantity: number): Promise<void> {
    const { data: balance } = await this.supabase
      .from("hr_leave_balances")
      .select("employee_id, leave_type_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", balanceId)
      .maybeSingle();

    const { error } = await this.supabase
      .from("hr_leave_balances")
      .update({ available_quantity: availableQuantity, metadata: { runtime_calculation_implemented: true }, updated_by: this.context.userId })
      .eq("id", balanceId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not adjust leave balance.", cause: error });

    if (balance) {
      await this.balanceEngine.writeLedgerEntry({
        balanceAfter: availableQuantity,
        balanceId,
        employeeId: String(balance.employee_id),
        leaveTypeId: String(balance.leave_type_id),
        movementKind: "manual_adjustment",
        quantity: availableQuantity,
        referenceId: balanceId,
        referenceType: "hr_leave_balances",
      });
    }
  }

  async recalculateEmployeeBalances(employeeId: string) {
    const { data: balances } = await this.supabase
      .from("hr_leave_balances")
      .select("leave_type_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null);

    const snapshots = [];
    for (const row of balances ?? []) {
      snapshots.push(await this.balanceEngine.recalculateBalance(employeeId, String(row.leave_type_id)));
    }
    return snapshots;
  }

  getRuntimeService() {
    return this.runtimeService;
  }

  private async transitionLeavePolicy(policyId: string, allowedFrom: string[], toStatus: string) {
    const { data: policy, error: readError } = await this.supabase
      .from("hr_leave_policies")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", policyId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !policy) throw new ApplicationError({ code: "NOT_FOUND", message: "Leave policy not found." });
    if (!allowedFrom.includes(String(policy.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Leave policy must be ${allowedFrom.join(" or ")} to transition.` });
    }

    const { error } = await this.supabase
      .from("hr_leave_policies")
      .update({
        metadata: { leave_calculation_runtime_implemented: true, policy_admin_runtime_implemented: true },
        status: toStatus,
        updated_by: this.context.userId,
      })
      .eq("id", policyId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update leave policy.", cause: error });
  }

  private async getLeaveRequest(leaveRequestId: string) {
    const { data, error } = await this.supabase
      .from("hr_leave_requests")
      .select("id, employee_id, leave_type_id, quantity, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", leaveRequestId)
      .single();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Leave request not found." });
    return data;
  }

  private async transitionLeaveRequest(leaveRequestId: string, fromStatus: string, toStatus: string, allowedFrom?: string[]) {
    const request = await this.getLeaveRequest(leaveRequestId);
    const validFrom = allowedFrom ?? [fromStatus];
    if (!validFrom.includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Leave request must be ${validFrom.join(" or ")} to transition.` });
    }
    const { error } = await this.supabase
      .from("hr_leave_requests")
      .update({ status: toStatus, updated_by: this.context.userId })
      .eq("id", leaveRequestId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update leave request.", cause: error });
  }
}
