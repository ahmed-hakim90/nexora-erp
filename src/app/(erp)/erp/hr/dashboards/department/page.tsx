import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { loadHrDashboardWorkspace } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../../_components/hr-shell";

export default async function HrDepartmentDashboardPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const dashboard = await loadHrDashboardWorkspace();
  const { data: departments } = await supabase.from("hr_org_units").select("id, name, kind").eq("kind", "department").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(20);

  return (
    <HrShell activeKey="dashboard-department" pathname="/erp/hr/dashboards/department">
      <PageContainer className="max-w-[96rem]">
        <PageHeader description="Department-level headcount and operational KPIs." title="Department Dashboard" />
        <p className="mb-4 text-sm text-muted-foreground">Company active employees: {dashboard.metrics.activeEmployees}</p>
        <ul className="divide-y rounded-lg border">
          {(departments ?? []).map((dept) => (
            <li className="flex justify-between p-3 text-sm" key={String(dept.id)}>
              <span>{dept.name}</span>
              <span className="text-muted-foreground">{dept.kind}</span>
            </li>
          ))}
        </ul>
      </PageContainer>
    </HrShell>
  );
}
