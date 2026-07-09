"use client";

import {
  approvePayrollRunAction,
  calculatePayrollRunAction,
  closePayrollPeriodAction,
  createPayrollRunAction,
  deletePayrollRunAction,
  lockPayrollPeriodAction,
  publishPayslipsAction,
  reopenPayrollPeriodAction,
  validatePayrollPeriodAction,
  validatePayrollRunAction,
} from "@/features/hr/routes/actions/hr-payroll.actions";
import { ensureEgyptPayrollPackAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, Input, nativeSelectClassName, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";
import Link from "next/link";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrPayrollPeriodRecord = Readonly<{
  endDate: string;
  id: string;
  periodName: string;
  rawStatus: string;
  startDate: string;
  status: string;
}>;

export type HrPayrollRunRecord = Readonly<{
  createdAt: string;
  group: string;
  id: string;
  period: string;
  rawStatus: string;
  runType: string;
  status: string;
}>;

export type HrPayrollValidationIssueRecord = Readonly<{
  employeeId: string | null;
  id: string;
  message: string;
  periodName: string;
  ruleCode: string | null;
  ruleCategory: string;
  severity: string;
}>;

const PAYROLL_TABS = ["overview", "periods", "runs", "localization"] as const;

export function HrPayrollReadinessWorkspace({
  draftHidden,
  exceptionsCount,
  groups,
  periods,
  payslipsCount,
  query = {},
  resultsCount,
  runRecords,
  runsCount,
  validationIssueRecords = [],
  validationWarningsCount = 0,
}: Readonly<{
  draftHidden: number;
  exceptionsCount: number;
  groups: readonly { id: string; label: string }[];
  payslipsCount: number;
  periods: readonly HrPayrollPeriodRecord[];
  query?: Record<string, string | undefined>;
  resultsCount: number;
  runRecords: readonly HrPayrollRunRecord[];
  runsCount: number;
  validationIssueRecords?: readonly HrPayrollValidationIssueRecord[];
  validationWarningsCount?: number;
}>) {
  const t = useTranslations();
  const activeTab = resolveHrSectionTab(query.tab, PAYROLL_TABS, "overview");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/payroll-readiness", { tab });

  const navItems = [
    { href: href("overview"), key: "overview", label: t("hr.payrollReadiness.tab.overview") },
    { href: href("periods"), key: "periods", label: t("hr.payrollReadiness.tab.periods") },
    { href: href("runs"), key: "runs", label: t("hr.payrollReadiness.tab.runs") },
    { href: href("localization"), key: "localization", label: t("hr.payrollReadiness.tab.localization") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.payrollReadiness.description")}
      help={resolveHrPageHelp("payrollReadiness")}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.payrollReadiness.kpi.runs.helper"),
          href: href("runs"),
          label: t("hr.payrollReadiness.kpi.runs"),
          value: runsCount,
        },
        {
          helper: t("hr.payrollReadiness.kpi.results.helper"),
          href: href("runs"),
          label: t("hr.payrollReadiness.kpi.results"),
          value: resultsCount,
        },
        {
          helper: t("hr.payrollReadiness.kpi.validationIssues.helper"),
          href: href("periods"),
          label: t("hr.payrollReadiness.kpi.validationIssues"),
          value: exceptionsCount,
        },
        {
          helper: t("hr.payrollReadiness.kpi.validationWarnings.helper"),
          href: href("periods"),
          label: t("hr.payrollReadiness.kpi.validationWarnings"),
          value: validationWarningsCount,
        },
        {
          helper: t("hr.payrollReadiness.kpi.payslips.helper"),
          href: href("overview"),
          label: t("hr.payrollReadiness.kpi.payslips"),
          value: payslipsCount,
        },
        {
          helper: t("hr.payrollReadiness.kpi.draftHidden.helper"),
          href: href("overview"),
          label: t("hr.payrollReadiness.kpi.draftHidden"),
          value: draftHidden,
        },
      ]}
      title={t("hr.payrollReadiness.title")}
      workspaceKey="payroll-readiness"
    >
      {activeTab === "overview" ? (
        <div className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.payrollReadiness.overview.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("hr.payrollReadiness.overview.body")}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {navItems.filter((item) => item.key !== "overview").map((item) => (
              <Link className={secondaryButtonLinkClassName} href={item.href} key={item.key}>
                {t("hr.common.open", { label: item.label })}
              </Link>
            ))}
          </div>
          {groups.length === 0 ? (
            <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
              <p className="text-sm text-muted-foreground">{t("hr.payrollReadiness.empty.groups")}</p>
              <Link className={`${secondaryButtonLinkClassName} mt-4 inline-flex`} href="/erp/hr/settings?tab=payroll">
                {t("hr.payrollReadiness.empty.openSettings")}
              </Link>
            </article>
          ) : null}
        </div>
      ) : null}

      {activeTab === "periods" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <div>
            <p className="text-sm font-medium">{t("hr.payrollReadiness.periods.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("hr.payrollReadiness.periods.body")}</p>
          </div>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.payrollReadiness.periods.column.period"), key: "period", render: (row) => row.periodName },
              {
                header: t("hr.payrollReadiness.periods.column.range"),
                key: "range",
                render: (row) => `${row.startDate} → ${row.endDate}`,
              },
              { header: t("hr.common.status"), key: "status", render: (row) => row.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {["open", "input_collection", "snapshot_ready", "processing", "review", "approved"].includes(row.rawStatus) ? (
                      <form action={validatePayrollPeriodAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.payrollReadiness.action.validate")}
                        </Button>
                      </form>
                    ) : null}
                    {["open", "input_collection", "snapshot_ready", "approved", "posted"].includes(row.rawStatus) ? (
                      <form action={lockPayrollPeriodAction} className="flex items-center gap-1">
                        <input name="payrollPeriodId" type="hidden" value={row.id} />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.payrollReadiness.action.lock")}
                        </Button>
                      </form>
                    ) : null}
                    {row.rawStatus === "locked" ? (
                      <form action={closePayrollPeriodAction} className="flex items-center gap-1">
                        <input name="payrollPeriodId" type="hidden" value={row.id} />
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.payrollReadiness.action.close")}
                        </Button>
                      </form>
                    ) : null}
                    {["locked", "closed", "posted", "paid"].includes(row.rawStatus) ? (
                      <form action={reopenPayrollPeriodAction} className="flex flex-wrap items-center gap-1">
                        <input name="payrollPeriodId" type="hidden" value={row.id} />
                        <Input className="h-8 w-40" name="reason" placeholder={t("hr.payrollReadiness.reopenReason")} required />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.payrollReadiness.action.reopen")}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage={t("hr.payrollReadiness.empty.periods")}
            getRowId={(row) => row.id}
            pagination={{ mode: "cursor", pageSize: 10 }}
            records={periods}
          />

          {validationIssueRecords.length > 0 ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">{t("hr.payrollReadiness.validationIssues.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("hr.payrollReadiness.validationIssues.body")}</p>
              </div>
              <EnterpriseDataTable
                columns={[
                  { header: t("hr.payrollReadiness.periods.column.period"), key: "period", render: (row) => row.periodName },
                  { header: t("hr.common.severity"), key: "severity", render: (row) => row.severity },
                  { header: t("hr.payrollReadiness.validationIssues.column.message"), key: "message", render: (row) => row.message },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (row) =>
                      row.employeeId ? (
                        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/employees/${row.employeeId}?tab=documents`}>
                          {t("hr.documentCompliance.action.openProfile")}
                        </Link>
                      ) : (
                        "—"
                      ),
                  },
                ]}
                emptyMessage={t("hr.payrollReadiness.validationIssues.empty")}
                getRowId={(row) => row.id}
                pagination={{ mode: "page", page: 1, pageSize: validationIssueRecords.length || 1, totalRows: validationIssueRecords.length }}
                records={validationIssueRecords}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "runs" ? (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
              <p className="text-sm text-muted-foreground">{t("hr.payrollReadiness.empty.groups")}</p>
              <Link className={`${secondaryButtonLinkClassName} mt-4 inline-flex`} href="/erp/hr/settings?tab=payroll">
                {t("hr.payrollReadiness.empty.openSettings")}
              </Link>
            </article>
          ) : (
            <form action={createPayrollRunAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3">
              <select className={nativeSelectClassName} name="payrollPeriodId" required>
                <option value="">{t("hr.payrollReadiness.periods.column.period")}</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.periodName} ({period.startDate} → {period.endDate})
                  </option>
                ))}
              </select>
              <select className={nativeSelectClassName} name="payrollGroupId" required>
                <option value="">{t("hr.payrollReadiness.tab.runs")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="primary">
                {t("hr.payrollReadiness.action.createRun")}
              </Button>
            </form>
          )}

          <EnterpriseDataTable
            columns={[
              { header: t("hr.payrollReadiness.periods.column.period"), key: "period", render: (row) => row.period },
              { header: t("hr.payrollReadiness.column.group"), key: "group", render: (row) => row.group },
              { header: t("hr.leave.column.type"), key: "type", render: (row) => row.runType },
              { header: t("hr.common.status"), key: "status", render: (row) => row.status },
              { header: t("hr.common.date"), key: "created", render: (row) => row.createdAt },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {["draft", "validating"].includes(row.rawStatus) ? (
                      <form action={validatePayrollRunAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.payrollReadiness.action.validate")}
                        </Button>
                      </form>
                    ) : null}
                    {["ready", "draft"].includes(row.rawStatus) ? (
                      <form action={calculatePayrollRunAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.payrollReadiness.action.calculate")}
                        </Button>
                      </form>
                    ) : null}
                    {row.rawStatus === "completed" ? (
                      <form action={approvePayrollRunAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.payrollReadiness.action.approve")}
                        </Button>
                      </form>
                    ) : null}
                    {["approved", "paid", "completed"].includes(row.rawStatus) ? (
                      <a
                        className="inline-flex h-8 items-center rounded-md border bg-[hsl(var(--surface-muted))] px-3 text-xs font-medium"
                        href={`/api/hr/payroll/wps/${row.id}`}
                      >
                        {t("hr.payrollReadiness.action.wps")}
                      </a>
                    ) : null}
                    {row.rawStatus === "approved" ? (
                      <form action={publishPayslipsAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.payrollReadiness.action.markPaid")}
                        </Button>
                      </form>
                    ) : null}
                    {row.rawStatus !== "paid" ? (
                      <form action={deletePayrollRunAction.bind(null, row.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.delete")}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage={t("hr.payrollReadiness.empty.runs")}
            getRowId={(row) => row.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={runRecords}
          />
        </div>
      ) : null}

      {activeTab === "localization" ? (
        <form action={ensureEgyptPayrollPackAction} className="rounded-lg border bg-[hsl(var(--surface))] p-5">
          <p className="text-sm font-medium">{t("hr.payrollReadiness.localization.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("hr.payrollReadiness.localization.body")}</p>
          <Button className="mt-3" type="submit" variant="secondary">
            {t("hr.payrollReadiness.localization.ensure")}
          </Button>
        </form>
      ) : null}
    </HrSectionWorkspace>
  );
}
