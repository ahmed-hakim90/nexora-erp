import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { mapBonusRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { loadCompensationIssuanceBatches } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrBonusesWorkspace } from "../_components/hr-bonuses-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrBonusesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const statusFilter = query.status ?? "";

  let bonusQuery = supabase
    .from("hr_employee_bonuses")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter) bonusQuery = bonusQuery.eq("status", statusFilter);

  const [{ data: bonusRows }, batches] = await Promise.all([
    bonusQuery,
    loadCompensationIssuanceBatches(supabase, {
      companyId: context.companyId,
      documentKind: "bonus",
      tenantId: context.tenantId,
    }),
  ]);

  const rows = bonusRows ?? [];
  const employeeIds = [...new Set(rows.map((r) => String(r.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of emps ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const records = rows.map((r) => mapBonusRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id))));
  const pendingRecords = records.filter((r) => r.status === "submitted");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const approvedThisMonthAmount = records
    .filter((r) => r.status === "approved" && r.approvalDate?.startsWith(currentMonth))
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <HrShell activeKey="bonuses">
      <HrBonusesWorkspace
        approvedThisMonthAmount={approvedThisMonthAmount}
        batches={batches}
        openBulkWizard={query.batch === "create"}
        pendingAmount={pendingRecords.reduce((sum, r) => sum + r.amount, 0)}
        pendingCount={pendingRecords.length}
        query={query}
        records={records}
      />
    </HrShell>
  );
}
