"use client";

import Link from "next/link";

import type { HrLateEarlyRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";
import { DatePicker, EnterpriseDataTable, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrLateEarlyReportsRollupRow = {
  deductionMinutes: number;
  earlyLeaveMinutes: number;
  employeeGroup: string;
  id: string;
  lateMinutes: number;
};

const LATE_EARLY_REPORT_TABS = ["late", "early", "rollup", "ledger"] as const;

export function HrLateEarlyReportsWorkspace({
  data,
  periodEnd,
  periodStart,
  query = {},
  rollupRows,
}: Readonly<{
  data: HrLateEarlyRuntimeWorkspaceData;
  periodEnd?: string;
  periodStart?: string;
  query?: Record<string, string | undefined>;
  rollupRows: readonly HrLateEarlyReportsRollupRow[];
}>) {
  const t = useTranslations();
  const lateViolations = data.violations.filter((record) => record.lateMinutes > 0);
  const earlyViolations = data.violations.filter((record) => record.earlyLeaveMinutes > 0);
  const activeTab = resolveHrSectionTab(query.tab, LATE_EARLY_REPORT_TABS, "late");
  const href = (tab: string) =>
    buildHrSectionHref("/erp/hr/late-early/reports", {
      tab,
      periodEnd,
      periodStart,
    });

  const navItems = [
    { href: href("late"), key: "late", label: t("hr.lateEarly.reports.tab.late") },
    { href: href("early"), key: "early", label: t("hr.lateEarly.reports.tab.early") },
    { href: href("rollup"), key: "rollup", label: t("hr.lateEarly.reports.tab.rollup") },
    { href: href("ledger"), key: "ledger", label: t("hr.lateEarly.reports.tab.ledger") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.lateEarly.reports.description")}
      filters={
        <form className="grid gap-3 md:grid-cols-3" method="get">
          <input name="tab" type="hidden" value={activeTab} />
          <DatePicker defaultValue={periodStart} name="periodStart" placeholder={t("hr.common.periodStart")} />
          <DatePicker defaultValue={periodEnd} name="periodEnd" placeholder={t("hr.common.periodEnd")} />
          <button className={secondaryButtonLinkClassName} type="submit">
            {t("hr.lateEarly.reports.applyPeriod")}
          </button>
        </form>
      }
      headerActions={
        <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early">
          {t("hr.lateEarly.reports.back")}
        </Link>
      }
      navItems={navItems}
      title={t("hr.lateEarly.reports.title")}
      workspaceKey="late-early-reports"
    >
      {activeTab === "late" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.lateEarly.reports.registerTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.lateMin"), key: "late", render: (record) => record.lateMinutes },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.lateEarly.reports.emptyLate")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: lateViolations.length || 1, totalRows: lateViolations.length }}
            records={lateViolations}
          />
        </section>
      ) : null}

      {activeTab === "early" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.lateEarly.reports.earlyTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.earlyMin"), key: "early", render: (record) => record.earlyLeaveMinutes },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.lateEarly.reports.emptyEarly")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: earlyViolations.length || 1, totalRows: earlyViolations.length }}
            records={earlyViolations}
          />
        </section>
      ) : null}

      {activeTab === "rollup" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.lateEarly.reports.tab.rollup")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeGroup },
              { header: t("hr.common.lateMin"), key: "late", render: (record) => record.lateMinutes },
              { header: t("hr.common.earlyMin"), key: "early", render: (record) => record.earlyLeaveMinutes },
              { header: t("hr.common.deduction"), key: "deduction", render: (record) => record.deductionMinutes },
            ]}
            emptyMessage={t("hr.lateEarly.reports.emptyRollup")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: rollupRows.length || 1, totalRows: rollupRows.length }}
            records={rollupRows}
          />
        </section>
      ) : null}

      {activeTab === "ledger" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.lateEarly.ledgerTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.asOfDate },
              { header: t("hr.common.movement"), key: "movement", render: (record) => record.movementKind },
              { header: t("hr.common.late"), key: "late", render: (record) => record.lateMinutes },
              { header: t("hr.common.early"), key: "early", render: (record) => record.earlyLeaveMinutes },
              { header: t("hr.common.deduction"), key: "deduction", render: (record) => record.deductionMinutes },
            ]}
            emptyMessage={t("hr.lateEarly.reports.emptyLedger")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.ledger.length || 1, totalRows: data.ledger.length }}
            records={data.ledger}
          />
        </section>
      ) : null}
    </HrSectionWorkspace>
  );
}
