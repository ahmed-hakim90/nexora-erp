import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import {
  HR_OVERTIME_RUNTIME_AUDIT_ACTIONS,
  HR_OVERTIME_RUNTIME_EVENT_KEYS,
  STANDARD_WORK_MINUTES,
} from "../constants/hr-overtime-runtime.constants";
import type {
  HrOvertimeCandidateActionInput,
  HrOvertimeCreateInput,
  HrOvertimePolicyCreateInput,
} from "../schemas/hr-overtime-runtime.schema";
import { HrOvertimePolicyEngine } from "./hr-overtime-policy.engine";
import { HrOvertimeValidationEngine } from "./hr-overtime-validation.engine";

export type OvertimePayrollInputSnapshot = Readonly<{
  byType: Readonly<Record<string, number>>;
  employeeId: string;
  overtimeHours: number;
  payrollEligibleHours: number;
}>;

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export class HrOvertimePayrollInputService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  /** Canonical overtime payroll input reader — attendance/payroll must use this only. */
  async getEmployeePayrollInputs(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<OvertimePayrollInputSnapshot> {
    const { data: requests } = await this.supabase
      .from("hr_overtime_requests")
      .select("duration_minutes, hours, overtime_type, payroll_eligible, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .is("deleted_at", null);

    const byType: Record<string, number> = {};
    let totalMinutes = 0;
    let payrollEligibleMinutes = 0;

    for (const row of requests ?? []) {
      const minutes = Number(row.duration_minutes ?? 0) || Math.round(Number(row.hours ?? 0) * 60);
      const type = String(row.overtime_type ?? "normal");
      byType[type] = (byType[type] ?? 0) + minutesToHours(minutes);
      totalMinutes += minutes;
      if (Boolean(row.payroll_eligible ?? true)) payrollEligibleMinutes += minutes;
    }

    const { data: approvedCandidates } = await this.supabase
      .from("hr_overtime_candidates")
      .select("candidate_minutes, overtime_type")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "approved")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .is("deleted_at", null)
      .is("overtime_request_id", null);

    for (const row of approvedCandidates ?? []) {
      const minutes = Number(row.candidate_minutes ?? 0);
      const type = String(row.overtime_type ?? "normal");
      byType[type] = (byType[type] ?? 0) + minutesToHours(minutes);
      totalMinutes += minutes;
      payrollEligibleMinutes += minutes;
    }

    return {
      byType,
      employeeId,
      overtimeHours: minutesToHours(totalMinutes),
      payrollEligibleHours: minutesToHours(payrollEligibleMinutes),
    };
  }

  async countOpenOvertimeOverlappingPeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("hr_overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .in("status", ["submitted", "under_review"])
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate open overtime requests.", cause: error });
    }
    return count ?? 0;
  }
}

export class HrOvertimeRuntimeService {
  private readonly policyEngine: HrOvertimePolicyEngine;
  private readonly validationEngine: HrOvertimeValidationEngine;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.policyEngine = new HrOvertimePolicyEngine(supabase, context);
    this.validationEngine = new HrOvertimeValidationEngine(supabase, context);
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

  async recordApprovalEvent(overtimeRequestId: string, eventKind: string, reason?: string, approvalLevel = 1) {
    await this.supabase.from("hr_overtime_approval_events").insert({
      actor_user_id: this.context.userId,
      approval_level: approvalLevel,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_kind: eventKind,
      metadata: { runtime_implemented: true },
      overtime_request_id: overtimeRequestId,
      reason: reason ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
  }

  async createPolicy(input: HrOvertimePolicyCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_overtime_policies")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        daily_limit_minutes: input.dailyLimitMinutes ?? null,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        metadata: { runtime_implemented: true },
        monthly_limit_minutes: input.monthlyLimitMinutes ?? null,
        name: input.name,
        overtime_type: input.overtimeType,
        policy_rules: { runtime_implemented: true },
        rate_multiplier: input.rateMultiplier,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        weekly_limit_minutes: input.weeklyLimitMinutes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create overtime policy.", cause: error });

    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.policyCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_overtime_policies",
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async createRequest(input: HrOvertimeCreateInput, submit = true): Promise<{ id: string }> {
    const durationMinutes =
      input.durationMinutes ?? (input.hours != null ? Math.round(input.hours * 60) : 0);
    if (durationMinutes <= 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime duration is required." });
    }

    const overtimeType = input.overtimeType || this.policyEngine.resolveOvertimeTypeForDate(input.workDate);
    const policy = await this.policyEngine.resolveActivePolicy({ overtimeType, workDate: input.workDate });

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("status, hire_date")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.employeeId)
      .maybeSingle();

    this.policyEngine.validateRequestAgainstPolicy({
      durationMinutes,
      employeeHireDate: employee?.hire_date ? String(employee.hire_date) : null,
      employeeOnProbation: String(employee?.status) === "probation",
      policy,
    });

    const conflicts = await this.validationEngine.detectConflicts({
      attendanceDayId: input.attendanceDayId,
      durationMinutes,
      employeeId: input.employeeId,
      overtimeType,
      workDate: input.workDate,
    });

    if (conflicts.length > 0) {
      await recordAuditEvent({
        action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestConflictBlocked,
        category: "data-access",
        context: this.context,
        entityType: "hr_overtime_requests",
        metadata: { conflicts: conflicts.map((issue) => issue.code) },
        module: "hr",
      });
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: conflicts[0]?.message ?? "Overtime request has conflicts.",
      });
    }

    const status = submit ? (policy.policyRules.autoApproval ? "approved" : "submitted") : "draft";

    const { data, error } = await this.supabase
      .from("hr_overtime_requests")
      .insert({
        attachment_ref: input.attachmentRef ?? null,
        attendance_day_id: input.attendanceDayId ?? null,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        compensation_type: input.compensationType,
        cost_center: input.costCenter ?? null,
        created_by: this.context.userId,
        duration_minutes: durationMinutes,
        employee_id: input.employeeId,
        end_time: input.endTime ?? null,
        hours: durationMinutes / 60,
        metadata: { runtime_implemented: true, payroll_ready: true },
        overtime_type: overtimeType,
        payroll_eligible: input.payrollEligible,
        priority: input.priority,
        project_ref: input.projectRef ?? null,
        rate_multiplier: input.rateMultiplier ?? policy.rateMultiplier,
        reason: input.reason ?? "",
        shift_id: input.shiftId ?? null,
        start_time: input.startTime ?? null,
        status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        work_date: input.workDate,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create overtime request.", cause: error });

    const requestId = String(data.id);

    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestCreated,
      category: "data-access",
      context: this.context,
      entityId: requestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });

    if (submit) {
      await this.recordApprovalEvent(requestId, "submitted");
      if (status === "approved") {
        await this.recordApprovalEvent(requestId, "approved", "Auto-approved by policy");
      } else {
        await this.notify({
          body: "A new overtime request requires approval.",
          eventKey: HR_OVERTIME_RUNTIME_EVENT_KEYS.requestSubmitted,
          idempotencyKey: `overtime-submitted:${requestId}`,
          severity: "info",
          title: "Overtime submitted",
        });
      }
    }

    return { id: requestId };
  }

  async submitRequest(overtimeRequestId: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (String(request.status) !== "draft") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only draft requests can be submitted." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "submitted", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "submitted");
    await this.notify({
      body: "Overtime request submitted for approval.",
      eventKey: HR_OVERTIME_RUNTIME_EVENT_KEYS.requestSubmitted,
      idempotencyKey: `overtime-submitted:${overtimeRequestId}`,
      severity: "info",
      title: "Overtime submitted",
    });
  }

  async approveRequest(overtimeRequestId: string, reason?: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (!["submitted", "under_review", "returned"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime request cannot be approved in current state." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "approved", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "approved", reason);
    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestApproved,
      category: "data-access",
      context: this.context,
      entityId: overtimeRequestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });
    await this.notify({
      body: "Overtime request approved.",
      eventKey: HR_OVERTIME_RUNTIME_EVENT_KEYS.requestApproved,
      idempotencyKey: `overtime-approved:${overtimeRequestId}`,
      severity: "info",
      title: "Overtime approved",
    });
  }

  async rejectRequest(overtimeRequestId: string, reason: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (!["submitted", "under_review", "returned"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime request cannot be rejected in current state." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "rejected", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "rejected", reason);
    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestRejected,
      category: "data-access",
      context: this.context,
      entityId: overtimeRequestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });
  }

  async cancelRequest(overtimeRequestId: string, reason?: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (["approved", "paid", "cancelled"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime request cannot be cancelled in current state." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "cancelled", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "cancelled", reason);
    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestCancelled,
      category: "data-access",
      context: this.context,
      entityId: overtimeRequestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });
  }

  async withdrawRequest(overtimeRequestId: string, reason?: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (!["submitted", "under_review", "returned"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime request cannot be withdrawn in current state." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "withdrawn", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "withdrawn", reason);
    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestWithdrawn,
      category: "data-access",
      context: this.context,
      entityId: overtimeRequestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });
  }

  async returnRequest(overtimeRequestId: string, reason: string): Promise<void> {
    const request = await this.getRequest(overtimeRequestId);
    if (!["submitted", "under_review"].includes(String(request.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime request cannot be returned in current state." });
    }
    await this.supabase
      .from("hr_overtime_requests")
      .update({ status: "returned", updated_by: this.context.userId })
      .eq("id", overtimeRequestId);
    await this.recordApprovalEvent(overtimeRequestId, "returned", reason);
    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.requestReturned,
      category: "data-access",
      context: this.context,
      entityId: overtimeRequestId,
      entityType: "hr_overtime_requests",
      module: "hr",
    });
  }

  async syncCandidateFromAttendance(input: {
    attendanceDayId: string;
    employeeId: string;
    employmentProfileId: string;
    overtimeMinutes: number;
    workDate: string;
    workedMinutes: number;
  }): Promise<void> {
    if (input.overtimeMinutes <= 0) return;

    const overtimeType = this.policyEngine.resolveOvertimeTypeForDate(input.workDate);
    const policy = await this.policyEngine.resolveActivePolicy({ overtimeType, workDate: input.workDate });

    const { data: existing } = await this.supabase
      .from("hr_overtime_candidates")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_day_id", input.attendanceDayId)
      .in("status", ["pending", "approved", "converted"])
      .is("deleted_at", null)
      .maybeSingle();

    const candidatePayload = {
      attendance_day_id: input.attendanceDayId,
      branch_id: this.context.branchId,
      candidate_minutes: input.overtimeMinutes,
      company_id: this.context.companyId,
      employee_id: input.employeeId,
      metadata: { runtime_implemented: true, worked_minutes: input.workedMinutes },
      overtime_type: overtimeType,
      status: policy.policyRules.autoApproval ? "approved" : "pending",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      work_date: input.workDate,
    };

    if (existing) {
      await this.supabase.from("hr_overtime_candidates").update(candidatePayload).eq("id", existing.id);
    } else {
      await this.supabase.from("hr_overtime_candidates").insert({
        ...candidatePayload,
        created_by: this.context.userId,
      });
    }

    if (policy.policyRules.preApprovalRequired && !policy.policyRules.autoApproval) {
      const { count } = await this.supabase
        .from("hr_attendance_exceptions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", input.employeeId)
        .eq("attendance_day_id", input.attendanceDayId)
        .eq("exception_type", "overtime_requires_approval")
        .eq("status", "open")
        .is("deleted_at", null);

      if ((count ?? 0) === 0) {
        await this.supabase.from("hr_attendance_exceptions").insert({
          attendance_day_id: input.attendanceDayId,
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          employee_id: input.employeeId,
          employment_profile_id: input.employmentProfileId,
          exception_type: "overtime_requires_approval",
          metadata: { candidate_minutes: input.overtimeMinutes, runtime_implemented: true },
          source: "attendance_runtime",
          status: "open",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        });

        await this.notify({
          body: `Overtime of ${input.overtimeMinutes} minutes requires approval for ${input.workDate}.`,
          eventKey: HR_OVERTIME_RUNTIME_EVENT_KEYS.candidatePending,
          idempotencyKey: `overtime-candidate:${input.attendanceDayId}`,
          severity: "warning",
          title: "Overtime approval required",
        });
      }
    }
  }

  async resolveOvertimeCandidate(input: HrOvertimeCandidateActionInput): Promise<{ requestId?: string }> {
    const { data: candidate, error } = await this.supabase
      .from("hr_overtime_candidates")
      .select("id, employee_id, work_date, candidate_minutes, overtime_type, attendance_day_id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.candidateId)
      .maybeSingle();

    if (error || !candidate) throw new ApplicationError({ code: "NOT_FOUND", message: "Overtime candidate not found." });
    if (String(candidate.status) !== "pending") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Candidate is not pending resolution." });
    }

    if (input.action === "ignore") {
      await this.supabase
        .from("hr_overtime_candidates")
        .update({ status: "ignored", updated_by: this.context.userId })
        .eq("id", input.candidateId);
      await recordAuditEvent({
        action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.candidateResolved,
        category: "data-access",
        context: this.context,
        entityId: input.candidateId,
        entityType: "hr_overtime_candidates",
        metadata: { action: "ignore" },
        module: "hr",
      });
      return {};
    }

    if (input.action === "reject") {
      await this.supabase
        .from("hr_overtime_candidates")
        .update({ status: "rejected", updated_by: this.context.userId })
        .eq("id", input.candidateId);
      await recordAuditEvent({
        action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.candidateResolved,
        category: "data-access",
        context: this.context,
        entityId: input.candidateId,
        entityType: "hr_overtime_candidates",
        metadata: { action: "reject" },
        module: "hr",
      });
      return {};
    }

    if (input.action === "approve") {
      await this.supabase
        .from("hr_overtime_candidates")
        .update({ status: "approved", updated_by: this.context.userId })
        .eq("id", input.candidateId);
      await recordAuditEvent({
        action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.candidateResolved,
        category: "data-access",
        context: this.context,
        entityId: input.candidateId,
        entityType: "hr_overtime_candidates",
        metadata: { action: "approve" },
        module: "hr",
      });
      return {};
    }

    const created = await this.createRequest(
      {
        attendanceDayId: String(candidate.attendance_day_id),
        compensationType: "pay",
        durationMinutes: Number(candidate.candidate_minutes),
        employeeId: String(candidate.employee_id),
        overtimeType: String(candidate.overtime_type) as HrOvertimeCreateInput["overtimeType"],
        payrollEligible: true,
        priority: 50,
        rateMultiplier: 1.5,
        reason: input.reason ?? "Converted from attendance candidate",
        workDate: String(candidate.work_date),
      },
      true,
    );

    await this.supabase
      .from("hr_overtime_candidates")
      .update({
        overtime_request_id: created.id,
        status: "converted",
        updated_by: this.context.userId,
      })
      .eq("id", input.candidateId);

    await recordAuditEvent({
      action: HR_OVERTIME_RUNTIME_AUDIT_ACTIONS.candidateResolved,
      category: "data-access",
      context: this.context,
      entityId: input.candidateId,
      entityType: "hr_overtime_candidates",
      metadata: { action: "convert", requestId: created.id },
      module: "hr",
    });

    return { requestId: created.id };
  }

  async getDashboardMetrics() {
    const today = new Date().toISOString().slice(0, 10);

    const [pending, candidates, approvedToday, policies] = await Promise.all([
      this.supabase
        .from("hr_overtime_requests")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .in("status", ["submitted", "under_review"])
        .is("deleted_at", null),
      this.supabase
        .from("hr_overtime_candidates")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("status", "pending")
        .is("deleted_at", null),
      this.supabase
        .from("hr_overtime_requests")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("status", "approved")
        .eq("work_date", today)
        .is("deleted_at", null),
      this.supabase
        .from("hr_overtime_policies")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("status", "active")
        .is("deleted_at", null),
    ]);

    return {
      activePolicies: policies.count ?? 0,
      approvedToday: approvedToday.count ?? 0,
      pendingApprovals: pending.count ?? 0,
      pendingCandidates: candidates.count ?? 0,
    };
  }

  private async getRequest(overtimeRequestId: string) {
    const { data, error } = await this.supabase
      .from("hr_overtime_requests")
      .select("id, status, employee_id, work_date")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", overtimeRequestId)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Overtime request not found." });
    return data;
  }

  static calculateOvertimeMinutes(workedMinutes: number, standardMinutes = STANDARD_WORK_MINUTES): number {
    return Math.max(0, workedMinutes - standardMinutes);
  }
}
