"use client";

import Link from "next/link";

import type { HrOvertimeRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-overtime-runtime.loader";
import { EnterpriseDataTable, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrOvertimeReportsSummaryRow = {
  approved: number;
  hours: number;
  id: string;
  overtimeType: string;
  pending: number;
  requests: number;
};

const OVERTIME_REPORT_TABS = ["register", "summary", "candidates", "approvals"] as const;

export function HrOvertimeReportsWorkspace({
  data,
  query = {},
  summaryRows,
}: Readonly<{
  data: HrOvertimeRuntimeWorkspaceData;
  query?: Record<string, string | undefined>;
  summaryRows: readonly HrOvertimeReportsSummaryRow[];
}>) {
  const t = useTranslations();
  const activeTab = resolveHrSectionTab(query.tab, OVERTIME_REPORT_TABS, "register");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/overtime/reports", { tab });

  const navItems = [
    { href: href("register"), key: "register", label: t("hr.overtime.reports.tab.register") },
    { href: href("summary"), key: "summary", label: t("hr.overtime.reports.tab.summary") },
    { href: href("candidates"), key: "candidates", label: t("hr.overtime.reports.tab.candidates") },
    { href: href("approvals"), key: "approvals", label: t("hr.overtime.reports.tab.approvals") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.overtime.reports.description")}
      headerActions={
        <Link className={secondaryButtonLinkClassName} href="/erp/hr/overtime">
          {t("hr.overtime.reports.back")}
        </Link>
      }
      navItems={navItems}
      title={t("hr.overtime.reports.title")}
      workspaceKey="overtime-reports"
    >
      {activeTab === "register" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.overtime.reports.registerTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.hours"), key: "hours", render: (record) => (record.durationMinutes / 60).toFixed(2) },
              { header: t("hr.common.type"), key: "type", render: (record) => record.overtimeType },
              { header: t("hr.common.rate"), key: "rate", render: (record) => `${record.rateMultiplier}x` },
              {
                header: t("hr.common.payrollEligible"),
                key: "payroll",
                render: (record) => (record.payrollEligible ? t("hr.common.yes") : t("hr.common.no")),
              },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.overtime.reports.emptyRegister")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.requests.length || 1, totalRows: data.requests.length }}
            records={data.requests}
          />
        </section>
      ) : null}

      {activeTab === "summary" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.overtime.reports.summaryTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.type"), key: "type", render: (record) => record.overtimeType },
              { header: t("hr.common.requests"), key: "requests", render: (record) => record.requests },
              { header: t("hr.common.approved"), key: "approved", render: (record) => record.approved },
              { header: t("hr.common.pending"), key: "pending", render: (record) => record.pending },
              { header: t("hr.common.totalHours"), key: "hours", render: (record) => record.hours },
            ]}
            emptyMessage={t("hr.overtime.reports.emptySummary")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: summaryRows.length || 1, totalRows: summaryRows.length }}
            records={summaryRows}
          />
        </section>
      ) : null}

      {activeTab === "candidates" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.overtime.candidatesTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.minutes"), key: "minutes", render: (record) => record.candidateMinutes },
              { header: t("hr.common.type"), key: "type", render: (record) => record.overtimeType },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.overtime.reports.emptyCandidates")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.candidates.length || 1, totalRows: data.candidates.length }}
            records={data.candidates}
          />
        </section>
      ) : null}

      {activeTab === "approvals" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.lateEarly.approvalHistoryTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.event"), key: "event", render: (record) => record.eventKind },
              { header: t("hr.common.reason"), key: "reason", render: (record) => record.reason ?? "—" },
              { header: t("hr.common.when"), key: "when", render: (record) => record.occurredAt },
            ]}
            emptyMessage={t("hr.overtime.reports.emptyApprovals")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.approvalEvents.length || 1, totalRows: data.approvalEvents.length }}
            records={data.approvalEvents}
          />
        </section>
      ) : null}
    </HrSectionWorkspace>
  );
}
