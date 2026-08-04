"use client";

import Link from "next/link";

import { HR_PENALTY_SEVERITIES, HR_PENALTY_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeePenalty } from "@/features/hr/financial-services-foundation";
import { acknowledgePenaltyAction, createEmployeePenaltyAction } from "@/features/hr/routes/actions/hr-financial.actions";
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

function buildPenaltiesHref(query: Record<string, string | undefined>, overrides: Record<string, string | null | undefined> = {}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/erp/hr/penalties?${qs}` : "/erp/hr/penalties";
}

export function HrPenaltiesWorkspace({
  batches,
  defaultEmployeeId,
  defaultSearch,
  defaultStatus,
  openBulkWizard,
  query,
  records,
}: Readonly<{
  batches: readonly HrCompensationIssuanceBatchListItem[];
  defaultEmployeeId?: string;
  defaultSearch?: string;
  defaultStatus?: string;
  openBulkWizard: boolean;
  query: Record<string, string | undefined>;
  records: readonly HrEmployeePenalty[];
}>) {
  const t = useTranslations();
  const activeView = query.view === "batches" ? "batches" : "records";

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.penalties.description")}
        help={resolveHrPageHelp("penalties")}
        title={t("hr.penalties.title")}
      >
        <Link className={primaryButtonLinkClassName} href={buildPenaltiesHref(query, { batch: "create" })}>
          {t("hr.penalties.bulkIssue")}
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
            href={buildPenaltiesHref(query, { view: "records" })}
          >
            {t("hr.penalties.tab.records")}
          </Link>
          <Link
            className={
              activeView === "batches"
                ? "rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--accent-foreground))]"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--muted))]"
            }
            href={buildPenaltiesHref(query, { view: "batches" })}
          >
            {t("hr.penalties.tab.batches")}
          </Link>
        </nav>

        {activeView === "batches" ? (
          <HrCompensationIssuanceBatchTable batches={batches} documentKind="penalty" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
            <section className="order-2 min-w-0 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
              <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
                <h2 className="mb-3 text-sm font-medium">{t("hr.penalties.filterTitle")}</h2>
                <form action="/erp/hr/penalties" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto]">
                  <Input defaultValue={defaultSearch ?? ""} name="search" placeholder={t("hr.common.searchEmployee")} />
                  <Input defaultValue={defaultStatus ?? ""} name="status" placeholder={t("hr.common.statusFilter")} />
                  <Button className="w-full md:w-auto" type="submit" variant="secondary">
                    {t("hr.common.filter")}
                  </Button>
                </form>
              </section>

              <EnterpriseDataTable
                columns={[
                  { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
                  { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
                  { header: t("hr.common.type"), key: "type", render: (r) => r.penaltyType },
                  { header: t("hr.common.amount"), key: "amount", render: (r) => (r.amount ? `${r.amount.toLocaleString()} ${r.currencyCode}` : "—") },
                  { header: t("hr.penalties.incidentDate"), key: "incident", render: (r) => r.incidentDate },
                  { header: t("hr.common.status"), key: "status", render: (r) => translateHrStatus(t, r.status) },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (r) =>
                      r.status === "submitted" ? (
                        <form action={acknowledgePenaltyAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="primary">
                            {t("hr.penalties.acknowledge")}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">{translateHrStatus(t, r.status)}</span>
                      ),
                  },
                ]}
                emptyMessage={t("hr.penalties.empty")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={records}
                rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
              />
            </section>

            <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
              <FormSection description={t("hr.penalties.createDescription")} title={t("hr.penalties.createTitle")}>
                <form action={createEmployeePenaltyAction} className="space-y-4">
                  <FieldGroup isRequired label={t("hr.common.employee")}>
                    <EntityLookup
                      label={t("hr.common.searchEmployee")}
                      name="employeeId"
                      providerKey="hr.employees.lookup"
                      required
                      value={defaultEmployeeId}
                    />
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.type")}>
                    <select className={nativeSelectClassName} name="penaltyType">
                      {HR_PENALTY_TYPES.map((penaltyType) => (
                        <option key={penaltyType.value} value={penaltyType.value}>
                          {penaltyType.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup label={t("hr.common.severity")}>
                    <select className={nativeSelectClassName} name="severity">
                      {HR_PENALTY_SEVERITIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup isRequired label={t("hr.penalties.descriptionField")}>
                    <Input name="description" required />
                  </FieldGroup>
                  <DatePickerField label={t("hr.penalties.incidentDate")} name="incidentDate" />
                  <FieldGroup label={t("hr.penalties.amountField")}>
                    <Input min="0" name="amount" step="0.01" type="number" />
                  </FieldGroup>
                  <div className="border-t border-[hsl(var(--border))] pt-4">
                    <Button className="w-full" type="submit" variant="primary">
                      {t("hr.penalties.issue")}
                    </Button>
                  </div>
                </form>
              </FormSection>
            </aside>
          </div>
        )}
      </div>

      <HrCompensationIssuanceWizard
        defaultSubtype="deduction"
        descriptionKey="hr.penalties.description"
        documentKind="penalty"
        open={openBulkWizard}
        query={query}
        requiresReason
        subtypeOptions={HR_PENALTY_TYPES}
        titleKey="hr.compensationIssuance.wizard.penaltiesTitle"
      />
    </PageContainer>
  );
}
