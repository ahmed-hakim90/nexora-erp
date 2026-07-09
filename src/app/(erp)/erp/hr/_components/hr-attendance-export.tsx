"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  cancelAttendanceExportBatchAction,
  createAttendanceClosingAction,
  executeAttendanceExportAction,
  lockAttendanceClosingAction,
  markAttendanceExportDownloadedAction,
  refreshAttendanceClosingAction,
  reopenAttendanceClosingAction,
} from "@/features/hr/routes/actions/hr-attendance-payroll-export.actions";
import type { HrAttendanceExportWorkspaceData } from "@/features/hr/routes/loaders/hr-attendance-export.loader";
import { resolveHrPageHelp, translateHrExportScope, translateHrStatus } from "@/features/hr/public-api";
import {
  AttachmentPanel,
  Button,
  DatePicker,
  EditableSectionCard,
  EntityLookup,
  Input,
  PageContainer,
  PlatformTimeline,
  secondaryButtonLinkClassName,
  nativeSelectClassName,
  useTranslations,
  type PlatformTimelineEvent,
} from "@/shared/ui";

import { HrWorkforceEnterpriseTable } from "./hr-workforce-enterprise-table";
import {
  HrWorkforceDateRangeFilters,
  HrWorkforceDepartmentFilter,
  HrWorkforceEmployeeFilter,
  HrWorkforceFilterBar,
} from "./hr-workforce-filter-bar";
import { HrWorkforceWorkspaceShell } from "./hr-workforce-workspace-shell";

function buildHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/attendance-export?${query}` : "/erp/hr/attendance-export";
}

export function HrAttendanceExportWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrAttendanceExportWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const { closings, defaultPeriodEnd, defaultPeriodStart, history, metrics } = data;
  const activeTab = query.tab ?? "export";

  const navItems = useMemo(
    () =>
      [
        { href: buildHref({ tab: "export" }), key: "export", label: t("hr.attendance.export.tab.export") },
        { href: buildHref({ tab: "closings" }), key: "closings", label: t("hr.attendance.export.tab.closings") },
        { href: buildHref({ tab: "history" }), key: "history", label: t("hr.attendance.export.tab.history") },
        { href: buildHref({ tab: "timeline" }), key: "timeline", label: t("hr.attendance.export.tab.timeline") },
      ] as const,
    [t],
  );

  const summaryMetrics = useMemo(
    () => [
      {
        helper: t("hr.attendance.export.kpi.payrollReady.helper"),
        href: buildHref({ tab: "export" }),
        label: t("hr.attendance.export.kpi.payrollReady"),
        value: `${metrics.payrollReadyPercent}%`,
      },
      {
        helper: t("hr.attendance.export.kpi.lockedDays.helper"),
        href: buildHref({ tab: "closings" }),
        label: t("hr.attendance.export.kpi.lockedDays"),
        value: metrics.lockedDays,
      },
      {
        helper: t("hr.attendance.export.kpi.exported.helper"),
        href: buildHref({ tab: "history" }),
        label: t("hr.attendance.export.kpi.exported"),
        value: metrics.exportedDays,
      },
      {
        helper: t("hr.attendance.export.kpi.openDays.helper"),
        href: buildHref({ tab: "export", payroll: "open" }),
        label: t("hr.attendance.export.kpi.openDays"),
        value: metrics.openDays,
      },
      {
        helper: t("hr.attendance.export.kpi.employeesReady.helper"),
        href: buildHref({ tab: "export" }),
        label: t("hr.attendance.export.kpi.employeesReady"),
        value: metrics.employeesReady,
      },
      {
        helper: t("hr.attendance.export.kpi.blocked.helper"),
        href: buildHref({ tab: "export" }),
        label: t("hr.attendance.export.kpi.blocked"),
        value: metrics.employeesBlocked,
      },
    ],
    [metrics, t],
  );

  const timelineEvents: PlatformTimelineEvent[] = useMemo(
    () =>
      history.map((batch) => ({
        action: t("hr.attendance.export.batchAction", { status: translateHrStatus(t, batch.status) }),
        category: "attachment",
        key: batch.id,
        source: `${batch.periodStart} → ${batch.periodEnd}`,
        timestamp: batch.createdAt,
      })),
    [history, t],
  );

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={t("hr.attendance.export.description")}
        help={resolveHrPageHelp("attendanceExport")}
        navItems={navItems}
        summaryMetrics={summaryMetrics}
        title={t("hr.attendance.export.title")}
        workspaceKey="attendance-export"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-export" query={query} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceEmployeeFilter defaultValue={query.employeeId} />
            <HrWorkforceDepartmentFilter defaultValue={query.departmentId} />
            <HrWorkforceDateRangeFilters endValue={query.periodEnd ?? defaultPeriodEnd} startValue={query.periodStart ?? defaultPeriodStart} />
          </HrWorkforceFilterBar>
        }
      >
        {activeTab === "export" ? (
          <EditableSectionCard description={t("hr.attendance.export.filtersDescription")} title={t("hr.attendance.export.filtersTitle")}>
            <form action={executeAttendanceExportAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DatePicker defaultValue={query.periodStart ?? defaultPeriodStart} name="periodStart" placeholder={t("hr.common.periodStart")} required />
              <DatePicker defaultValue={query.periodEnd ?? defaultPeriodEnd} name="periodEnd" placeholder={t("hr.common.periodEnd")} required />
              <EntityLookup label={t("hr.common.department")} name="departmentId" providerKey="hr.org-units.lookup" value={query.departmentId} />
              <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" value={query.employeeId} />
              <input name="confirmed" type="hidden" value="1" />
              <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-4">
                <Button type="submit" variant="primary">
                  {t("hr.attendance.export.validateExport")}
                </Button>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-processing">
                  {t("hr.attendance.export.reviewQueue")}
                </Link>
              </div>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "closings" ? (
          <EditableSectionCard title={t("hr.attendance.export.closingTitle")}>
            <form action={createAttendanceClosingAction} className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select className={nativeSelectClassName} defaultValue="monthly" name="scope" required>
                <option value="weekly">{t("hr.attendance.export.scope.weekly")}</option>
                <option value="monthly">{t("hr.attendance.export.scope.monthly")}</option>
                <option value="department">{t("hr.attendance.export.scope.department")}</option>
                <option value="branch">{t("hr.attendance.export.scope.branch")}</option>
                <option value="company">{t("hr.attendance.export.scope.company")}</option>
              </select>
              <DatePicker defaultValue={defaultPeriodStart} name="periodStart" placeholder={t("hr.common.periodStart")} required />
              <DatePicker defaultValue={defaultPeriodEnd} name="periodEnd" placeholder={t("hr.common.periodEnd")} required />
              <EntityLookup label={t("hr.common.department")} name="departmentId" providerKey="hr.org-units.lookup" />
              <Button type="submit" variant="secondary">
                {t("hr.attendance.export.createClosing")}
              </Button>
            </form>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.scope"), key: "scope", render: (record) => translateHrExportScope(t, record.scope) },
                { header: t("hr.common.period"), key: "period", render: (record) => `${record.periodStart} → ${record.periodEnd}` },
                { header: t("hr.common.status"), key: "status", render: (record) => translateHrStatus(t, record.status) },
                { header: t("hr.common.readyPercent"), key: "ready", render: (record) => `${record.payrollReadyPercent}%` },
                { header: t("hr.common.employees"), key: "employees", render: (record) => `${record.readyEmployeeCount}/${record.employeeCount}` },
                { header: t("hr.common.blocked"), key: "blocked", render: (record) => record.blockedEmployeeCount },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      <form action={refreshAttendanceClosingAction}>
                        <input name="closingId" type="hidden" value={record.id} />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.refresh")}
                        </Button>
                      </form>
                      <form action={lockAttendanceClosingAction}>
                        <input name="closingId" type="hidden" value={record.id} />
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.common.lock")}
                        </Button>
                      </form>
                      <form action={reopenAttendanceClosingAction} className="flex flex-wrap items-center gap-2">
                        <input name="closingId" type="hidden" value={record.id} />
                        <Input className="min-w-[12rem]" name="reason" placeholder={t("hr.common.reopenReason")} required />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.reopen")}
                        </Button>
                      </form>
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.attendance.export.emptyClosings")}
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: closings.length || 1, totalRows: closings.length }}
              records={closings}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "history" ? (
          <>
            <EditableSectionCard title={t("hr.attendance.export.historyTitle")}>
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: t("hr.common.period"), key: "period", render: (record) => `${record.periodStart} → ${record.periodEnd}` },
                  { header: t("hr.common.employees"), key: "employees", render: (record) => record.employeeCount },
                  { header: t("hr.common.status"), key: "status", render: (record) => translateHrStatus(t, record.status) },
                  { header: t("hr.requests.column.created"), key: "created", render: (record) => new Date(record.createdAt).toLocaleString() },
                  {
                    header: t("hr.common.downloaded"),
                    key: "downloaded",
                    render: (record) => (record.downloadedAt ? new Date(record.downloadedAt).toLocaleString() : "—"),
                  },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (record) => (
                      <div className="flex flex-wrap gap-1">
                        <form action={markAttendanceExportDownloadedAction}>
                          <input name="batchId" type="hidden" value={record.id} />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.markDownloaded")}
                          </Button>
                        </form>
                        <form action={cancelAttendanceExportBatchAction}>
                          <input name="batchId" type="hidden" value={record.id} />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.cancel")}
                          </Button>
                        </form>
                      </div>
                    ),
                  },
                ]}
                emptyMessage={t("hr.attendance.export.emptyHistory")}
                getRowId={(record) => record.id}
                pagination={{ mode: "page", page: 1, pageSize: history.length || 1, totalRows: history.length }}
                records={history}
              />
            </EditableSectionCard>
            <AttachmentPanel
              attachments={history.map((batch) => ({
                fileName: t("hr.attendance.export.artifactFileName", { end: batch.periodEnd, start: batch.periodStart }),
                id: batch.id,
                status: translateHrStatus(t, batch.status),
                uploadedAt: new Date(batch.createdAt).toLocaleString(),
              }))}
              emptyMessage={t("hr.attendance.export.emptyArtifacts")}
              title={t("hr.attendance.export.artifactsTitle")}
            />
          </>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title={t("hr.attendance.export.timelineTitle")} /> : null}

        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">{t("hr.attendance.export.contractTitle")}</p>
          <p className="mt-1 text-muted-foreground">{t("hr.attendance.export.contractDescription")}</p>
        </section>
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
