import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { hasServerPermission, requirePermission } from "@/platform/permissions/server";

import { HrAssignmentResolverService } from "../../application/services/hr-assignment-resolver.service";
import { HrEmployeeCompensationService } from "../../application/services/hr-employee-compensation.service";
import { HrEmployeeHireReadinessService, type HrEmployeeHireReadiness } from "../../application/services/hr-employee-hire-readiness.service";
import type { HrEmployeeAssignmentSnapshot, HrTimelineEntry } from "../../application/types/hr-ui.types";
import type { HrEmployeeDocumentCompliance } from "../../application/utils/hr-document-compliance.evaluate";
import { formatHrDisplayLabel, formatHrStatusLabel, readContactField } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrEmployeeProfileData = Readonly<{
  employee: Readonly<{
    id: string;
    employeeNumber: string;
    fullName: string;
    status: string;
    nationalId: string | null;
    birthDate: string | null;
    gender: string | null;
    nationality: string | null;
    maritalStatus: string | null;
    email: string | null;
    phone: string | null;
    branchLabel: string | null;
  }>;
  assignment: HrEmployeeAssignmentSnapshot;
  contracts: readonly { id: string; contractNumber: string; status: string; startsOn: string; endsOn: string | null }[];
  timeline: readonly HrTimelineEntry[];
  leaveBalanceSummary: readonly { label: string; value: string }[];
  leaveRuntime: Readonly<{
    approvalTimeline: readonly { action: string; actorLabel: string; id: string; occurredAt: string }[];
    balances: readonly {
      available: number;
      carriedForward: number;
      consumed: number;
      leaveType: string;
      pending: number;
      projected: number;
    }[];
    encashments: readonly { id: string; quantity: number; status: string }[];
    ledger: readonly { asOfDate: string; balanceAfter: number; id: string; movementKind: string; quantity: number }[];
    policies: readonly { annualEntitlement: number; leaveType: string; status: string }[];
    requests: readonly { endsOn: string; id: string; leaveType: string; startsOn: string; status: string }[];
  }>;
  overtimeRuntime: Readonly<{
    approvalTimeline: readonly { action: string; actorLabel: string; id: string; occurredAt: string }[];
    candidates: readonly { id: string; minutes: number; status: string; workDate: string }[];
    requests: readonly { durationMinutes: number; id: string; overtimeType: string; status: string; workDate: string }[];
  }>;
  lateEarlyRuntime: Readonly<{
    approvalTimeline: readonly { action: string; id: string; occurredAt: string }[];
    monthlyLateMinutes: number;
    monthlyEarlyMinutes: number;
    pendingViolations: number;
    policyName: string;
    violations: readonly {
      deductionMinutes: number;
      earlyLeaveMinutes: number;
      id: string;
      lateMinutes: number;
      status: string;
      violationKind: string;
      workDate: string;
    }[];
  }>;
  payrollReadiness: readonly { label: string; status: string }[];
  pendingActions: readonly { id: string; label: string; status: string }[];
  alerts: readonly { id: string; label: string; severity: "info" | "warning" | "error" }[];
  documentCompliance: HrEmployeeDocumentCompliance;
  canManageDocumentWaivers: boolean;
  documents: readonly { id: string; fileName: string; documentType: string; expiresOn: string | null; status: string }[];
  custodyItems: readonly { id: string; assetLabel: string; assetType: string; status: string; effectiveDate: string }[];
  skillRecords: readonly { id: string; skillName: string; status: string; effectiveFrom: string }[];
  skillOptions: readonly { id: string; label: string }[];
  financialSummary: Readonly<{ activeAdvances: number; activeLoans: number; pendingBonuses: number }>;
  compensation: Readonly<{
    basicSalaryFromPackage: number | null;
    basicSalaryOverride: number | null;
    basicSalarySource: "profile" | "package" | null;
    canEdit: boolean;
    conflictMessage: string | null;
    employmentProfileId: string | null;
    hasConflict: boolean;
    hourlyRate: number | null;
    missingCompensation: boolean;
    packageAllowanceTotal: number;
    packageLines: readonly {
      amount: number;
      categoryKey: string;
      code: string;
      name: string;
      source: "package" | "profile";
    }[];
    resolvedBasicSalary: number | null;
    resolvedMonthlyTotal: number;
    salaryPackageLabel: string | null;
  }>;
  hireReadiness: HrEmployeeHireReadiness;
}>;

export async function loadHrEmployeeProfile(employeeId: string): Promise<HrEmployeeProfileData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: employee, error } = await supabase
    .from("hr_employees")
    .select("id, employee_number, full_name, status, national_id, birth_date, gender, nationality, marital_status, contact_info, branch_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employee profile.", cause: error });
  }
  if (!employee) {
    throw new ApplicationError({ code: "NOT_FOUND", message: "Employee not found." });
  }

  const resolver = new HrAssignmentResolverService(supabase, context);
  const assignment = await resolver.resolveEmployeeAssignments(employeeId);
  const compensationService = new HrEmployeeCompensationService(supabase, context);
  const [compensationResolution, canEditCompensation, canManageDocumentWaivers] = await Promise.all([
    compensationService.resolveEmployeeCompensation({ employeeId }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.compensationOverridesManage }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.employeesManage }),
  ]);
  const documentCompliance = await new HrEmployeeDocumentComplianceService(supabase, context).evaluateEmployee(employeeId);

  const [contractsResult, timelineResult, leaveResult, leaveRequestsResult, leaveLedgerResult, leaveEncashmentResult, leavePoliciesResult, overtimeRequestsResult, overtimeCandidatesResult, lateEarlyViolationsResult, lateEarlyPoliciesResult, actionsResult, validationResult, documentsResult, custodyResult, skillsResult, advancesResult, loansResult, bonusesResult, allSkillsResult] = await Promise.all([
    supabase
      .from("hr_contracts")
      .select("id, contract_number, status, starts_on, ends_on")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false }),
    supabase
      .from("hr_employee_timeline_events")
      .select("id, event_type, occurred_at, source_document_type")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_leave_balances")
      .select("id, available_quantity, pending_quantity, consumed_quantity, carried_forward_quantity, projected_quantity, leave_type_id")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("hr_leave_requests")
      .select("id, starts_on, ends_on, status, leave_type_id")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false })
      .limit(20),
    supabase
      .from("hr_leave_balance_ledger")
      .select("id, movement_kind, quantity, balance_after, as_of_date")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_leave_encashment_requests")
      .select("id, requested_quantity, status")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("hr_leave_policies")
      .select("id, annual_entitlement, status, leave_type_id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("hr_overtime_requests")
      .select("id, work_date, duration_minutes, hours, overtime_type, status")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(20),
    supabase
      .from("hr_overtime_candidates")
      .select("id, work_date, candidate_minutes, status")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(20),
    supabase
      .from("hr_late_early_violations")
      .select("id, work_date, violation_kind, late_minutes, early_leave_minutes, deduction_minutes, status")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(20),
    supabase
      .from("hr_late_early_policies")
      .select("id, name, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1),
    supabase
      .from("hr_action_documents")
      .select("id, action_type, status")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .in("status", ["draft", "submitted", "under_review"])
      .is("deleted_at", null)
      .limit(10),
    supabase
      .from("hr_payroll_validation_results")
      .select("id, message, severity")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .eq("severity", "error")
      .is("deleted_at", null)
      .limit(10),
    supabase
      .from("file_attachments")
      .select("id, file_name, metadata, storage_path")
      .eq("tenant_id", context.tenantId)
      .eq("entity_id", employeeId)
      .eq("entity_type", "hr_employee_document")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_action_documents")
      .select("id, metadata, status, effective_date")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .in("action_type", ["custody_assignment", "custody_return"])
      .is("deleted_at", null)
      .limit(20),
    supabase
      .from("hr_employee_skill_records")
      .select("id, skill_id, status, effective_from")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .limit(20),
    supabase.from("hr_employee_advances").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("employee_id", employeeId).in("status", ["disbursed", "partially_settled"]).is("deleted_at", null),
    supabase.from("hr_employee_loans").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("employee_id", employeeId).eq("status", "active").is("deleted_at", null),
    supabase.from("hr_employee_bonuses").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("employee_id", employeeId).eq("status", "submitted").is("deleted_at", null),
    supabase.from("hr_skills").select("id, name, code").eq("tenant_id", context.tenantId).eq("status", "active").is("deleted_at", null).limit(100),
  ]);

  const contracts = (contractsResult.data ?? []).map((row) => ({
    contractNumber: formatHrDisplayLabel(row.contract_number, "Contract"),
    endsOn: row.ends_on ? String(row.ends_on) : null,
    id: String(row.id),
    startsOn: String(row.starts_on),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const timeline: HrTimelineEntry[] = (timelineResult.data ?? []).map((row) => ({
    eventType: String(row.event_type),
    id: String(row.id),
    label: formatHrStatusLabel(String(row.event_type)),
    occurredAt: String(row.occurred_at),
    sourceDocumentType: row.source_document_type ? String(row.source_document_type) : null,
  }));

  const leaveRequestIds = (leaveRequestsResult.data ?? []).map((row) => String(row.id));
  const overtimeRequestIds = (overtimeRequestsResult.data ?? []).map((row) => String(row.id));
  const lateEarlyViolationIds = (lateEarlyViolationsResult.data ?? []).map((row) => String(row.id));
  let leaveApprovalRows: { id: string; event_kind: string; actor_user_id: string | null; created_at: string }[] = [];
  let overtimeApprovalRows: { id: string; event_kind: string; actor_user_id: string | null; created_at: string }[] = [];
  let lateEarlyApprovalRows: { id: string; event_kind: string; actor_user_id: string | null; created_at: string }[] = [];
  if (leaveRequestIds.length > 0) {
    const approvalResult = await supabase
      .from("hr_leave_approval_events")
      .select("id, event_kind, actor_user_id, created_at")
      .eq("tenant_id", context.tenantId)
      .in("leave_request_id", leaveRequestIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    leaveApprovalRows = approvalResult.data ?? [];
  }

  if (overtimeRequestIds.length > 0) {
    const overtimeApprovalResult = await supabase
      .from("hr_overtime_approval_events")
      .select("id, event_kind, actor_user_id, created_at")
      .eq("tenant_id", context.tenantId)
      .in("overtime_request_id", overtimeRequestIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    overtimeApprovalRows = overtimeApprovalResult.data ?? [];
  }

  if (lateEarlyViolationIds.length > 0) {
    const lateEarlyApprovalResult = await supabase
      .from("hr_late_early_approval_events")
      .select("id, event_kind, actor_user_id, created_at")
      .eq("tenant_id", context.tenantId)
      .in("violation_id", lateEarlyViolationIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    lateEarlyApprovalRows = lateEarlyApprovalResult.data ?? [];
  }

  const leaveTypeIds = [
    ...new Set([
      ...(leaveResult.data ?? []).map((row) => String(row.leave_type_id)),
      ...(leaveRequestsResult.data ?? []).map((row) => String(row.leave_type_id)),
      ...(leavePoliciesResult.data ?? []).map((row) => String(row.leave_type_id)),
    ]),
  ];
  const leaveTypeNames = new Map<string, string>();
  if (leaveTypeIds.length > 0) {
    const { data: leaveTypes } = await supabase.from("hr_leave_types").select("id, name").in("id", leaveTypeIds);
    for (const type of leaveTypes ?? []) leaveTypeNames.set(String(type.id), String(type.name));
  }

  const leaveBalanceSummary = (leaveResult.error ? [] : leaveResult.data ?? []).map((row) => ({
    label: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
    value: `${row.available_quantity ?? 0} available / ${row.pending_quantity ?? 0} pending`,
  }));

  const leaveRuntime = {
    approvalTimeline: leaveApprovalRows.map((row) => ({
      action: formatHrStatusLabel(String(row.event_kind)),
      actorLabel: row.actor_user_id ? String(row.actor_user_id).slice(0, 8) : "System",
      id: String(row.id),
      occurredAt: String(row.created_at),
    })),
    balances: (leaveResult.data ?? []).map((row) => ({
      available: Number(row.available_quantity ?? 0),
      carriedForward: Number(row.carried_forward_quantity ?? 0),
      consumed: Number(row.consumed_quantity ?? 0),
      leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
      pending: Number(row.pending_quantity ?? 0),
      projected: Number(row.projected_quantity ?? row.available_quantity ?? 0),
    })),
    encashments: (leaveEncashmentResult.data ?? []).map((row) => ({
      id: String(row.id),
      quantity: Number(row.requested_quantity ?? 0),
      status: formatHrStatusLabel(String(row.status)),
    })),
    ledger: (leaveLedgerResult.data ?? []).map((row) => ({
      asOfDate: String(row.as_of_date),
      balanceAfter: Number(row.balance_after ?? 0),
      id: String(row.id),
      movementKind: formatHrStatusLabel(String(row.movement_kind)),
      quantity: Number(row.quantity ?? 0),
    })),
    policies: (leavePoliciesResult.data ?? []).map((row) => ({
      annualEntitlement: Number(row.annual_entitlement ?? 0),
      leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
      status: formatHrStatusLabel(String(row.status)),
    })),
    requests: (leaveRequestsResult.data ?? []).map((row) => ({
      endsOn: String(row.ends_on),
      id: String(row.id),
      leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
      startsOn: String(row.starts_on),
      status: formatHrStatusLabel(String(row.status)),
    })),
  };

  const overtimeRuntime = {
    approvalTimeline: overtimeApprovalRows.map((row) => ({
      action: formatHrStatusLabel(String(row.event_kind)),
      actorLabel: row.actor_user_id ? String(row.actor_user_id).slice(0, 8) : "System",
      id: String(row.id),
      occurredAt: String(row.created_at),
    })),
    candidates: (overtimeCandidatesResult.data ?? []).map((row) => ({
      id: String(row.id),
      minutes: Number(row.candidate_minutes ?? 0),
      status: formatHrStatusLabel(String(row.status)),
      workDate: String(row.work_date),
    })),
    requests: (overtimeRequestsResult.data ?? []).map((row) => ({
      durationMinutes: Number(row.duration_minutes ?? 0) || Math.round(Number(row.hours ?? 0) * 60),
      id: String(row.id),
      overtimeType: formatHrStatusLabel(String(row.overtime_type ?? "normal")),
      status: formatHrStatusLabel(String(row.status)),
      workDate: String(row.work_date),
    })),
  };

  const monthStart = new Date().toISOString().slice(0, 8) + "01";
  const lateEarlyViolations = lateEarlyViolationsResult.data ?? [];
  const lateEarlyRuntime = {
    approvalTimeline: lateEarlyApprovalRows.map((row) => ({
      action: formatHrStatusLabel(String(row.event_kind)),
      actorLabel: row.actor_user_id ? String(row.actor_user_id).slice(0, 8) : "System",
      id: String(row.id),
      occurredAt: String(row.created_at),
    })),
    monthlyEarlyMinutes: lateEarlyViolations
      .filter((row) => String(row.work_date) >= monthStart)
      .reduce((sum, row) => sum + Number(row.early_leave_minutes ?? 0), 0),
    monthlyLateMinutes: lateEarlyViolations
      .filter((row) => String(row.work_date) >= monthStart)
      .reduce((sum, row) => sum + Number(row.late_minutes ?? 0), 0),
    pendingViolations: lateEarlyViolations.filter((row) => String(row.status) === "submitted").length,
    policyName: formatHrDisplayLabel(lateEarlyPoliciesResult.data?.[0]?.name, "Default policy"),
    violations: lateEarlyViolations.map((row) => ({
      deductionMinutes: Number(row.deduction_minutes ?? 0),
      earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
      id: String(row.id),
      lateMinutes: Number(row.late_minutes ?? 0),
      status: formatHrStatusLabel(String(row.status)),
      violationKind: formatHrStatusLabel(String(row.violation_kind)),
      workDate: String(row.work_date),
    })),
  };

  function readMeta(metadata: unknown) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {} as Record<string, unknown>;
    return metadata as Record<string, unknown>;
  }

  const skillIds = [...new Set((skillsResult.data ?? []).map((row) => String(row.skill_id)))];
  const skillNames = new Map<string, string>();
  if (skillIds.length > 0) {
    const { data: skills } = await supabase.from("hr_skills").select("id, name").in("id", skillIds);
    for (const skill of skills ?? []) skillNames.set(String(skill.id), String(skill.name));
  }

  const documents = (documentsResult.data ?? []).map((row) => {
    const meta = readMeta(row.metadata);
    return {
      documentType: formatHrDisplayLabel(meta.document_type, "Document"),
      expiresOn: meta.expiry_date ? String(meta.expiry_date) : null,
      fileName: formatHrDisplayLabel(row.file_name, "Document"),
      id: String(row.id),
      status: formatHrStatusLabel(String(meta.status ?? "active")),
    };
  });

  const custodyItems = (custodyResult.data ?? []).map((row) => {
    const meta = readMeta(row.metadata);
    return {
      assetLabel: formatHrDisplayLabel(meta.asset_label, "Asset"),
      assetType: formatHrDisplayLabel(meta.asset_type, "Type"),
      effectiveDate: String(row.effective_date),
      id: String(row.id),
      status: formatHrStatusLabel(String(row.status)),
    };
  });

  const skillRecords = (skillsResult.data ?? []).map((row) => ({
    effectiveFrom: String(row.effective_from),
    id: String(row.id),
    skillName: formatHrDisplayLabel(skillNames.get(String(row.skill_id)), "Skill"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const financialSummary = {
    activeAdvances: advancesResult.count ?? 0,
    activeLoans: loansResult.count ?? 0,
    pendingBonuses: bonusesResult.count ?? 0,
  };

  const skillOptionsList = (allSkillsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: `${row.name} (${row.code})`,
  }));

  const payrollReadiness = (validationResult.error ? [] : validationResult.data ?? []).map((row) => ({
    label: formatHrDisplayLabel(row.message, "Validation rule"),
    status: formatHrStatusLabel(String(row.severity)),
  }));

  const pendingActions = (actionsResult.error ? [] : actionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: formatHrDisplayLabel(row.action_type, "HR action"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const activeContract = contracts.find((contract) => contract.status.includes("active"));
  const alerts = [
    !activeContract ? { id: "no-active-contract", label: "No active contract on file", severity: "warning" as const } : null,
    payrollReadiness.length > 0
      ? { id: "payroll-readiness", label: `${payrollReadiness.length} payroll readiness issues`, severity: "error" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const hireReadiness = await new HrEmployeeHireReadinessService(supabase, context).evaluateEmployee(employeeId);
  if (!hireReadiness.mandatoryComplete) {
    alerts.push({
      id: "hire-readiness",
      label: `${hireReadiness.mandatoryPendingCount} hire setup items pending`,
      severity: "warning",
    });
  }

  return {
    alerts,
    assignment,
    compensation: {
      basicSalaryFromPackage: compensationResolution.basicSalaryFromPackage,
      basicSalaryOverride: compensationResolution.basicSalaryOverride,
      basicSalarySource: compensationResolution.basicSalarySource,
      canEdit: canEditCompensation,
      conflictMessage: compensationResolution.conflictMessage,
      employmentProfileId: compensationResolution.employmentProfileId,
      hasConflict: compensationResolution.conflict,
      hourlyRate: compensationResolution.hourlyRate,
      missingCompensation: compensationResolution.missingCompensation,
      packageAllowanceTotal: compensationResolution.packageAllowanceTotal,
      packageLines: compensationResolution.lines.map((line) => ({
        amount: line.amount,
        categoryKey: line.categoryKey,
        code: line.code,
        name: line.name,
        source: line.source,
      })),
      resolvedBasicSalary: compensationResolution.basicSalaryAmount,
      resolvedMonthlyTotal: compensationResolution.resolvedMonthlyTotal,
      salaryPackageLabel: compensationResolution.salaryPackageLabel,
    },
    canManageDocumentWaivers,
    contracts,
    custodyItems,
    documentCompliance,
    documents,
    employee: {
      birthDate: employee.birth_date ? String(employee.birth_date) : null,
      branchLabel: assignment.branchLabel,
      email: readContactField(employee.contact_info, "email"),
      employeeNumber: formatHrDisplayLabel(employee.employee_number, "Employee"),
      fullName: formatHrDisplayLabel(employee.full_name, "Employee"),
      gender: employee.gender ? String(employee.gender) : null,
      id: String(employee.id),
      maritalStatus: employee.marital_status ? String(employee.marital_status) : null,
      nationalId: employee.national_id ? String(employee.national_id) : null,
      nationality: employee.nationality ? String(employee.nationality) : null,
      phone: readContactField(employee.contact_info, "phone"),
      status: formatHrStatusLabel(String(employee.status)),
    },
    financialSummary,
    hireReadiness,
    leaveBalanceSummary,
    leaveRuntime,
    lateEarlyRuntime,
    overtimeRuntime,
    payrollReadiness,
    pendingActions,
    skillOptions: skillOptionsList,
    skillRecords,
    timeline,
  };
}
