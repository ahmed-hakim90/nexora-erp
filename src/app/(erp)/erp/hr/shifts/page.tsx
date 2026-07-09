import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrShiftsWorkspace } from "../_components/hr-shifts-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrShiftsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.shiftsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data: shifts }, { data: schedules }] = await Promise.all([
    supabase
      .from("hr_shift_definitions")
      .select("id, code, name, shift_kind, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_shift_schedules")
      .select("id, employee_id, effective_from, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const employeeIds = [...new Set((schedules ?? []).map((row) => String(row.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const employee of employees ?? []) {
      employeeMap.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
    }
  }

  const shiftRecords = (shifts ?? []).map((row) => ({
    code: String(row.code),
    createdAt: String(row.created_at).slice(0, 10),
    id: String(row.id),
    kind: String(row.shift_kind),
    name: String(row.name),
    status: String(row.status),
  }));

  const scheduleRecords = (schedules ?? []).map((row) => ({
    effectiveFrom: String(row.effective_from),
    employee: employeeMap.get(String(row.employee_id)) ?? String(row.employee_id),
    id: String(row.id),
    status: String(row.status),
  }));

  return (
    <HrShell activeKey="shifts">
      <HrShiftsWorkspace query={query} scheduleRecords={scheduleRecords} shiftRecords={shiftRecords} />
    </HrShell>
  );
}
