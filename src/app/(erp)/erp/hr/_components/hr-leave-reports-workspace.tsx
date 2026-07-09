"use client";

import Link from "next/link";

import type { HrLeaveRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";
import { EnterpriseDataTable, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

const LEAVE_REPORT_TABS = ["balances", "ledger", "carry-forward", "encashment"] as const;

export function HrLeaveReportsWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrLeaveRuntimeWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const activeTab = resolveHrSectionTab(query.tab, LEAVE_REPORT_TABS, "balances");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/leave/reports", { tab });

  const navItems = [
    { href: href("balances"), key: "balances", label: t("hr.leave.tab.balances") },
    { href: href("ledger"), key: "ledger", label: t("hr.leave.tab.ledger") },
    { href: href("carry-forward"), key: "carry-forward", label: t("hr.leave.tab.carryForward") },
    { href: href("encashment"), key: "encashment", label: t("hr.leave.tab.encashment") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.leave.reports.description")}
      headerActions={
        <Link className={secondaryButtonLinkClassName} href="/erp/hr/leave">
          {t("hr.leave.reports.backToLeave")}
        </Link>
      }
      navItems={navItems}
      title={t("hr.leave.reports.title")}
      workspaceKey="leave-reports"
    >
      {activeTab === "balances" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.leave.reports.section.balances")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.type"), key: "type", render: (record) => record.leaveType },
              { header: t("hr.leave.column.available"), key: "available", render: (record) => record.available },
              { header: t("hr.leave.column.pending"), key: "pending", render: (record) => record.pending },
              { header: t("hr.leave.column.negative"), key: "negative", render: (record) => record.negative },
            ]}
            emptyMessage={t("hr.leave.empty.balances")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.balances.length || 1, totalRows: data.balances.length }}
            records={data.balances}
          />
        </section>
      ) : null}

      {activeTab === "ledger" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.leave.reports.section.ledger")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.movement"), key: "movement", render: (record) => record.movementKind },
              { header: t("hr.leave.column.quantity"), key: "qty", render: (record) => record.quantity },
              { header: t("hr.leave.column.balanceAfter"), key: "after", render: (record) => record.balanceAfter },
            ]}
            emptyMessage={t("hr.leave.empty.ledger")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.ledger.length || 1, totalRows: data.ledger.length }}
            records={data.ledger}
          />
        </section>
      ) : null}

      {activeTab === "carry-forward" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.leave.reports.section.carryForward")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.leave.column.scope"), key: "scope", render: (record) => record.scope },
              { header: t("hr.leave.column.employees"), key: "employees", render: (record) => record.employeeCount },
              { header: t("hr.leave.column.totalCarried"), key: "total", render: (record) => record.totalQuantityCarried },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.leave.empty.carryForward")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.carryForwardRuns.length || 1, totalRows: data.carryForwardRuns.length }}
            records={data.carryForwardRuns}
          />
        </section>
      ) : null}

      {activeTab === "encashment" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="font-medium">{t("hr.leave.reports.section.encashment")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.quantity"), key: "qty", render: (record) => record.requestedQuantity },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.leave.empty.encashment")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: data.encashments.length || 1, totalRows: data.encashments.length }}
            records={data.encashments}
          />
        </section>
      ) : null}
    </HrSectionWorkspace>
  );
}
