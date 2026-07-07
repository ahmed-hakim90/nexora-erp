import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  approveEmployeeLoanAction,
  cancelEmployeeLoanAction,
  createEmployeeLoanAction,
  disburseEmployeeLoanAction,
  settleEmployeeLoanAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_LOAN_STATUSES, HR_LOAN_TYPES } from "@/features/hr/financial-services-foundation";
import { mapLoanRow } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageActions, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

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
  const totalOutstanding = records.reduce((sum, r) => sum + r.outstandingBalance, 0);

  return (
    <HrShell activeKey="loans">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee loan lifecycle: request, approval, agreement, disbursement, installment tracking, and closure."
          help={resolveHrPageHelp("loans")}
          title="Loans / القروض"
        >
          <PageActions>
            <a className={secondaryButtonLinkClassName} href="/api/hr/loans/export">
              Export CSV
            </a>
          </PageActions>
        </PageHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total loan exposure</p>
              <p className="text-2xl font-semibold">{totalOutstanding.toLocaleString()} SAR</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active loans</p>
              <p className="text-2xl font-semibold">{records.filter((r) => r.status === "active").length}</p>
            </article>
            <article className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending approval</p>
              <p className="text-2xl font-semibold">{records.filter((r) => r.status === "submitted").length}</p>
            </article>
          </div>

          <form action="/erp/hr/loans" className="grid gap-3 md:grid-cols-3">
            <select className={nativeSelectClassName} defaultValue={statusFilter} name="status">
              <option value="">All statuses</option>
              {HR_LOAN_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <form action={createEmployeeLoanAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="loanType">
              {HR_LOAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input min="1" name="principalAmount" placeholder="Principal (SAR)" required step="0.01" type="number" />
            <Input defaultValue="12" min="1" name="termMonths" placeholder="Term (months)" type="number" />
            <Input defaultValue="0" min="0" name="interestRate" placeholder="Interest % p.a." step="0.01" type="number" />
            <Button type="submit" variant="primary">
              Submit Loan
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Document #", key: "doc", render: (r) => r.documentNumber },
              { header: "Employee", key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
              { header: "Type", key: "type", render: (r) => r.loanType },
              { header: "Principal", key: "principal", render: (r) => `${r.principalAmount.toLocaleString()} ${r.currencyCode}` },
              { header: "Outstanding", key: "balance", render: (r) => `${r.outstandingBalance.toLocaleString()} ${r.currencyCode}` },
              { header: "Monthly", key: "monthly", render: (r) => (r.monthlyInstallment ? `${r.monthlyInstallment.toLocaleString()} ${r.currencyCode}` : "—") },
              { header: "Status", key: "status", render: (r) => r.status },
              { header: "Paid / Total", key: "installments", render: (r) => `${r.paidInstallments} / ${r.totalInstallments ?? r.termMonths}` },
              {
                header: "Actions",
                key: "actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.status === "submitted" ? (
                      <>
                        <form action={approveEmployeeLoanAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="primary">
                            Approve
                          </Button>
                        </form>
                        <form action={cancelEmployeeLoanAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">
                            Reject
                          </Button>
                        </form>
                      </>
                    ) : null}
                    {r.status === "approved" ? (
                      <form action={disburseEmployeeLoanAction.bind(null, r.id)}>
                        <input name="firstInstallmentDate" type="hidden" value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} />
                        <Button size="sm" type="submit" variant="primary">
                          Disburse
                        </Button>
                      </form>
                    ) : null}
                    {r.status === "active" ? (
                      <form action={settleEmployeeLoanAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          Settle
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage="No loans found. Use the form above to submit a new loan request."
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
