import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { mapAdvanceRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrAdvancesWorkspace } from "../_components/hr-advances-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrAdvancesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const statusFilter = query.status ?? "";
  const employeeSearch = query.search ?? "";

  let matchedEmployeeIds: string[] | null = null;
  if (employeeSearch.trim()) {
    const term = employeeSearch.replaceAll("%", "").trim();
    const { data: matchedEmployees } = await supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .or(`full_name.ilike.%${term}%,employee_number.ilike.%${term}%`)
      .limit(200);
    const ids = (matchedEmployees ?? []).map((e) => String(e.id));
    if (ids.length === 0) {
      return (
        <HrShell activeKey="advances">
          <HrAdvancesWorkspace activeCount={0} pendingCount={0} records={[]} searchHasNoMatches totalOutstanding={0} />
        </HrShell>
      );
    }
    matchedEmployeeIds = ids;
  }

  let advanceQuery = supabase
    .from("hr_employee_advances")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter) advanceQuery = advanceQuery.eq("status", statusFilter);
  if (matchedEmployeeIds) advanceQuery = advanceQuery.in("employee_id", matchedEmployeeIds);

  const { data } = await advanceQuery;
  const rows = data ?? [];

  const employeeIds = [...new Set(rows.map((r) => String(r.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of emps ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const records = rows.map((r) => mapAdvanceRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id))));

  return (
    <HrShell activeKey="advances">
      <HrAdvancesWorkspace
        activeCount={records.filter((r) => ["disbursed", "partially_settled"].includes(r.status)).length}
        defaultSearch={employeeSearch}
        defaultStatus={statusFilter}
        pendingCount={records.filter((r) => r.status === "submitted").length}
        records={records}
        totalOutstanding={records.reduce((sum, r) => sum + r.outstandingBalance, 0)}
      />
    </HrShell>
  );
}
