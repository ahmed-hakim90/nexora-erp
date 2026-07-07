import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  approveEmployeeAdvanceAction,
  cancelEmployeeAdvanceAction,
  createEmployeeAdvanceAction,
  disburseEmployeeAdvanceAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_ADVANCE_STATUSES, HR_ADVANCE_TYPES } from "@/features/hr/financial-services-foundation";
import { mapAdvanceRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageActions, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrAdvancesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const statusFilter = query.status ?? "";
  const employeeSearch = query.search ?? "";

  let advanceQuery = supabase
    .from("hr_employee_advances")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (statusFilter) advanceQuery = advanceQuery.eq("status", statusFilter);

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
          <PageContainer className="max-w-[96rem]">
            <PageHeader
              description="Employee salary and emergency advances with approval, disbursement, and payroll deduction tracking."
              help={resolveHrPageHelp("advances")}
              title="Advances / السلف"
            />
            <p className="text-sm text-muted-foreground">No advances match your search.</p>
          </PageContainer>
        </HrShell>
      );
    }
    advanceQuery = advanceQuery.in("employee_id", ids);
  }

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
  const totalOutstanding = records.reduce((sum, r) => sum + r.outstandingBalance, 0);

  return (
    <HrShell activeKey="advances">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee salary and emergency advances with approval, disbursement, and payroll deduction tracking."
          help={resolveHrPageHelp("advances")}
          title="Advances / السلف"
        >
          <PageActions>
            <a className={secondaryButtonLinkClassName} href="/api/hr/advances/export">
              Export CSV
            </a>
          </PageActions>
        </PageHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total outstanding</p>
              <p className="text-2xl font-semibold">{totalOutstanding.toLocaleString()} SAR</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active advances</p>
              <p className="text-2xl font-semibold">{records.filter((r) => ["disbursed", "partially_settled"].includes(r.status)).length}</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending approval</p>
              <p className="text-2xl font-semibold">{records.filter((r) => r.status === "submitted").length}</p>
            </article>
          </div>

          <form action="/erp/hr/advances" className="grid gap-3 md:grid-cols-3">
            <Input defaultValue={employeeSearch} name="search" placeholder="Search employee..." />
            <select className={nativeSelectClassName} defaultValue={statusFilter} name="status">
              <option value="">All statuses</option>
              {HR_ADVANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <form action={createEmployeeAdvanceAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="advanceType">
              {HR_ADVANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input min="1" name="requestedAmount" placeholder="Amount (SAR)" required step="0.01" type="number" />
            <Input defaultValue="1" min="1" name="deductionMonths" placeholder="Deduction months" type="number" />
            <Input name="reason" placeholder="Reason (optional)" />
            <Button type="submit" variant="primary">
              Submit Advance
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Document #", key: "doc", render: (r) => r.documentNumber },
              { header: "Employee", key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
              { header: "Type", key: "type", render: (r) => r.advanceType },
              { header: "Requested", key: "requested", render: (r) => `${r.requestedAmount.toLocaleString()} ${r.currencyCode}` },
              { header: "Outstanding", key: "balance", render: (r) => `${r.outstandingBalance.toLocaleString()} ${r.currencyCode}` },
              { header: "Status", key: "status", render: (r) => r.status },
              { header: "Request Date", key: "date", render: (r) => r.requestDate },
              {
                header: "Actions",
                key: "actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.status === "submitted" ? (
                      <>
                        <form action={approveEmployeeAdvanceAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="primary">
                            Approve
                          </Button>
                        </form>
                        <form action={cancelEmployeeAdvanceAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">
                            Reject
                          </Button>
                        </form>
                      </>
                    ) : null}
                    {r.status === "approved" ? (
                      <form action={disburseEmployeeAdvanceAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          Disburse
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage="No advances found. Use the form above to submit a new advance request."
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
