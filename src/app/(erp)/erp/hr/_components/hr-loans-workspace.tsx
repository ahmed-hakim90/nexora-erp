"use client";

import {
  approveEmployeeLoanAction,
  cancelEmployeeLoanAction,
  createEmployeeLoanAction,
  disburseEmployeeLoanAction,
  settleEmployeeLoanAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_LOAN_STATUSES, HR_LOAN_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeeLoan } from "@/features/hr/financial-services-foundation";
import { resolveHrFieldHelp, resolveHrPageHelp, translateHrLoanType, translateHrStatus } from "@/features/hr/public-api";
import {
  Button,
  EnterpriseDataTable,
  EntityLookup,
  FieldGroup,
  FormSection,
  Input,
  PageActions,
  PageContainer,
  PageHeader,
  secondaryButtonLinkClassName,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

export function HrLoansWorkspace({
  activeCount,
  defaultStatus,
  firstInstallmentDate,
  pendingCount,
  records,
  totalOutstanding,
}: Readonly<{
  activeCount: number;
  defaultStatus?: string;
  firstInstallmentDate: string;
  pendingCount: number;
  records: readonly HrEmployeeLoan[];
  totalOutstanding: number;
}>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.loans.description")}
        help={resolveHrPageHelp("loans")}
        title={t("hr.loans.title")}
      >
        <PageActions>
          <a className={secondaryButtonLinkClassName} href="/api/hr/loans/export">
            {t("hr.common.exportCsv")}
          </a>
        </PageActions>
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.loans.kpi.exposure")}</p>
            <p className="text-2xl font-semibold">{totalOutstanding.toLocaleString()} SAR</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.loans.kpi.active")}</p>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.loans.kpi.pendingApproval")}</p>
            <p className="text-2xl font-semibold">{pendingCount}</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
          <section className="order-2 min-w-0 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
            <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
              <h2 className="mb-3 text-sm font-medium">{t("hr.loans.filterTitle")}</h2>
              <form action="/erp/hr/loans" className="grid gap-3 md:grid-cols-[minmax(0,14rem)_auto]">
                <select className={nativeSelectClassName} defaultValue={defaultStatus ?? ""} name="status">
                  <option value="">{t("hr.common.allStatuses")}</option>
                  {HR_LOAN_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {translateHrStatus(t, s.value)}
                    </option>
                  ))}
                </select>
                <Button className="w-full md:w-auto" type="submit" variant="secondary">
                  {t("hr.common.filter")}
                </Button>
              </form>
            </section>

            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
                { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
                { header: t("hr.common.type"), key: "type", render: (r) => translateHrLoanType(t, r.loanType) },
                { header: t("hr.loans.column.principal"), key: "principal", render: (r) => `${r.principalAmount.toLocaleString()} ${r.currencyCode}` },
                { header: t("hr.loans.column.outstanding"), key: "balance", render: (r) => `${r.outstandingBalance.toLocaleString()} ${r.currencyCode}` },
                {
                  header: t("hr.loans.column.monthly"),
                  key: "monthly",
                  render: (r) => (r.monthlyInstallment ? `${r.monthlyInstallment.toLocaleString()} ${r.currencyCode}` : "—"),
                },
                { header: t("hr.common.status"), key: "status", render: (r) => translateHrStatus(t, r.status) },
                {
                  header: t("hr.loans.column.paidTotal"),
                  key: "installments",
                  render: (r) => `${r.paidInstallments} / ${r.totalInstallments ?? r.termMonths}`,
                },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      {r.status === "submitted" ? (
                        <>
                          <form action={approveEmployeeLoanAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="primary">
                              {t("hr.common.approve")}
                            </Button>
                          </form>
                          <form action={cancelEmployeeLoanAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="secondary">
                              {t("hr.common.reject")}
                            </Button>
                          </form>
                        </>
                      ) : null}
                      {r.status === "approved" ? (
                        <form action={disburseEmployeeLoanAction.bind(null, r.id)}>
                          <input name="firstInstallmentDate" type="hidden" value={firstInstallmentDate} />
                          <Button size="sm" type="submit" variant="primary">
                            {t("hr.loans.disburse")}
                          </Button>
                        </form>
                      ) : null}
                      {r.status === "active" ? (
                        <form action={settleEmployeeLoanAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.loans.settle")}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.loans.empty")}
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={records}
              rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
            />
          </section>

          <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
            <FormSection description={t("hr.loans.createDescription")} title={t("hr.loans.createTitle")}>
              <form action={createEmployeeLoanAction} className="space-y-4">
                <FieldGroup isRequired label={t("hr.common.employee")}>
                  <EntityLookup label={t("hr.common.searchEmployee")} name="employeeId" providerKey="hr.employees.lookup" required />
                </FieldGroup>
                <FieldGroup label={t("hr.common.type")}>
                  <select className={nativeSelectClassName} defaultValue="personal" name="loanType">
                    {HR_LOAN_TYPES.map((loanType) => (
                      <option key={loanType.value} value={loanType.value}>
                        {translateHrLoanType(t, loanType.value)}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup isRequired label={t("hr.loans.principalLabel")}>
                  <Input min="1" name="principalAmount" placeholder={t("hr.loans.principalPlaceholder")} required step="0.01" type="number" />
                </FieldGroup>
                <FieldGroup help={resolveHrFieldHelp("advanceDeductionMonths")} label={t("hr.loans.termLabel")}>
                  <Input defaultValue="12" min="1" name="termMonths" type="number" />
                </FieldGroup>
                <FieldGroup label={t("hr.loans.interestLabel")}>
                  <Input defaultValue="0" min="0" name="interestRate" step="0.01" type="number" />
                </FieldGroup>
                <div className="border-t border-[hsl(var(--border))] pt-4">
                  <Button className="w-full" type="submit" variant="primary">
                    {t("hr.loans.submit")}
                  </Button>
                </div>
              </form>
            </FormSection>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
