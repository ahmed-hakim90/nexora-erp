import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  approveEmployeeIncentiveAction,
  createEmployeeIncentiveAction,
  rejectEmployeeIncentiveAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_INCENTIVE_TYPES } from "@/features/hr/financial-services-foundation";
import { mapIncentiveRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrIncentivesPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data } = await supabase
    .from("hr_employee_incentives")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
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
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee incentive programs: KPI achievement, sales targets, attendance rewards, and long service awards."
          help={resolveHrPageHelp("incentives")}
          title="Incentives / الحوافز"
        />
        <div className="space-y-4">
          <form action={createEmployeeIncentiveAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="incentiveType">
              {HR_INCENTIVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input min="0" name="amount" placeholder="Amount (SAR, optional)" step="0.01" type="number" />
            <Input max="100" min="0" name="percentage" placeholder="Percentage (optional)" step="0.01" type="number" />
            <DatePicker name="effectiveDate" placeholder="Effective date" />
            <Button type="submit" variant="primary">
              Add Incentive
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Document #", key: "doc", render: (r) => r.documentNumber },
              { header: "Employee", key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
              { header: "Type", key: "type", render: (r) => r.incentiveType },
              { header: "Amount", key: "amount", render: (r) => (r.amount ? `${r.amount.toLocaleString()} ${r.currencyCode}` : "—") },
              { header: "Percentage", key: "pct", render: (r) => (r.percentage ? `${r.percentage}%` : "—") },
              { header: "Score", key: "score", render: (r) => (r.score !== null ? String(r.score) : "—") },
              { header: "Effective Date", key: "date", render: (r) => r.effectiveDate },
              { header: "Status", key: "status", render: (r) => r.status },
              {
                header: "Actions",
                key: "actions",
                render: (r) =>
                  r.status === "submitted" ? (
                    <div className="flex flex-wrap gap-1">
                      <form action={approveEmployeeIncentiveAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectEmployeeIncentiveAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          Reject
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{r.status}</span>
                  ),
              },
            ]}
            emptyMessage="No incentives recorded yet."
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={records}
            rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: "View profile" }]}
          />
        </div>
      </PageContainer>
    </HrShell>
  );
}
