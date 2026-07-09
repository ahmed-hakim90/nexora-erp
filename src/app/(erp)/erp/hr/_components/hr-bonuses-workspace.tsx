"use client";

import Link from "next/link";
import { useTransition } from "react";

import type { HrEmployeeBonus } from "@/features/hr/financial-services-foundation";
import { HR_BONUS_TYPES } from "@/features/hr/financial-services-foundation";
import {
  approveBonusAction,
  createEmployeeBonusAction,
  rejectBonusAction,
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

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.bonuses.description")}
        help={resolveHrPageHelp("bonuses")}
        title={t("hr.bonuses.title")}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3">
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
          <Link className={primaryButtonLinkClassName} href="/erp/hr/bonuses?batch=create">
            {t("hr.bonuses.bulkIssue")}
          </Link>
        </div>

        <HrCompensationIssuanceBatchTable batches={batches} documentKind="bonus" />

        <form action={createEmployeeBonusAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
          <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="bonusType">
            {HR_BONUS_TYPES.map((bonusType) => (
              <option key={bonusType.value} value={bonusType.value}>
                {bonusType.label}
              </option>
            ))}
          </select>
          <Input min="0.01" name="amount" placeholder={t("hr.bonuses.amountPlaceholder")} required step="0.01" type="number" />
          <DatePicker name="effectiveDate" placeholder={t("hr.common.effectiveDate")} />
          <Input name="reason" placeholder={t("hr.common.reason")} />
          <Button type="submit" variant="primary">
            {t("hr.bonuses.add")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.documentNumber"), key: "doc", render: (r) => r.documentNumber },
            { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
            { header: t("hr.common.type"), key: "type", render: (r) => r.bonusType },
            { header: t("hr.common.amount"), key: "amount", render: (r) => `${r.amount.toLocaleString()} ${r.currencyCode}` },
            { header: t("hr.common.effectiveDate"), key: "date", render: (r) => r.effectiveDate },
            { header: t("hr.common.status"), key: "status", render: (r) => r.status },
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
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                ),
            },
          ]}
          emptyMessage={t("hr.bonuses.empty")}
          getRowId={(r) => r.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
        />
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
