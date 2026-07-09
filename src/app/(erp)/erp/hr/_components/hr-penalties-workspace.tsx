"use client";

import Link from "next/link";

import { HR_PENALTY_SEVERITIES, HR_PENALTY_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeePenalty } from "@/features/hr/financial-services-foundation";
import {
  acknowledgePenaltyAction,
  createEmployeePenaltyAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import type { HrCompensationIssuanceBatchListItem } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  PageContainer,
  PageHeader,
  primaryButtonLinkClassName,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

import { HrCompensationIssuanceBatchTable } from "./hr-compensation-issuance-batch-table";
import { HrCompensationIssuanceWizard } from "./hr-compensation-issuance-wizard";

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

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.penalties.description")}
        help={resolveHrPageHelp("penalties")}
        title={t("hr.penalties.title")}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <form action="/erp/hr/penalties" className="grid flex-1 gap-3 md:grid-cols-3">
            <Input defaultValue={defaultSearch ?? ""} name="search" placeholder={t("hr.common.searchEmployee")} />
            <Input defaultValue={defaultStatus ?? ""} name="status" placeholder={t("hr.common.statusFilter")} />
            <Button type="submit" variant="secondary">
              {t("hr.common.filter")}
            </Button>
          </form>
          <Link className={primaryButtonLinkClassName} href="/erp/hr/penalties?batch=create">
            {t("hr.penalties.bulkIssue")}
          </Link>
        </div>

        <HrCompensationIssuanceBatchTable batches={batches} documentKind="penalty" />

        <form action={createEmployeePenaltyAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-7">
          <EntityLookup value={defaultEmployeeId} label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="penaltyType">
            {HR_PENALTY_TYPES.map((penaltyType) => (
              <option key={penaltyType.value} value={penaltyType.value}>
                {penaltyType.label}
              </option>
            ))}
          </select>
          <select className={nativeSelectClassName} name="severity">
            {HR_PENALTY_SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Input name="description" placeholder={t("hr.penalties.descriptionPlaceholder")} required />
          <DatePicker name="incidentDate" placeholder={t("hr.penalties.incidentDate")} />
          <Input min="0" name="amount" placeholder={t("hr.penalties.amountOptional")} step="0.01" type="number" />
          <Button type="submit" variant="primary">
            {t("hr.penalties.issue")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
            { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
            { header: t("hr.common.type"), key: "type", render: (r) => r.penaltyType },
            { header: t("hr.common.amount"), key: "amount", render: (r) => (r.amount ? `${r.amount.toLocaleString()} ${r.currencyCode}` : "—") },
            { header: t("hr.penalties.incidentDate"), key: "incident", render: (r) => r.incidentDate },
            { header: t("hr.common.status"), key: "status", render: (r) => r.status },
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
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                ),
            },
          ]}
          emptyMessage={t("hr.penalties.empty")}
          getRowId={(r) => r.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
        />
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
