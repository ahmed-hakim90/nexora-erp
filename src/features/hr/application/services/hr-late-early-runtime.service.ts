import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import {
  DEFAULT_SHIFT_END,
  DEFAULT_SHIFT_START,
  HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS,
  HR_LATE_EARLY_RUNTIME_EVENT_KEYS,
} from "../constants/hr-late-early-runtime.constants";
import type {
  HrLateEarlyPolicyAssignmentCreateInput,
  HrLateEarlyPolicyCreateInput,
  HrLateEarlyViolationOverrideInput,
} from "../schemas/hr-late-early-runtime.schema";
import { HrLateEarlyPolicyEngine } from "./hr-late-early-policy.engine";
import { HrLateEarlyValidationEngine } from "./hr-late-early-validation.engine";
import { HrLateEarlyViolationEngine } from "./hr-late-early-violation.engine";

export type LateEarlyPayrollInputSnapshot = Readonly<{
  approvedDeductionMinutes: number;
  deductionMinutes: number;
  earlyLeaveMinutes: number;
  employeeId: string;
  lateMinutes: number;
  penaltyMinutes: number;
}>;

const FROZEN_VIOLATION_STATUSES = new Set(["exported_to_payroll", "cancelled"]);

function parseTimeOnDate(isoTimestamp: string | null, workDate: string): number | null {
  if (!isoTimestamp) return null;
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  const [y, m, d] = workDate.split("-").map(Number);
  const local = new Date(Date.UTC(y, m - 1, d, date.getUTCHours(), date.getUTCMinutes(), 0));
  return local.getTime();
}

function expectedMinutesOnDate(time: string, workDate: string): number {
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = workDate.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, m ?? 0, 0)).getTime();
}

function minutesBetween(a: number, b: number): number {
  return Math.max(0, Math.round((b - a) / 60_000));
}

export class HrLateEarlyPayrollInputService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  /** Canonical late/early payroll input reader — attendance/payroll must use this only. */
  async getEmployeePayrollInputs(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<LateEarlyPayrollInputSnapshot> {
    const { data: violations } = await this.supabase
      .from("hr_late_early_violations")
      .select("late_minutes, early_leave_minutes, deduction_minutes, status, payroll_export_flag")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .in("status", ["approved", "warning_only", "exported_to_payroll"])
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .is("deleted_at", null);

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let deductionMinutes = 0;
    let approvedDeductionMinutes = 0;

    for (const row of violations ?? []) {
      lateMinutes += Number(row.late_minutes ?? 0);
      earlyLeaveMinutes += Number(row.early_leave_minutes ?? 0);
      deductionMinutes += Number(row.deduction_minutes ?? 0);
      if (["approved", "exported_to_payroll"].includes(String(row.status)) || Boolean(row.payroll_export_flag)) {
        approvedDeductionMinutes += Number(row.deduction_minutes ?? 0);
      }
    }

    return {
      approvedDeductionMinutes,
      deductionMinutes,
      earlyLeaveMinutes,
      employeeId,
      lateMinutes,
      penaltyMinutes: approvedDeductionMinutes,
    };
  }

  async countOpenViolationsOverlappingPeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "submitted")
      .gte("work_date", periodStart)
      .lte("work_date", periodEnd)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate open late/early violations.", cause: error });
    }
    return count ?? 0;
  }
}

export class HrLateEarlyRuntimeService {
  private readonly policyEngine: HrLateEarlyPolicyEngine;
  private readonly validationEngine: HrLateEarlyValidationEngine;
  private readonly violationEngine: HrLateEarlyViolationEngine;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.policyEngine = new HrLateEarlyPolicyEngine(supabase, context);
    this.validationEngine = new HrLateEarlyValidationEngine(supabase, context);
    this.violationEngine = new HrLateEarlyViolationEngine(supabase, context);
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

  private async recordApprovalEvent(violationId: string, eventKind: string, reason?: string) {
    await this.supabase.from("hr_late_early_approval_events").insert({
      actor_user_id: this.context.userId,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_kind: eventKind,
      metadata: { runtime_implemented: true },
      reason: reason ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      violation_id: violationId,
    });
  }

  async createPolicy(input: HrLateEarlyPolicyCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_late_early_policies")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        daily_limit_minutes: input.dailyLimitMinutes ?? null,
        early_leave_threshold_minutes: input.earlyLeaveThresholdMinutes,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        grace_minutes: input.graceMinutes,
        late_threshold_minutes: input.lateThresholdMinutes,
        metadata: { runtime_implemented: true },
        monthly_limit_minutes: input.monthlyLimitMinutes ?? null,
        name: input.name,
        policy_rules: { deductionMethod: input.deductionMethod ?? "minutes", runtime_implemented: true },
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        weekly_limit_minutes: input.weeklyLimitMinutes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create late/early policy.", cause: error });

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.policyCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_late_early_policies",
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async createPolicyAssignment(input: HrLateEarlyPolicyAssignmentCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_late_early_policy_assignments")
      .insert({
        assignment_scope: input.assignmentScope,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        metadata: { runtime_implemented: true },
        policy_id: input.policyId,
        reference_entity_id: input.referenceEntityId ?? null,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create late/early policy assignment.", cause: error });
    }

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.policyAssignmentCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_late_early_policy_assignments",
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async evaluateAttendanceDay(input: {
    attendanceDayId: string;
    employeeId: string;
    firstInAt: string | null;
    lastOutAt: string | null;
    missingIn: boolean;
    missingOut: boolean;
    workDate: string;
  }): Promise<void> {
    if (input.missingIn && input.missingOut) return;

    const conflicts = await this.validationEngine.detectConflicts({
      attendanceDayId: input.attendanceDayId,
      employeeId: input.employeeId,
      workDate: input.workDate,
    });
    if (conflicts.some((issue) => ["inactive_employee", "payroll_locked", "attendance_exported", "violation_exported"].includes(issue.code))) {
      return;
    }

    const policy = await this.policyEngine.resolveActivePolicy({ employeeId: input.employeeId, workDate: input.workDate });
    const rules = policy.policyRules;
    const shiftWindow = await this.policyEngine.resolveExpectedShiftWindow({
      employeeId: input.employeeId,
      policyRules: rules,
      workDate: input.workDate,
    });
    const shiftStart = shiftWindow.shiftStart ?? DEFAULT_SHIFT_START;
    const shiftEnd = shiftWindow.shiftEnd ?? DEFAULT_SHIFT_END;

    const expectedIn = expectedMinutesOnDate(shiftStart, input.workDate);
    const expectedOut = expectedMinutesOnDate(shiftEnd, input.workDate);
    const actualIn = parseTimeOnDate(input.firstInAt, input.workDate);
    const actualOut = parseTimeOnDate(input.lastOutAt, input.workDate);

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;

    if (actualIn != null && !input.missingIn) {
      const rawLate = minutesBetween(expectedIn + policy.graceMinutes * 60_000, actualIn);
      if (rawLate >= policy.lateThresholdMinutes) lateMinutes = this.policyEngine.applyRounding(rawLate, rules);
    }

    if (actualOut != null && !input.missingOut) {
      const rawEarly = minutesBetween(actualOut, expectedOut - policy.graceMinutes * 60_000);
      if (rawEarly >= policy.earlyLeaveThresholdMinutes) earlyLeaveMinutes = this.policyEngine.applyRounding(rawEarly, rules);
    }

    const { data: existing } = await this.supabase
      .from("hr_late_early_violations")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_day_id", input.attendanceDayId)
      .is("deleted_at", null)
      .maybeSingle();

    if (lateMinutes <= 0 && earlyLeaveMinutes <= 0) {
      if (existing && !FROZEN_VIOLATION_STATUSES.has(String(existing.status))) {
        await this.supabase
          .from("hr_late_early_violations")
          .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, status: "cancelled", updated_by: this.context.userId })
          .eq("id", existing.id);
      }
      return;
    }

    if (existing && FROZEN_VIOLATION_STATUSES.has(String(existing.status))) return;

    let violationKind = lateMinutes > 0 ? "late" : "early_leave";
    const pattern = await this.violationEngine.detectPatterns({
      employeeId: input.employeeId,
      violationKind: lateMinutes > 0 ? "late" : "early_leave",
      workDate: input.workDate,
    });
    if (pattern) {
      violationKind = pattern;
    } else if (lateMinutes >= (rules.criticalDelayMinutes ?? 120)) {
      violationKind = "critical_delay";
    } else if (lateMinutes >= (rules.criticalDelayMinutes ?? 60) * 0.75) {
      violationKind = "excessive_delay";
    }

    const deductionMinutes = this.policyEngine.computeDeductionMinutes({
      deductionMethod: rules.deductionMethod,
      earlyLeaveMinutes,
      lateMinutes,
      noDeduction: rules.noDeduction,
      shiftDurationMinutes: shiftWindow.shiftDurationMinutes,
    });

    const aggregated = await this.policyEngine.aggregateLedgerMinutes({
      employeeId: input.employeeId,
      workDate: input.workDate,
    });
    const exceededScope = this.policyEngine.checkPeriodLimits({
      aggregated,
      policy,
      proposedDeductionMinutes: deductionMinutes,
    });

    const status = exceededScope
      ? "submitted"
      : rules.warningOnly
        ? "warning_only"
        : rules.autoApproval
          ? "approved"
          : "submitted";

    const evaluationPayload = {
      expected_shift_end: shiftEnd,
      expected_shift_start: shiftStart,
      first_in_at: input.firstInAt,
      last_out_at: input.lastOutAt,
      limit_exceeded_scope: exceededScope,
      policy_id: policy.id,
      shift_duration_minutes: shiftWindow.shiftDurationMinutes,
    };

    if (existing) {
      await this.supabase
        .from("hr_late_early_violations")
        .update({
          deduction_minutes: deductionMinutes,
          early_leave_minutes: earlyLeaveMinutes,
          evaluation_payload: evaluationPayload,
          grace_applied_minutes: policy.graceMinutes,
          late_minutes: lateMinutes,
          payroll_export_flag: status === "approved",
          policy_id: policy.id === "default" ? null : policy.id,
          status,
          updated_by: this.context.userId,
          violation_kind: violationKind,
        })
        .eq("id", existing.id);

      await this.supabase.from("hr_late_early_violation_ledger").insert({
        as_of_date: input.workDate,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        deduction_minutes_delta: deductionMinutes,
        early_leave_minutes_delta: earlyLeaveMinutes,
        employee_id: input.employeeId,
        late_minutes_delta: lateMinutes,
        movement_kind: "recalculation",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        violation_id: String(existing.id),
      });

      await this.recordApprovalEvent(String(existing.id), "evaluated", exceededScope ? `${exceededScope} limit exceeded` : undefined);
      return;
    }

    const { data: violation, error } = await this.supabase
      .from("hr_late_early_violations")
      .insert({
        attendance_day_id: input.attendanceDayId,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        deduction_minutes: deductionMinutes,
        early_leave_minutes: earlyLeaveMinutes,
        employee_id: input.employeeId,
        evaluation_payload: evaluationPayload,
        grace_applied_minutes: policy.graceMinutes,
        late_minutes: lateMinutes,
        metadata: { runtime_implemented: true },
        payroll_export_flag: status === "approved",
        policy_id: policy.id === "default" ? null : policy.id,
        status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        violation_kind: violationKind,
        work_date: input.workDate,
      })
      .select("id")
      .single();

    if (error || !violation) return;

    const violationId = String(violation.id);

    await this.supabase.from("hr_late_early_violation_ledger").insert({
      as_of_date: input.workDate,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      deduction_minutes_delta: deductionMinutes,
      early_leave_minutes_delta: earlyLeaveMinutes,
      employee_id: input.employeeId,
      late_minutes_delta: lateMinutes,
      movement_kind: "evaluation",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      violation_id: violationId,
    });

    await this.recordApprovalEvent(violationId, "evaluated", exceededScope ? `${exceededScope} limit exceeded` : undefined);

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.evaluationExecuted,
      category: "data-access",
      context: this.context,
      entityId: violationId,
      entityType: "hr_late_early_violations",
      module: "hr",
    });

    if (status === "submitted") {
      await this.notify({
        body: `Late/early violation detected for ${input.workDate}.`,
        eventKey: HR_LATE_EARLY_RUNTIME_EVENT_KEYS.violationThreshold,
        idempotencyKey: `late-early-violation:${violationId}`,
        severity: "warning",
        title: "Late/Early violation",
      });
    }
  }

  async approveViolation(violationId: string, reason?: string): Promise<void> {
    const violation = await this.getViolation(violationId);
    if (!["submitted", "warning_only"].includes(String(violation.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Violation cannot be approved in current state." });
    }

    await this.supabase
      .from("hr_late_early_violations")
      .update({ payroll_export_flag: true, status: "approved", updated_by: this.context.userId })
      .eq("id", violationId)
      .eq("tenant_id", this.context.tenantId);

    await this.recordApprovalEvent(violationId, "approved", reason);

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationApproved,
      category: "data-access",
      context: this.context,
      entityId: violationId,
      entityType: "hr_late_early_violations",
      module: "hr",
    });

    await this.notify({
      body: "Late/early violation approved.",
      eventKey: HR_LATE_EARLY_RUNTIME_EVENT_KEYS.violationApproved,
      idempotencyKey: `late-early-approved:${violationId}`,
      severity: "info",
      title: "Late/Early approved",
    });
  }

  async rejectViolation(violationId: string, reason: string): Promise<void> {
    const violation = await this.getViolation(violationId);
    if (!["submitted", "warning_only", "approved"].includes(String(violation.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Violation cannot be rejected in current state." });
    }

    await this.supabase
      .from("hr_late_early_violations")
      .update({ payroll_export_flag: false, status: "rejected", updated_by: this.context.userId })
      .eq("id", violationId)
      .eq("tenant_id", this.context.tenantId);

    await this.recordApprovalEvent(violationId, "rejected", reason);

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationRejected,
      category: "data-access",
      context: this.context,
      entityId: violationId,
      entityType: "hr_late_early_violations",
      module: "hr",
    });

    await this.notify({
      body: `Late/early violation rejected: ${reason}`,
      eventKey: HR_LATE_EARLY_RUNTIME_EVENT_KEYS.violationRejected,
      idempotencyKey: `late-early-rejected:${violationId}`,
      severity: "warning",
      title: "Late/Early rejected",
    });
  }

  async cancelViolation(violationId: string, reason: string): Promise<void> {
    const violation = await this.getViolation(violationId);
    if (FROZEN_VIOLATION_STATUSES.has(String(violation.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Exported violations cannot be cancelled." });
    }

    await this.supabase
      .from("hr_late_early_violations")
      .update({ payroll_export_flag: false, status: "cancelled", updated_by: this.context.userId })
      .eq("id", violationId)
      .eq("tenant_id", this.context.tenantId);

    await this.recordApprovalEvent(violationId, "cancelled", reason);

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationCancelled,
      category: "data-access",
      context: this.context,
      entityId: violationId,
      entityType: "hr_late_early_violations",
      module: "hr",
    });
  }

  async overrideViolation(input: HrLateEarlyViolationOverrideInput): Promise<void> {
    const violation = await this.getViolation(input.violationId);
    if (String(violation.status) === "exported_to_payroll") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Exported violations cannot be overridden." });
    }

    await this.supabase
      .from("hr_late_early_violations")
      .update({
        deduction_minutes: input.deductionMinutes,
        early_leave_minutes: input.earlyLeaveMinutes,
        late_minutes: input.lateMinutes,
        metadata: { overridden: true, runtime_implemented: true },
        status: input.status ?? String(violation.status),
        updated_by: this.context.userId,
      })
      .eq("id", input.violationId)
      .eq("tenant_id", this.context.tenantId);

    await this.supabase.from("hr_late_early_violation_ledger").insert({
      as_of_date: String(violation.work_date),
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      deduction_minutes_delta: input.deductionMinutes - Number(violation.deduction_minutes ?? 0),
      early_leave_minutes_delta: input.earlyLeaveMinutes - Number(violation.early_leave_minutes ?? 0),
      employee_id: String(violation.employee_id),
      late_minutes_delta: input.lateMinutes - Number(violation.late_minutes ?? 0),
      movement_kind: "override",
      metadata: { reason: input.reason },
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      violation_id: input.violationId,
    });

    await this.recordApprovalEvent(input.violationId, "overridden", input.reason);

    await recordAuditEvent({
      action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationOverridden,
      category: "data-access",
      context: this.context,
      entityId: input.violationId,
      entityType: "hr_late_early_violations",
      module: "hr",
    });
  }

  async markViolationsExportedForPeriod(input: {
    batchId: string;
    employeeIds: readonly string[];
    periodEnd: string;
    periodStart: string;
  }): Promise<number> {
    if (input.employeeIds.length === 0) return 0;

    const { data: violations, error } = await this.supabase
      .from("hr_late_early_violations")
      .select("id, employee_id, work_date")
      .eq("tenant_id", this.context.tenantId)
      .in("employee_id", [...input.employeeIds])
      .eq("status", "approved")
      .gte("work_date", input.periodStart)
      .lte("work_date", input.periodEnd)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not export late/early violations.", cause: error });
    }

    let exportedCount = 0;
    for (const row of violations ?? []) {
      const violationId = String(row.id);
      await this.supabase
        .from("hr_late_early_violations")
        .update({
          metadata: { export_batch_id: input.batchId, runtime_implemented: true },
          payroll_export_flag: true,
          status: "exported_to_payroll",
          updated_by: this.context.userId,
        })
        .eq("id", violationId)
        .eq("tenant_id", this.context.tenantId);

      await this.recordApprovalEvent(violationId, "exported_to_payroll", `Export batch ${input.batchId}`);

      await recordAuditEvent({
        action: HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationExported,
        category: "data-access",
        context: this.context,
        entityId: violationId,
        entityType: "hr_late_early_violations",
        metadata: { batchId: input.batchId },
        module: "hr",
      });
      exportedCount += 1;
    }

    return exportedCount;
  }

  async getDashboardMetrics(managerEmployeeIds?: readonly string[]): Promise<{
    pendingApprovals: number;
    repeatedViolations: number;
    todayEarlyLeave: number;
    todayLate: number;
  }> {
    const today = new Date().toISOString().slice(0, 10);

    let todayLateQuery = this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("work_date", today)
      .gt("late_minutes", 0)
      .is("deleted_at", null);
    let todayEarlyQuery = this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("work_date", today)
      .gt("early_leave_minutes", 0)
      .is("deleted_at", null);
    let pendingQuery = this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("status", "submitted")
      .is("deleted_at", null);
    let repeatedQuery = this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .in("violation_kind", ["repeated_late", "repeated_early", "habitual_late", "habitual_early"])
      .is("deleted_at", null);

    if (managerEmployeeIds && managerEmployeeIds.length > 0) {
      todayLateQuery = todayLateQuery.in("employee_id", [...managerEmployeeIds]);
      todayEarlyQuery = todayEarlyQuery.in("employee_id", [...managerEmployeeIds]);
      pendingQuery = pendingQuery.in("employee_id", [...managerEmployeeIds]);
      repeatedQuery = repeatedQuery.in("employee_id", [...managerEmployeeIds]);
    }

    const [todayLate, todayEarly, pending, repeated] = await Promise.all([
      todayLateQuery,
      todayEarlyQuery,
      pendingQuery,
      repeatedQuery,
    ]);

    return {
      pendingApprovals: pending.count ?? 0,
      repeatedViolations: repeated.count ?? 0,
      todayEarlyLeave: todayEarly.count ?? 0,
      todayLate: todayLate.count ?? 0,
    };
  }

  private async getViolation(violationId: string) {
    const { data, error } = await this.supabase
      .from("hr_late_early_violations")
      .select("id, status, work_date, employee_id, late_minutes, early_leave_minutes, deduction_minutes")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", violationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Late/early violation not found." });
    return data;
  }
}
