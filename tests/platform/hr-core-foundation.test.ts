import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrContract,
  defineHrEmployee,
  defineHrEmploymentProfile,
  defineHrPosition,
  defineHrTimelineEvent,
  employmentProfileRangesOverlap,
  HR_APP_KEY,
  HR_CONTRACT_SEPARATION_CONTRACT,
  HR_CORE_TABLES,
  HR_EFFECTIVE_DATING_CONTRACT,
  HR_FOUNDATION_CONTRACTS,
  HR_LIFECYCLE_STATES,
  HR_MANAGER_RESOLUTION_CONTRACT,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_TIMELINE_EVENT_TYPES,
  hrAppManifest,
  hrModuleManifest,
  resolveHrManagerSource,
} from "@/features/hr/public-api";
import {
  defineAppManifest,
  validateAppManifest,
  type AppManifest,
} from "@/platform/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630152000_hr_core_foundation.sql");

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("HR Core registers app and module manifests as foundation-only", () => {
  assert.equal(String(HR_APP_KEY), "hr");
  assert.equal(hrModuleManifest.key, "hr");
  assert.equal(hrModuleManifest.name, "HR Core Foundation");
  assert.equal(hrAppManifest.key, "hr");
  assert.equal(hrAppManifest.category, "hr");
  assert.equal(hrAppManifest.sensitiveData, "restricted");
  assert.equal(hrAppManifest.quickActions.length, 0);
  assert.deepEqual(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]), {
    errors: [],
    valid: true,
  });
  assert.equal(hrAppManifest.routes.some((route) => route.path === "/erp/hr"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.import-export"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.search"), true);
});

test("HR permissions expose the approved access contract", () => {
  assert.deepEqual(HR_PERMISSION_LIST, Object.values(HR_PERMISSIONS));
  assert.deepEqual(HR_PERMISSION_LIST.map(String), [
    "hr.view",
    "hr.manage",
    "hr.employees.view",
    "hr.employees.view_self",
    "hr.employees.manage",
    "hr.employment_profiles.view",
    "hr.employment_profiles.view_self",
    "hr.employment_profiles.manage",
    "hr.positions.view",
    "hr.positions.manage",
    "hr.contracts.view",
    "hr.contracts.manage",
    "hr.timeline.view",
    "hr.policies.view",
    "hr.policies.manage",
    "hr.policy_versions.manage",
    "hr.policy_overrides.manage",
    "hr.policy_simulator.view",
    "hr.compensation.view",
    "hr.compensation.manage",
    "hr.salary_packages.view",
    "hr.salary_packages.manage",
    "hr.compensation_overrides.view",
    "hr.compensation_overrides.manage",
    "hr.workforce.view",
    "hr.workforce.manage",
    "hr.headcount.manage",
    "hr.vacancies.manage",
    "hr.hiring_requests.manage",
    "hr.shifts.view",
    "hr.shifts.manage",
    "hr.calendars.view",
    "hr.calendars.manage",
    "hr.devices.view",
    "hr.devices.manage",
    "hr.attendance.view",
    "hr.attendance.view_self",
    "hr.attendance.manage",
    "hr.attendance.review",
    "hr.attendance.adjust",
    "hr.attendance.lock",
    "hr.attendance.export",
    "hr.attendance.reopen",
    "hr.attendance.snapshot.view",
    "hr.attendance.import",
    "hr.attendance.sync",
    "hr.attendance.preview",
    "hr.attendance.force-sync",
    "hr.attendance.devices.view",
    "hr.attendance.devices.sync",
    "hr.attendance.devices.sync.cancel",
    "hr.attendance.devices.import.approve",
    "hr.attendance.devices.logs.view",
    "hr.attendance.devices.reports.download",
    "hr.devices.commands.run",
    "hr.devices.commands.restart",
    "hr.devices.commands.shutdown",
    "hr.devices.commands.factory_reset",
    "hr.devices.config.view",
    "hr.devices.config.manage",
    "hr.devices.diagnostics.view",
    "hr.devices.drivers.manage",
    "hr.workforce.monitor.view",
    "hr.workforce.alerts.view",
    "hr.workforce.alerts.manage",
    "hr.workforce.queue.view",
    "hr.attendance.replay.view",
    "hr.attendance.replay.manage",
    "hr.attendance.recalculate.view",
    "hr.attendance.recalculate.manage",
    "hr.attendance.simulation.view",
    "hr.workforce.reports.view",
    "hr.workforce.recovery.manage",
    "hr.attendance.exceptions.view",
    "hr.attendance.exceptions.manage",
    "hr.attendance.monitor.view",
    "hr.attendance.monitor.manage",
    "hr.attendance.exception.resolve",
    "hr.attendance.live.export",
    "hr.leave.view",
    "hr.leave.view_self",
    "hr.leave.manage_self",
    "hr.leave.manage",
    "hr.leave.approve",
    "hr.leave.carry_forward",
    "hr.leave.encashment",
    "hr.leave.reports.view",
    "hr.leave.calendar.manage",
    "hr.overtime.view",
    "hr.overtime.manage",
    "hr.overtime.request",
    "hr.overtime.approve",
    "hr.overtime.export",
    "hr.late.view",
    "hr.late.manage",
    "hr.late.approve",
    "hr.late.export",
    "hr.late.policy.manage",
    "hr.payroll.view",
    "hr.payroll.manage",
    "hr.payroll.relationships.view",
    "hr.payroll.relationships.manage",
    "hr.payroll_batches.view",
    "hr.payroll_batches.manage",
    "hr.payslips.view",
    "hr.payslips.manage",
    "hr.payroll_snapshots.view",
    "hr.payroll_snapshots.manage",
    "hr.payroll_locks.manage",
    "hr.payroll_exceptions.view",
    "hr.payroll_exceptions.manage",
    "hr.payroll_posting.manage",
    "hr.payroll.run",
    "hr.payroll.approve",
    "hr.payroll.publish",
    "hr.payslips.view_self",
    "hr.documents.view_self",
    "hr.requests.view_self",
    "hr.payslips.publish",
    "hr.payroll.inputs.view",
    "hr.payroll.inputs.manage",
    "hr.payroll.adjustments.manage",
    "hr.payroll.exceptions.view",
    "hr.payroll.locks.manage",
    "hr.payroll.calculate",
    "hr.payroll.recalculate",
    "hr.payroll.trace.view",
    "hr.payroll.validate",
    "hr.payroll.lock",
    "hr.payroll.unlock",
    "hr.payroll.close",
    "hr.payroll.reopen",
    "hr.payroll.exception.manage",
    "hr.payslips.unpublish",
    "hr.payslips.audit.view",
    "hr.payroll.localization.view",
    "hr.payroll.localization.manage",
    "hr.payroll.localization.packs.manage",
    "hr.payroll.statutory_rules.manage",
    "hr.payroll.country_profiles.manage",
    "hr.payroll.finance.readiness.view",
    "hr.payroll.finance.readiness.manage",
    "hr.payroll.bank.readiness.manage",
    "hr.payroll.cost_allocation.manage",
    "hr.payroll.portal.security.view",
    "hr.payroll.portal.security.manage",
    "hr.payslips.download.authorize",
    "hr.payslips.access.revoke",
    "hr.payroll.ess.readiness.view",
    "hr.payroll.mss.readiness.view",
    "hr.actions.view",
    "hr.actions.manage",
    "hr.actions.submit",
    "hr.actions.review",
    "hr.actions.approve",
    "hr.actions.apply",
    "hr.actions.cancel",
    "hr.actions.archive",
    "hr.actions.apply.view",
    "hr.actions.apply.manage",
    "hr.actions.apply.dry_run",
    "hr.actions.apply.execute",
    "hr.actions.apply.rollback",
    "hr.actions.apply.audit.view",
    "hr.actions.workflow.view",
    "hr.actions.workflow.manage",
    "hr.actions.approval.view",
    "hr.actions.approval.manage",
    "hr.actions.approval_matrix.view",
    "hr.actions.approval_matrix.manage",
    "hr.actions.delegation.view",
    "hr.actions.delegation.manage",
    "hr.templates.view",
    "hr.templates.manage",
    "hr.capability_packs.view",
    "hr.capability_packs.manage",
    "hr.lifecycle_templates.view",
    "hr.lifecycle_templates.manage",
    "hr.checklists.view",
    "hr.checklists.manage",
    "hr.assignments.view",
    "hr.assignments.manage",
    "hr.assignment_history.view",
    "hr.assignment_resolution.view",
    "hr.jobs.view",
    "hr.jobs.create",
    "hr.jobs.edit",
    "hr.jobs.archive",
    "hr.job_families.manage",
    "hr.job_functions.manage",
    "hr.job_grades.manage",
    "hr.job_levels.manage",
    "hr.skills.view",
    "hr.skills.manage",
    "hr.competencies.manage",
    "hr.certifications.manage",
    "hr.licenses.manage",
    "hr.languages.manage",
    "hr.search.view",
    "hr.reports.view",
    "hr.import-export.manage",
  ]);
});

test("Employee master contract keeps identity separate from operational data", () => {
  const employee = defineHrEmployee({
    branchId: "branch-1",
    companyId: "company-1",
    employeeNumber: "E-001",
    fullName: "Nexora Employee",
    partyId: "party-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(employee.partyId, "party-1");
  assert.equal("salaryPackageRef" in employee, false);
  assert.equal("shiftScheduleRef" in employee, false);
  assert.equal("attendancePolicyRef" in employee, false);
  assert.equal("payrollPolicyRef" in employee, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.employeeMasterOwnsIdentityOnly, true);
});

test("Employment profile is effective-dated operational source of truth", () => {
  const current = defineHrEmploymentProfile({
    attendancePolicyRef: "attendance-policy-1",
    branchId: "branch-1",
    companyId: "company-1",
    departmentId: "department-1",
    effectiveFrom: "2026-01-01",
    employeeId: "employee-1",
    employmentType: "full-time",
    leavePolicyRef: "leave-policy-1",
    payrollPolicyRef: "payroll-policy-1",
    reportingManagerEmployeeId: "employee-2",
    reportingManagerOverride: false,
    salaryPackageRef: "salary-package-1",
    shiftScheduleRef: "shift-schedule-1",
    status: "active",
    tenantId: "tenant-1",
  });
  const overlapping = { ...current, effectiveFrom: "2026-06-01", effectiveTo: "2026-12-31" };
  const nonOverlapping = { ...current, effectiveFrom: "2027-01-01", effectiveTo: null };

  assert.equal(current.salaryPackageRef, "salary-package-1");
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.employmentProfileIsOperationalSourceOfTruth, true);
  assert.equal(employmentProfileRangesOverlap(current, overlapping), true);
  assert.equal(employmentProfileRangesOverlap({ ...current, effectiveTo: "2026-12-31" }, nonOverlapping), false);
  assert.equal(HR_EFFECTIVE_DATING_CONTRACT.activeProfileExclusionConstraint, "one-active-profile-per-employee-date-range");
  assert.equal(HR_EFFECTIVE_DATING_CONTRACT.historicalProfilesMutableByDirectEdit, false);
});

test("Contract contract is legal-only and references employment profile", () => {
  const contract = defineHrContract({
    branchId: "branch-1",
    companyId: "company-1",
    contractNumber: "CTR-001",
    contractType: "limited",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    legalTerms: { workHoursClause: "As per policy" },
    startsOn: "2026-01-01",
    status: "signed",
    tenantId: "tenant-1",
  });

  assert.equal(contract.employmentProfileId, "profile-1");
  assert.equal(HR_CONTRACT_SEPARATION_CONTRACT.referencesEmploymentProfile, true);
  assert.equal(HR_CONTRACT_SEPARATION_CONTRACT.storesSalaryComponents, false);
  assert.equal(HR_CONTRACT_SEPARATION_CONTRACT.storesAttendanceRules, false);
  assert.equal(HR_CONTRACT_SEPARATION_CONTRACT.storesPayrollRules, false);
  assert.equal(HR_CONTRACT_SEPARATION_CONTRACT.forbiddenOperationalFields.includes("salary_package_ref"), true);
});

test("Position management references a job definition and tracks headcount readiness", () => {
  const position = defineHrPosition({
    branchId: "branch-1",
    budgetedHeadcount: 3,
    companyId: "company-1",
    currentHeadcount: 1,
    departmentId: "department-1",
    effectiveFrom: "2026-01-01",
    jobId: "job-1",
    name: "Senior Accountant Seat",
    positionKey: "senior-accountant-seat",
    status: "approved",
    tenantId: "tenant-1",
    vacancyStatus: "partially-filled",
  });

  assert.equal(position.jobId, "job-1");
  assert.equal(position.budgetedHeadcount, 3);
  assert.equal(position.currentHeadcount, 1);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.positionOwnsApprovedSeat, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrJobArchitectureFoundation, true);
});

test("Manager resolution contract is ready without hardcoded approvals", () => {
  assert.equal(resolveHrManagerSource({
    departmentManagerEmployeeId: "employee-3",
    positionReportingManagerEmployeeId: "employee-2",
    reportingManagerOverride: false,
  }), "position.reporting-position");
  assert.equal(resolveHrManagerSource({
    departmentManagerEmployeeId: "employee-3",
    profileReportingManagerEmployeeId: "employee-4",
    reportingManagerOverride: true,
  }), "employment-profile.override-manager");
  assert.deepEqual(HR_MANAGER_RESOLUTION_CONTRACT.resolutionOrder, [
    "employment-profile.override-manager",
    "position.reporting-position",
    "department.manager",
  ]);
  assert.equal(HR_MANAGER_RESOLUTION_CONTRACT.hardcodedApprovalManagers, false);
  assert.equal(HR_MANAGER_RESOLUTION_CONTRACT.approvalEngineImplemented, false);
});

test("Lifecycle and timeline contracts cover Sprint 1 states and event types", () => {
  assert.deepEqual(HR_LIFECYCLE_STATES, [
    "applicant",
    "candidate",
    "offered",
    "accepted",
    "preboarding",
    "onboarding",
    "probation",
    "confirmed",
    "active",
    "temporary_assignment",
    "suspended",
    "notice_period",
    "separated",
    "final_settlement",
    "alumni",
    "rehire_eligible",
  ]);
  assert.deepEqual(HR_TIMELINE_EVENT_TYPES, [
    "hired",
    "profile_created",
    "contract_signed",
    "position_changed",
    "department_changed",
    "manager_changed",
    "salary_package_changed",
    "policy_changed",
    "document_added",
    "lifecycle_changed",
  ]);
  const event = defineHrTimelineEvent({
    branchId: "branch-1",
    companyId: "company-1",
    employeeId: "employee-1",
    eventType: "contract_signed",
    occurredAt: "2026-01-01T00:00:00.000Z",
    summary: "Contract signed.",
    tenantId: "tenant-1",
  });

  assert.equal(event.eventType, "contract_signed");
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.timelineIsEventDrivenAndAuditAware, true);
});

test("HR platform integration contracts are readiness-only", () => {
  assert.equal(HR_FOUNDATION_CONTRACTS.appManifest.key, "hr");
  assert.equal(HR_FOUNDATION_CONTRACTS.search.key, "hr.foundation.search");
  assert.equal(HR_FOUNDATION_CONTRACTS.report.key, "hr.foundation.readiness");
  assert.equal(HR_FOUNDATION_CONTRACTS.print.key, "hr.foundation.readiness-print");
  assert.equal(HR_FOUNDATION_CONTRACTS.dashboardTemplate.key, "hr.foundation.dashboard-template");
  assert.equal(HR_FOUNDATION_CONTRACTS.imports[0].key, "hr.employees.import");
  assert.equal(HR_FOUNDATION_CONTRACTS.export.key, "hr.foundation.export");
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsPolicyEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsPolicyRuntimeResolution, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsCompensationEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsWorkforceEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsAttendanceEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsAttendanceCalculation, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsCompensationCalculation, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsPayrollEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrActionEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrActionApplyEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrActionApplyRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrWorkflowApprovalBindingFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrWorkflowApprovalBindingRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrTemplateLifecycleFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrTemplateLifecycleRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrAssignmentEngineFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrAssignmentEngineRuntime, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrActionWorkflows, false);
});

test("HR migration adds Core tables, RLS, legal-only contracts, and effective dating", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_CORE_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "create extension if not exists btree_gist",
    "hr_employment_profiles_one_active_profile_per_range",
    "prevent_hr_employment_profile_history_rewrite",
    "references public.parties",
    "manager_override_ready boolean not null default true",
    "legal_terms jsonb not null default '{}'::jsonb",
    "'operational_source_of_truth', true",
    "'legal_only', true",
    "'event_driven', true",
    "public.has_app_access(tenant_id, 'hr')",
    "public.has_company_access(tenant_id, company_id)",
    "public.has_branch_access(tenant_id, company_id, branch_id)",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "payroll_batch",
    "payslip",
    "attendance_calculation",
    "biometric",
    "salary_component",
    "self_service",
    "manager_portal",
  ]) {
    assert.equal(sql.includes(forbidden), false, `HR Core migration must not include ${forbidden}`);
  }
});
