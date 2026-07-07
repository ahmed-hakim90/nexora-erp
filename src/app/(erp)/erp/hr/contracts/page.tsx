import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrDisplayLabel, formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrContractsWorkspace } from "../_components/hr-contracts-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrContractsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data } = await supabase
    .from("hr_contracts")
    .select("id, contract_number, contract_type, status, starts_on, ends_on, employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("starts_on", { ascending: false })
    .limit(50);

  const employeeIds = [...new Set((data ?? []).map((row) => String(row.employee_id)))];
  const employeeNames = new Map<string, string>();
  if (employeeIds.length > 0) {
    const employees = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const employee of employees.data ?? []) {
      employeeNames.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 60);
  const renewEndsOn = soon.toISOString().slice(0, 10);

  const records = (data ?? []).map((row) => {
    const endsOn = row.ends_on ? String(row.ends_on) : null;
    const expiringSoon = endsOn ? endsOn >= today && endsOn <= renewEndsOn : false;
    const rawStatus = String(row.status);
    return {
      contractNumber: formatHrDisplayLabel(row.contract_number, "Contract"),
      contractType: formatHrDisplayLabel(row.contract_type, "Contract type"),
      employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
      employeeId: String(row.employee_id),
      endsOn: endsOn ?? "—",
      expiringSoon,
      id: String(row.id),
      rawStatus,
      startsOn: String(row.starts_on),
      status: formatHrStatusLabel(rawStatus),
    };
  });

  const expiringCount = records.filter((record) => record.expiringSoon).length;

  return (
    <HrShell activeKey="contracts">
      <HrContractsWorkspace
        defaultEmployeeId={params.employeeId}
        expiringCount={expiringCount}
        highlightCreate={params.create === "1"}
        records={records}
        renewEndsOn={renewEndsOn}
        today={today}
      />
    </HrShell>
  );
}
