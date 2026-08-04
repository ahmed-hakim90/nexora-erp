"use client";

import Link from "next/link";

import type { HrEmployeeBonus } from "@/features/hr/financial-services-foundation";
import { HR_BONUS_TYPES } from "@/features/hr/financial-services-foundation";
import {
  approveBonusAction,
  createEmployeeBonusAction,
  rejectBonusAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import type { HrCompensationIssuanceBatchListItem } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { resolveHrPageHelp, translateHrStatus } from "@/features/hr/public-api";
import {
  Button,
  DatePickerField,
  EnterpriseDataTable,
  EntityLookup,
  FieldGroup,
  FormSection,
  Input,
  PageContainer,
  PageHeader,
  primaryButtonLinkClassName,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

import { HrCompensationIssuanceBatchTable } from "./hr-compensation-issuance-batch-table";
import { HrCompensationIssuanceWizard } from "./hr-compensation-issuance-wizard";

function buildBonusesHref(query: Record<string, string | undefined>, overrides: Record<string, string | null | undefined> = {}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/erp/hr/bonuses?${qs}` : "/erp/hr/bonuses";
}

export function HrBonusesWorkspace({
  approvedThisMonthAmount,
  batches,
  openBulkWizard,
  pendingAmount,
  pendingCount,
  query,
  records,
}: Readonly<{
  approvedThisMonthAmount: number;
  batches: readonly HrCompensationIssuanceBatchListItem[];
  openBulkWizard: boolean;
  pendingAmount: number;
  pendingCount: number;
  query: Record<string, string | undefined>;
  records: readonly HrEmployeeBonus[];
}>) {
  const t = useTranslations();
  const activeView = query.view === "batches" ? "batches" : "records";

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.bonuses.description")}
        help={resolveHrPageHelp("bonuses")}
        title={t("hr.bonuses.title")}
      >
        <Link className={primaryButtonLinkClassName} href={buildBonusesHref(query, { batch: "create" })}>
          {t("hr.bonuses.bulkIssue")}
        </Link>
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.bonuses.kpi.pendingApproval")}</p>
            <p className="text-2xl font-semibold">{pendingCount}</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.bonuses.kpi.pendingAmount")}</p>
            <p className="text-2xl font-semibold">{pendingAmount.toLocaleString()} SAR</p>
          </article>
          <article className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{t("hr.bonuses.kpi.approvedThisMonth")}</p>
            <p className="text-2xl font-semibold">{approvedThisMonthAmount.toLocaleString()} SAR</p>
          </article>
        </div>

        <nav className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))] pb-2">
          <Link
            className={
              activeView === "records"
                ? "rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--muted))]"
            }
            href={buildBonusesHref(query, { view: "records" })}
          >
            {t("hr.bonuses.tab.records")}
          </Link>
          <Link
            className={
              activeView === "batches"
                ? "rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--muted))]"
            }
            href={buildBonusesHref(query, { view: "batches" })}
          >
            {t("hr.bonuses.tab.batches")}
          </Link>
        </nav>

        {activeView === "batches" ? (
          <HrCompensationIssuanceBatchTable batches={batches} documentKind="bonus" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
            <section className="order-2 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
              <EnterpriseDataTable
                columns={[
                  { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
                  { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
                  { header: t("hr.common.type"), key: "type", render: (r) => r.bonusType },
                  { header: t("hr.common.amount"), key: "amount", render: (r) => `${r.amount.toLocaleString()} ${r.currencyCode}` },
                  { header: t("hr.common.effectiveDate"), key: "date", render: (r) => r.effectiveDate },
                  { header: t("hr.common.status"), key: "status", render: (r) => translateHrStatus(t, r.status) },
                  { header: t("hr.common.reason"), key: "reason", render: (r) => r.reason ?? "—" },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (r) =>
                      r.status === "submitted" ? (
                        <div className="flex flex-wrap gap-1">
                          <form action={approveBonusAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="primary">
                              {t("hr.common.approve")}
                            </Button>
                          </form>
                          <form action={rejectBonusAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="secondary">
                              {t("hr.common.reject")}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{translateHrStatus(t, r.status)}</span>
                      ),
                  },
                ]}
                emptyMessage={t("hr.bonuses.empty")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={records}
                rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
              />
            </section>

            <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
              <FormSection description={t("hr.bonuses.createDescription")} title={t("hr.bonuses.createTitle")}>
                <form action={createEmployeeBonusAction} className="space-y-4">
                  <FieldGroup isRequired label={t("hr.common.employee")}>
                    <EntityLookup label={t("hr.common.searchEmployee")} name="employeeId" providerKey="hr.employees.lookup" required />
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.type")}>
                    <select className={nativeSelectClassName} defaultValue="eid" name="bonusType">
                      {HR_BONUS_TYPES.map((bonusType) => (
                        <option key={bonusType.value} value={bonusType.value}>
                          {bonusType.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup isRequired label={t("hr.common.amount")}>
                    <Input min="0.01" name="amount" placeholder={t("hr.bonuses.amountPlaceholder")} required step="0.01" type="number" />
                  </FieldGroup>
                  <DatePickerField label={t("hr.common.effectiveDate")} name="effectiveDate" />
                  <FieldGroup label={t("hr.common.reason")}>
                    <Input name="reason" placeholder={t("hr.common.reason")} />
                  </FieldGroup>
                  <div className="border-t border-[hsl(var(--border))] pt-4">
                    <Button className="w-full" type="submit" variant="primary">
                      {t("hr.bonuses.add")}
                    </Button>
                  </div>
                </form>
              </FormSection>
            </aside>
          </div>
        )}
      </div>

      <HrCompensationIssuanceWizard
        defaultSubtype="eid"
        descriptionKey="hr.bonuses.description"
        documentKind="bonus"
        open={openBulkWizard}
        query={query}
        subtypeOptions={HR_BONUS_TYPES}
        titleKey="hr.compensationIssuance.wizard.title"
      />
    </PageContainer>
  );
}
