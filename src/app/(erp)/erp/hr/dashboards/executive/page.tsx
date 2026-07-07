import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { loadHrDashboardWorkspace } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../../_components/hr-shell";

export default async function HrExecutiveDashboardPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const dashboard = await loadHrDashboardWorkspace();
  const { count: payrollRuns } = await supabase.from("hr_payroll_runs").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null);

  const kpis = [
    { label: "Total workforce", value: dashboard.metrics.totalEmployees },
    { label: "Active employees", value: dashboard.metrics.activeEmployees },
    { label: "Open vacancies", value: dashboard.metrics.openVacancies },
    { label: "Payroll readiness issues", value: dashboard.metrics.payrollReadinessIssues },
    { label: "Payroll runs", value: payrollRuns ?? 0 },
    { label: "Pending approvals", value: dashboard.metrics.pendingApprovals },
  ];

  return (
    <HrShell activeKey="dashboard-executive" pathname="/erp/hr/dashboards/executive">
      <PageContainer className="max-w-[96rem]">
        <PageHeader description="Executive workforce and payroll KPIs." title="Executive Dashboard" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <article className="rounded-lg border p-5" key={kpi.label}>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{kpi.value}</p>
            </article>
          ))}
        </section>
      </PageContainer>
    </HrShell>
  );
}
