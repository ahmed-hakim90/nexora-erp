"use client";

import {
  approveEmployeeAdvanceAction,
  cancelEmployeeAdvanceAction,
  createEmployeeAdvanceAction,
  disburseEmployeeAdvanceAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_ADVANCE_STATUSES, HR_ADVANCE_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeeAdvance } from "@/features/hr/financial-services-foundation";
import { resolveHrPageHelp, resolveHrFieldHelp, translateHrAdvanceType, translateHrStatus } from "@/features/hr/public-api";
import {
  Button,
  EnterpriseDataTable,
  EntityLookup,
  FieldGroup,
  FormSection,
  Input,
  nativeSelectClassName,
  PageActions,
  PageContainer,
  PageHeader,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

export function HrAdvancesWorkspace({
  activeCount,
  defaultSearch,
  defaultStatus,
  pendingCount,
  records,
  searchHasNoMatches,
  totalOutstanding,
}: Readonly<{
  activeCount: number;
  defaultSearch?: string;
  defaultStatus?: string;
  pendingCount: number;
  records: readonly HrEmployeeAdvance[];
  searchHasNoMatches?: boolean;
  totalOutstanding: number;
}>) {
  const t = useTranslations();
  if (searchHasNoMatches) {
    return (
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description={t("hr.advances.description")}
          help={resolveHrPageHelp("advances")}
          title={t("hr.advances.title")}
        />
        <p className="text-sm text-muted-foreground">{t("hr.advances.emptySearch")}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.advances.description")}
        help={resolveHrPageHelp("advances")}
        title={t("hr.advances.title")}
      >
        <PageActions>
          <a className={secondaryButtonLinkClassName} href="/api/hr/advances/export">
            {t("hr.common.exportCsv")}
          </a>
        </PageActions>
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.advances.kpi.outstanding")}</p>
            <p className="text-2xl font-semibold">{totalOutstanding.toLocaleString()} SAR</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.advances.kpi.active")}</p>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.advances.kpi.pendingApproval")}</p>
            <p className="text-2xl font-semibold">{pendingCount}</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
          <section className="order-2 min-w-0 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
            <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
              <h2 className="mb-3 text-sm font-medium">{t("hr.advances.filterTitle")}</h2>
              <form action="/erp/hr/advances" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]">
                <Input defaultValue={defaultSearch ?? ""} name="search" placeholder={t("hr.common.searchEmployee")} />
                <select className={nativeSelectClassName} defaultValue={defaultStatus ?? ""} name="status">
                  <option value="">{t("hr.common.allStatuses")}</option>
                  {HR_ADVANCE_STATUSES.map((s) => (
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
                { header: t("hr.common.type"), key: "type", render: (r) => translateHrAdvanceType(t, r.advanceType) },
                {
                  header: t("hr.advances.column.requested"),
                  key: "requested",
                  render: (r) => `${r.requestedAmount.toLocaleString()} ${r.currencyCode}`,
                },
                {
                  header: t("hr.advances.column.outstanding"),
                  key: "balance",
                  render: (r) => `${r.outstandingBalance.toLocaleString()} ${r.currencyCode}`,
                },
                { header: t("hr.common.status"), key: "status", render: (r) => translateHrStatus(t, r.status) },
                { header: t("hr.advances.column.requestDate"), key: "date", render: (r) => r.requestDate },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (r) => (
                    <div className="flex flex-wrap gap-1">
                      {r.status === "submitted" ? (
                        <>
                          <form action={approveEmployeeAdvanceAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="primary">
                              {t("hr.common.approve")}
                            </Button>
                          </form>
                          <form action={cancelEmployeeAdvanceAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="secondary">
                              {t("hr.common.reject")}
                            </Button>
                          </form>
                        </>
                      ) : null}
                      {r.status === "approved" ? (
                        <form action={disburseEmployeeAdvanceAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="primary">
                            {t("hr.advances.disburse")}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.advances.empty")}
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={records}
              rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
            />
          </section>

          <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
            <FormSection description={t("hr.advances.createDescription")} title={t("hr.advances.createTitle")}>
              <form action={createEmployeeAdvanceAction} className="space-y-4">
                <FieldGroup isRequired label={t("hr.common.employee")}>
                  <EntityLookup
                    label={t("hr.common.searchEmployee")}
                    name="employeeId"
                    providerKey="hr.employees.lookup"
                    required
                  />
                </FieldGroup>
                <FieldGroup label={t("hr.common.type")}>
                  <select className={nativeSelectClassName} defaultValue="salary" name="advanceType">
                    {HR_ADVANCE_TYPES.map((advanceType) => (
                      <option key={advanceType.value} value={advanceType.value}>
                        {translateHrAdvanceType(t, advanceType.value)}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup isRequired label={t("hr.advances.amountLabel")}>
                  <Input
                    min="1"
                    name="requestedAmount"
                    placeholder={t("hr.advances.amountPlaceholder")}
                    required
                    step="0.01"
                    type="number"
                  />
                </FieldGroup>
                <FieldGroup help={resolveHrFieldHelp("advanceDeductionMonths")} label={t("hr.advances.deductionMonths")}>
                  <Input defaultValue="1" min="1" name="deductionMonths" type="number" />
                </FieldGroup>
                <FieldGroup label={t("hr.advances.reasonOptional")}>
                  <Input name="reason" placeholder={t("hr.advances.reasonOptional")} />
                </FieldGroup>
                <div className="border-t border-[hsl(var(--border))] pt-4">
                  <Button className="w-full" type="submit" variant="primary">
                    {t("hr.advances.submit")}
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
