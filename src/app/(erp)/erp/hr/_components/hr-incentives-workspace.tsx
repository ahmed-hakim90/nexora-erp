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

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.incentives.description")}
        help={resolveHrPageHelp("incentives")}
        title={t("hr.incentives.title")}
      />
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link className={primaryButtonLinkClassName} href="/erp/hr/incentives?batch=create">
            {t("hr.incentives.bulkIssue")}
          </Link>
        </div>

        <HrCompensationIssuanceBatchTable batches={batches} documentKind="incentive" />

        <form action={createEmployeeIncentiveAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
          <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="incentiveType">
            {HR_INCENTIVE_TYPES.map((incentiveType) => (
              <option key={incentiveType.value} value={incentiveType.value}>
                {incentiveType.label}
              </option>
            ))}
          </select>
          <Input min="0" name="amount" placeholder={t("hr.incentives.amountOptional")} step="0.01" type="number" />
          <Input max="100" min="0" name="percentage" placeholder={t("hr.incentives.percentageOptional")} step="0.01" type="number" />
          <DatePicker name="effectiveDate" placeholder={t("hr.common.effectiveDate")} />
          <Button type="submit" variant="primary">
            {t("hr.incentives.add")}
          </Button>
        </form>

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
            { header: t("hr.common.status"), key: "status", render: (r) => r.status },
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
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                ),
            },
          ]}
          emptyMessage={t("hr.incentives.empty")}
          getRowId={(r) => r.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
        />
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
