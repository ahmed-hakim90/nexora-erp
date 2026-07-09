import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrPayrollReadinessWorkspace } from "../_components/hr-payroll-readiness-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrPayrollReadinessPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [runs, results, payslips, publications, exceptions, validationWarnings, validationResults, periods, groups, runList] = await Promise.all([
    supabase.from("hr_payroll_runs").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payroll_results").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payslips").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payslip_publications").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("publishing_status", "published"),
    supabase.from("hr_payroll_validation_results").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("severity", "error").eq("status", "open").is("deleted_at", null),
    supabase.from("hr_payroll_validation_results").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("severity", "warning").eq("status", "open").is("deleted_at", null),
    supabase
      .from("hr_payroll_validation_results")
      .select("id, message, severity, rule_category, employee_id, payroll_period_id, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("hr_payroll_periods").select("id, period_name, start_date, end_date, status").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(20),
    supabase.from("hr_payroll_groups").select("id, name, code").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(20),
    supabase.from("hr_payroll_runs").select("id, status, run_type, created_at, payroll_period_id, payroll_group_id").eq("tenant_id", context.tenantId).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
  ]);

  const draftHidden = Math.max(0, (payslips.count ?? 0) - (publications.count ?? 0));
  const periodMap = new Map((periods.data ?? []).map((p) => [String(p.id), String(p.period_name)]));
  const groupMap = new Map((groups.data ?? []).map((g) => [String(g.id), String(g.name)]));

  const periodRecords = (periods.data ?? []).map((row) => {
    const rawStatus = String(row.status);
    return {
      endDate: String(row.end_date),
      id: String(row.id),
      periodName: String(row.period_name),
      rawStatus,
      startDate: String(row.start_date),
      status: formatHrStatusLabel(rawStatus),
    };
  });

  const runRecords = (runList.data ?? []).map((row) => ({
    createdAt: String(row.created_at).slice(0, 10),
    group: groupMap.get(String(row.payroll_group_id)) ?? "—",
    id: String(row.id),
    period: periodMap.get(String(row.payroll_period_id)) ?? "—",
    rawStatus: String(row.status),
    runType: String(row.run_type),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const validationIssueRecords = (validationResults.data ?? []).map((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? (row.metadata as Record<string, unknown>) : {};
    const periodId = row.payroll_period_id ? String(row.payroll_period_id) : null;
    return {
      employeeId: row.employee_id ? String(row.employee_id) : null,
      id: String(row.id),
      message: String(row.message),
      periodName: periodId ? periodMap.get(periodId) ?? "—" : "—",
      ruleCode: metadata.rule_code ? String(metadata.rule_code) : null,
      ruleCategory: String(row.rule_category),
      severity: String(row.severity),
    };
  });

  return (
    <HrShell activeKey="payroll-readiness">
      <HrPayrollReadinessWorkspace
        draftHidden={draftHidden}
        exceptionsCount={exceptions.count ?? 0}
        groups={(groups.data ?? []).map((group) => ({
          id: String(group.id),
          label: `${String(group.name)} (${String(group.code)})`,
        }))}
        payslipsCount={payslips.count ?? 0}
        periods={periodRecords}
        query={query}
        resultsCount={results.count ?? 0}
        runRecords={runRecords}
        runsCount={runs.count ?? 0}
        validationIssueRecords={validationIssueRecords}
        validationWarningsCount={validationWarnings.count ?? 0}
      />
    </HrShell>
  );
}
