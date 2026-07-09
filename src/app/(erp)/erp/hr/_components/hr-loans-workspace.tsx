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
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageActions, PageContainer, PageHeader, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

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

        <form action="/erp/hr/loans" className="grid gap-3 md:grid-cols-3">
          <select className={nativeSelectClassName} defaultValue={defaultStatus ?? ""} name="status">
            <option value="">{t("hr.common.allStatuses")}</option>
            {HR_LOAN_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div />
          <Button type="submit" variant="secondary">
            {t("hr.common.filter")}
          </Button>
        </form>

        <form action={createEmployeeLoanAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
          <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="loanType">
            {HR_LOAN_TYPES.map((loanType) => (
              <option key={loanType.value} value={loanType.value}>
                {loanType.label}
              </option>
            ))}
          </select>
          <Input min="1" name="principalAmount" placeholder={t("hr.loans.principalPlaceholder")} required step="0.01" type="number" />
          <Input defaultValue="12" min="1" name="termMonths" placeholder={t("hr.loans.termPlaceholder")} type="number" />
          <Input defaultValue="0" min="0" name="interestRate" placeholder={t("hr.loans.interestPlaceholder")} step="0.01" type="number" />
          <Button type="submit" variant="primary">
            {t("hr.loans.submit")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
            { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
            { header: t("hr.common.type"), key: "type", render: (r) => r.loanType },
            { header: t("hr.loans.column.principal"), key: "principal", render: (r) => `${r.principalAmount.toLocaleString()} ${r.currencyCode}` },
            { header: t("hr.loans.column.outstanding"), key: "balance", render: (r) => `${r.outstandingBalance.toLocaleString()} ${r.currencyCode}` },
            {
              header: t("hr.loans.column.monthly"),
              key: "monthly",
              render: (r) => (r.monthlyInstallment ? `${r.monthlyInstallment.toLocaleString()} ${r.currencyCode}` : "—"),
            },
            { header: t("hr.common.status"), key: "status", render: (r) => r.status },
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
      </div>
    </PageContainer>
  );
}
