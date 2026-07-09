import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { mapLoanRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrLoansWorkspace } from "../_components/hr-loans-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrLoansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const statusFilter = query.status ?? "";

  let loanQuery = supabase
    .from("hr_employee_loans")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter) loanQuery = loanQuery.eq("status", statusFilter);

  const { data } = await loanQuery;
  const rows = data ?? [];

  const employeeIds = [...new Set(rows.map((r) => String(r.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of emps ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const records = rows.map((r) => mapLoanRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id))));
  const firstInstallmentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <HrShell activeKey="loans">
      <HrLoansWorkspace
        activeCount={records.filter((r) => r.status === "active").length}
        defaultStatus={statusFilter}
        firstInstallmentDate={firstInstallmentDate}
        pendingCount={records.filter((r) => r.status === "submitted").length}
        records={records}
        totalOutstanding={records.reduce((sum, r) => sum + r.outstandingBalance, 0)}
      />
    </HrShell>
  );
}
