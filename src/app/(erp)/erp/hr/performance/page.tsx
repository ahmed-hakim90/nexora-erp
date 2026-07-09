import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";

import { HrPerformanceWorkspace } from "../_components/hr-performance-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrPerformancePage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data } = await supabase
    .from("hr_talent_programs")
    .select("id, code, title, status, employee_id")
    .eq("program_type", "performance")
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .limit(30);

  const records = (data ?? []).map((row) => ({
    code: String(row.code),
    employeeId: row.employee_id ? String(row.employee_id) : "—",
    id: String(row.id),
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  return (
    <HrShell activeKey="performance" pathname="/erp/hr/performance">
      <HrPerformanceWorkspace records={records} />
    </HrShell>
  );
}
