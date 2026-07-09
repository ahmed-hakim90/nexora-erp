import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { loadHrRequiredDocumentSetsForSettings } from "@/features/hr/routes/loaders/hr-document-compliance.loader";

import { HrSettingsWorkspace } from "../_components/hr-settings-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrSettingsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.manage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [leaveTypes, leavePolicies, payrollGroups, payrollPeriods, payrollCalendars, payrollPolicyType, contractTypes, contractTypeVersions, contractTypeArticles, documentSetRecords] =
    await Promise.all([
      supabase
        .from("hr_leave_types")
        .select("id, code, name, paid, requires_approval, impacts_payroll, status")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("code")
        .limit(50),
      supabase
        .from("hr_leave_policies")
        .select("id, leave_type_id, entitlement_unit, annual_entitlement, carry_forward_allowed, status")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("hr_payroll_groups")
        .select("id, code, name, status, payroll_calendar_id, payroll_policy_version_id")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("code")
        .limit(20),
      supabase
        .from("hr_payroll_periods")
        .select("id, period_code, period_name, start_date, end_date, payment_date, status, payroll_calendar_id")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false })
        .limit(20),
      supabase
        .from("hr_payroll_calendars")
        .select("id, code, name, frequency, status, effective_from")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("code")
        .limit(20),
      supabase.from("hr_policy_types").select("id").eq("policy_type_key", "payroll").maybeSingle(),
      supabase
        .from("hr_contract_types")
        .select("id, code, name, name_ar, default_probation_days, requires_end_date, required_document_set_id, status")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("code")
        .limit(100),
      supabase
        .from("hr_contract_type_versions")
        .select("id, contract_type_id, version_no, status, change_summary")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null)
        .order("version_no", { ascending: false })
        .limit(200),
      params.versionArticles
        ? supabase
            .from("hr_contract_type_articles")
            .select("id, sequence, code, title_en, title_ar, body_en, body_ar")
            .eq("tenant_id", context.tenantId)
            .eq("contract_type_version_id", params.versionArticles)
            .is("deleted_at", null)
            .order("sequence", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      loadHrRequiredDocumentSetsForSettings(),
    ]);

  let policyVersionRecords: { id: string; label: string }[] = [];
  if (payrollPolicyType.data?.id) {
    const { data: payrollPolicies } = await supabase
      .from("hr_policies")
      .select("id, code, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("policy_type_id", payrollPolicyType.data.id)
      .is("deleted_at", null)
      .limit(50);
    const policyIds = (payrollPolicies ?? []).map((row) => String(row.id));
    const policyLabels = new Map(
      (payrollPolicies ?? []).map((row) => [String(row.id), `${row.code} — ${row.name}`]),
    );
    if (policyIds.length > 0) {
      const { data: versions } = await supabase
        .from("hr_policy_versions")
        .select("id, version_no, policy_id")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .in("policy_id", policyIds)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("version_no", { ascending: false })
        .limit(50);
      policyVersionRecords = (versions ?? []).map((row) => ({
        id: String(row.id),
        label: `${policyLabels.get(String(row.policy_id)) ?? "Payroll policy"} v${row.version_no}`,
      }));
    }
  }

  const leaveTypeRecords = (leaveTypes.data ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    impactsPayroll: Boolean(row.impacts_payroll),
    name: String(row.name),
    paid: Boolean(row.paid),
    paidLabel: row.paid ? "Paid" : "Unpaid",
    requiresApproval: Boolean(row.requires_approval),
    status: formatHrStatusLabel(String(row.status)),
    statusRaw: String(row.status),
  }));

  const leaveTypeNames = new Map(leaveTypeRecords.map((row) => [row.id, row.name]));
  const activeLeaveTypes = (leaveTypes.data ?? [])
    .filter((row) => String(row.status) === "active")
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
    }));

  const leavePolicyRecords = (leavePolicies.data ?? []).map((row) => ({
    annualEntitlement: Number(row.annual_entitlement ?? 0),
    carryForward: row.carry_forward_allowed ? "Yes" : "No",
    carryForwardAllowed: Boolean(row.carry_forward_allowed),
    entitlementUnit: String(row.entitlement_unit),
    id: String(row.id),
    leaveType: leaveTypeNames.get(String(row.leave_type_id)) ?? "Leave",
    leaveTypeId: String(row.leave_type_id),
    rawStatus: String(row.status),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const calendarRecords = (payrollCalendars.data ?? []).map((row) => ({
    code: String(row.code),
    effectiveFrom: String(row.effective_from),
    frequency: String(row.frequency),
    id: String(row.id),
    name: String(row.name),
    status: formatHrStatusLabel(String(row.status)),
    statusRaw: String(row.status),
  }));

  const calendarNames = new Map(calendarRecords.map((row) => [row.id, row.name]));

  const groupRecords = (payrollGroups.data ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    name: String(row.name),
    payrollCalendarId: String(row.payroll_calendar_id),
    payrollCalendarName: calendarNames.get(String(row.payroll_calendar_id)) ?? "Calendar",
    payrollPolicyVersionId: String(row.payroll_policy_version_id),
    status: formatHrStatusLabel(String(row.status)),
    statusRaw: String(row.status),
  }));

  const periodRecords = (payrollPeriods.data ?? []).map((row) => ({
    code: String(row.period_code),
    endDate: String(row.end_date),
    id: String(row.id),
    name: String(row.period_name),
    paymentDate: String(row.payment_date ?? row.end_date),
    payrollCalendarId: String(row.payroll_calendar_id),
    payrollCalendarName: calendarNames.get(String(row.payroll_calendar_id)) ?? "Calendar",
    startDate: String(row.start_date),
    status: formatHrStatusLabel(String(row.status)),
    statusRaw: String(row.status),
  }));

  const scanTotal = params.scanTotal ? Number(params.scanTotal) : null;

  const versionRows = contractTypeVersions.data ?? [];
  const versionsByType = new Map<string, typeof versionRows>();
  for (const version of versionRows) {
    const typeId = String(version.contract_type_id);
    const bucket = versionsByType.get(typeId) ?? [];
    bucket.push(version);
    versionsByType.set(typeId, bucket);
  }

  const articleCounts = new Map<string, number>();
  if (versionRows.length > 0) {
    const { data: articleCountRows } = await supabase
      .from("hr_contract_type_articles")
      .select("contract_type_version_id")
      .eq("tenant_id", context.tenantId)
      .in(
        "contract_type_version_id",
        versionRows.map((row) => String(row.id)),
      )
      .is("deleted_at", null);
    for (const row of articleCountRows ?? []) {
      const versionId = String(row.contract_type_version_id);
      articleCounts.set(versionId, (articleCounts.get(versionId) ?? 0) + 1);
    }
  }

  const documentSetLabels = new Map(documentSetRecords.map((row) => [row.id, row.name]));

  const contractTypeRecords = (contractTypes.data ?? []).map((row) => {
    const versions = versionsByType.get(String(row.id)) ?? [];
    const activeVersion = versions.find((version) => String(version.status) === "active");
    const draftVersion = versions.find((version) => String(version.status) === "draft");
    const requiredDocumentSetId = row.required_document_set_id ? String(row.required_document_set_id) : null;
    return {
      activeVersionId: activeVersion ? String(activeVersion.id) : null,
      activeVersionNo: activeVersion ? Number(activeVersion.version_no) : null,
      code: String(row.code),
      defaultProbationDays: row.default_probation_days === null ? null : Number(row.default_probation_days),
      draftVersionId: draftVersion ? String(draftVersion.id) : null,
      draftVersionNo: draftVersion ? Number(draftVersion.version_no) : null,
      id: String(row.id),
      name: String(row.name),
      nameAr: row.name_ar ? String(row.name_ar) : null,
      requiredDocumentSetId,
      requiredDocumentSetLabel: requiredDocumentSetId ? documentSetLabels.get(requiredDocumentSetId) ?? null : null,
      requiresEndDate: Boolean(row.requires_end_date),
      status: formatHrStatusLabel(String(row.status)),
      statusRaw: String(row.status),
    };
  });

  const versionRecords = versionRows.map((row) => ({
    articleCount: articleCounts.get(String(row.id)) ?? 0,
    changeSummary: row.change_summary ? String(row.change_summary) : null,
    contractTypeId: String(row.contract_type_id),
    id: String(row.id),
    status: formatHrStatusLabel(String(row.status)),
    statusRaw: String(row.status),
    versionNo: Number(row.version_no),
  }));

  const articleRecords = (contractTypeArticles.data ?? []).map((row) => ({
    bodyAr: String(row.body_ar ?? ""),
    bodyEn: String(row.body_en ?? ""),
    code: row.code ? String(row.code) : null,
    id: String(row.id),
    sequence: Number(row.sequence),
    titleAr: row.title_ar ? String(row.title_ar) : null,
    titleEn: String(row.title_en),
  }));

  return (
    <HrShell activeKey="settings">
      <HrSettingsWorkspace
        activeLeaveTypes={activeLeaveTypes}
        articleRecords={articleRecords}
        calendarRecords={calendarRecords}
        contractTypeRecords={contractTypeRecords}
        documentSetRecords={documentSetRecords}
        groupRecords={groupRecords}
        leavePolicyRecords={leavePolicyRecords}
        leaveTypeRecords={leaveTypeRecords}
        periodRecords={periodRecords}
        policyVersionOptions={policyVersionRecords}
        query={params}
        scanContracts={params.scanContracts}
        scanDocuments={params.scanDocuments}
        scanProbation={params.scanProbation}
        scanTotal={scanTotal}
        versionRecords={versionRecords}
      />
    </HrShell>
  );
}
