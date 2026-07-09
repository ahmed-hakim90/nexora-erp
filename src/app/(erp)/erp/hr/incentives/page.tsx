import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { mapIncentiveRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { loadCompensationIssuanceBatches } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrIncentivesWorkspace } from "../_components/hr-incentives-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrIncentivesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data }, batches] = await Promise.all([
    supabase
      .from("hr_employee_incentives")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    loadCompensationIssuanceBatches(supabase, {
      companyId: context.companyId,
      documentKind: "incentive",
      tenantId: context.tenantId,
    }),
  ]);

  const rows = data ?? [];
  const employeeIds = [...new Set(rows.map((r) => String(r.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of emps ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const records = rows.map((r) => mapIncentiveRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id))));

  return (
    <HrShell activeKey="incentives">
      <HrIncentivesWorkspace batches={batches} openBulkWizard={query.batch === "create"} query={query} records={records} />
    </HrShell>
  );
}
