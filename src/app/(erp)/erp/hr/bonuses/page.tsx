import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { approveBonusAction, createEmployeeBonusAction, rejectBonusAction } from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_BONUS_TYPES } from "@/features/hr/financial-services-foundation";
import { mapBonusRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

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

  const { data } = await bonusQuery;
  const rows = data ?? [];

  const employeeIds = [...new Set(rows.map((r) => String(r.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of emps ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const records = rows.map((r) => mapBonusRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id))));
  const pendingCount = records.filter((r) => r.status === "submitted").length;
  const pendingAmount = records.filter((r) => r.status === "submitted").reduce((s, r) => s + r.amount, 0);

  return (
    <HrShell activeKey="bonuses">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee performance bonuses, annual bonuses, and spot awards with approval workflow."
          help={resolveHrPageHelp("bonuses")}
          title="Bonuses / المكافآت"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending approval</p>
              <p className="text-2xl font-semibold">{pendingCount}</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending amount</p>
              <p className="text-2xl font-semibold">{pendingAmount.toLocaleString()} SAR</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total approved this month</p>
              <p className="text-2xl font-semibold">
                {records.filter((r) => r.status === "approved" && r.approvalDate?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, r) => s + r.amount, 0).toLocaleString()} SAR
              </p>
            </article>
          </div>

          <form action={createEmployeeBonusAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="bonusType">
              {HR_BONUS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input min="0.01" name="amount" placeholder="Amount (SAR)" required step="0.01" type="number" />
            <DatePicker name="effectiveDate" placeholder="Effective date" />
            <Input name="reason" placeholder="Reason" />
            <Button type="submit" variant="primary">
              Add Bonus
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Document #", key: "doc", render: (r) => r.documentNumber },
              { header: "Employee", key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
              { header: "Type", key: "type", render: (r) => r.bonusType },
              { header: "Amount", key: "amount", render: (r) => `${r.amount.toLocaleString()} ${r.currencyCode}` },
              { header: "Effective Date", key: "date", render: (r) => r.effectiveDate },
              { header: "Status", key: "status", render: (r) => r.status },
              { header: "Reason", key: "reason", render: (r) => r.reason ?? "—" },
              {
                header: "Actions",
                key: "actions",
                render: (r) =>
                  r.status === "submitted" ? (
                    <div className="flex flex-wrap gap-1">
                      <form action={approveBonusAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectBonusAction.bind(null, r.id)}>
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
            emptyMessage="No bonuses recorded yet."
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
