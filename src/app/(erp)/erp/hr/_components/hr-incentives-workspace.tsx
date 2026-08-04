"use client";

import Link from "next/link";

import { HR_INCENTIVE_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeeIncentive } from "@/features/hr/financial-services-foundation";
import {
  approveEmployeeIncentiveAction,
  createEmployeeIncentiveAction,
  rejectEmployeeIncentiveAction,
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

function buildIncentivesHref(query: Record<string, string | undefined>, overrides: Record<string, string | null | undefined> = {}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/erp/hr/incentives?${qs}` : "/erp/hr/incentives";
}

export function HrIncentivesWorkspace({
  batches,
  openBulkWizard,
  query,
  records,
}: Readonly<{
  batches: readonly HrCompensationIssuanceBatchListItem[];
  openBulkWizard: boolean;
  query: Record<string, string | undefined>;
  records: readonly HrEmployeeIncentive[];
}>) {
  const t = useTranslations();
  const activeView = query.view === "batches" ? "batches" : "records";

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.incentives.description")}
        help={resolveHrPageHelp("incentives")}
        title={t("hr.incentives.title")}
      >
        <Link className={primaryButtonLinkClassName} href={buildIncentivesHref(query, { batch: "create" })}>
          {t("hr.incentives.bulkIssue")}
        </Link>
      </PageHeader>

      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))] pb-2">
          <Link
            className={
              activeView === "records"
                ? "rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--muted))]"
            }
            href={buildIncentivesHref(query, { view: "records" })}
          >
            {t("hr.incentives.tab.records")}
          </Link>
          <Link
            className={
              activeView === "batches"
                ? "rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--muted))]"
            }
            href={buildIncentivesHref(query, { view: "batches" })}
          >
            {t("hr.incentives.tab.batches")}
          </Link>
        </nav>

        {activeView === "batches" ? (
          <HrCompensationIssuanceBatchTable batches={batches} documentKind="incentive" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
            <section className="order-2 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
              <EnterpriseDataTable
                columns={[
                  { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
                  { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
                  { header: t("hr.common.type"), key: "type", render: (r) => r.incentiveType },
                  {
                    header: t("hr.common.amount"),
                    key: "amount",
                    render: (r) => (r.amount ? `${r.amount.toLocaleString()} ${r.currencyCode}` : "—"),
                  },
                  {
                    header: t("hr.incentives.column.percentage"),
                    key: "pct",
                    render: (r) => (r.percentage ? `${r.percentage}%` : "—"),
                  },
                  { header: t("hr.common.effectiveDate"), key: "date", render: (r) => r.effectiveDate },
                  { header: t("hr.common.status"), key: "status", render: (r) => translateHrStatus(t, r.status) },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (r) =>
                      r.status === "submitted" ? (
                        <div className="flex flex-wrap gap-1">
                          <form action={approveEmployeeIncentiveAction.bind(null, r.id)}>
                            <Button size="sm" type="submit" variant="primary">
                              {t("hr.common.approve")}
                            </Button>
                          </form>
                          <form action={rejectEmployeeIncentiveAction.bind(null, r.id)}>
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
                emptyMessage={t("hr.incentives.empty")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={records}
                rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
              />
            </section>

            <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
              <FormSection description={t("hr.incentives.createDescription")} title={t("hr.incentives.createTitle")}>
                <form action={createEmployeeIncentiveAction} className="space-y-4">
                  <FieldGroup isRequired label={t("hr.common.employee")}>
                    <EntityLookup label={t("hr.common.searchEmployee")} name="employeeId" providerKey="hr.employees.lookup" required />
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.type")}>
                    <select className={nativeSelectClassName} name="incentiveType">
                      {HR_INCENTIVE_TYPES.map((incentiveType) => (
                        <option key={incentiveType.value} value={incentiveType.value}>
                          {incentiveType.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label={t("hr.incentives.amountField")}>
                    <Input min="0" name="amount" step="0.01" type="number" />
                  </FieldGroup>
                  <FieldGroup label={t("hr.incentives.percentageField")}>
                    <Input max="100" min="0" name="percentage" step="0.01" type="number" />
                  </FieldGroup>
                  <DatePickerField label={t("hr.common.effectiveDate")} name="effectiveDate" />
                  <div className="border-t border-[hsl(var(--border))] pt-4">
                    <Button className="w-full" type="submit" variant="primary">
                      {t("hr.incentives.add")}
                    </Button>
                  </div>
                </form>
              </FormSection>
            </aside>
          </div>
        )}
      </div>

      <HrCompensationIssuanceWizard
        defaultSubtype="kpi"
        descriptionKey="hr.incentives.description"
        documentKind="incentive"
        open={openBulkWizard}
        query={query}
        subtypeOptions={HR_INCENTIVE_TYPES}
        titleKey="hr.compensationIssuance.wizard.incentivesTitle"
      />
    </PageContainer>
  );
}
