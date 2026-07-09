"use client";

import Link from "next/link";

import {
  addMissingPunchAdjustmentAction,
  approveAttendanceDayAction,
  approveAttendanceReviewAction,
  dismissAttendanceReviewAction,
} from "@/features/hr/routes/actions/hr-attendance.actions";
import type { HrAttendanceProcessingWorkspaceData } from "@/features/hr/routes/loaders/hr-attendance-processing.loader";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  EditableSectionCard,
  EntityLookup,
  Input,
  PageContainer,
  PlatformTimeline,
  secondaryButtonLinkClassName,
  nativeSelectClassName,
  type PlatformTimelineEvent,
  useTranslations,
} from "@/shared/ui";

import { HrWorkforceEnterpriseTable } from "./hr-workforce-enterprise-table";
import {
  HrWorkforceBranchFilter,
  HrWorkforceDateRangeFilters,
  HrWorkforceDepartmentFilter,
  HrWorkforceEmployeeFilter,
  HrWorkforceFilterBar,
  HrWorkforceSearchFilter,
  HrWorkforceStatusFilter,
} from "./hr-workforce-filter-bar";
import { HrWorkforceWorkspaceShell } from "./hr-workforce-workspace-shell";

function buildHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/attendance-processing?${query}` : "/erp/hr/attendance-processing";
}

function severityTone(severity: string): "danger" | "warning" | "neutral" {
  const normalized = severity.toLowerCase();
  if (normalized.includes("high") || normalized.includes("critical")) return "danger";
  if (normalized.includes("medium") || normalized.includes("warn")) return "warning";
  return "neutral";
}

export function HrAttendanceProcessingWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrAttendanceProcessingWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const { metrics, queue, summary } = data;
  const activeTab = query.tab ?? "queue";
  const searchTerm = (query.search ?? "").trim().toLowerCase();

  const filteredQueue = queue.filter((record) => {
    if (query.severity && record.severity !== query.severity) return false;
    if (query.status && record.rawStatus !== query.status) return false;
    if (searchTerm && !record.employeeLabel.toLowerCase().includes(searchTerm)) return false;
    return true;
  });

  const filteredSummary = summary.filter((record) => {
    if (query.payroll === "ready" && !record.payrollReady) return false;
    if (query.payroll === "pending" && record.payrollReady) return false;
    if (query.status && record.rawStatus !== query.status) return false;
    if (searchTerm && !record.employeeLabel.toLowerCase().includes(searchTerm)) return false;
    return true;
  });

  const presentCount = summary.filter((row) => ["approved", "observed", "present"].includes(row.rawStatus)).length;
  const lateCount = summary.filter((row) => row.lateMinutes > 0).length;
  const overtimeCount = summary.filter((row) => row.overtimeMinutes > 0).length;
  const payrollReadyCount = summary.filter((row) => row.payrollReady).length;

  const timelineEvents: PlatformTimelineEvent[] = [
    ...queue.slice(0, 12).map((item) => ({
      action: `${item.itemTypeLabel} — ${item.status}`,
      actor: item.employeeLabel,
      category: "approval" as const,
      key: item.id,
      source: item.severityLabel,
      timestamp: item.createdAt,
    })),
    ...summary.slice(0, 8).map((item) => ({
      action: `Attendance day ${item.status}`,
      actor: item.employeeLabel,
      category: "status" as const,
      key: `summary-${item.id}`,
      source: item.payrollReady ? "Payroll ready" : "Pending payroll",
      timestamp: item.workDate,
    })),
  ];

  const navItems = [
    { href: buildHref({ tab: "queue" }), key: "queue", label: t("hr.attendance.processing.tab.queue") },
    { href: buildHref({ tab: "summary" }), key: "summary", label: t("hr.attendance.processing.tab.summary") },
    { href: buildHref({ tab: "corrections" }), key: "corrections", label: t("hr.attendance.processing.tab.corrections") },
    { href: buildHref({ tab: "timeline" }), key: "timeline", label: t("hr.attendance.processing.tab.timeline") },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={t("hr.attendance.processing.description")}
        help={resolveHrPageHelp("attendanceProcessing")}
        navItems={navItems}
        summaryMetrics={[
          {
            helper: t("hr.attendance.processing.kpi.workingDays.helper"),
            href: buildHref({ tab: "summary" }),
            label: t("hr.attendance.processing.kpi.workingDays"),
            value: summary.length,
          },
          {
            helper: t("hr.attendance.processing.kpi.present.helper"),
            href: buildHref({ tab: "summary", status: "approved" }),
            label: t("hr.attendance.processing.kpi.present"),
            value: presentCount,
          },
          {
            helper: t("hr.attendance.processing.kpi.exceptions.helper"),
            href: buildHref({ tab: "queue", severity: "high" }),
            label: t("hr.attendance.processing.kpi.exceptions"),
            value: metrics.openExceptions,
          },
          {
            helper: t("hr.attendance.processing.kpi.needsReview.helper"),
            href: buildHref({ tab: "queue" }),
            label: t("hr.attendance.processing.kpi.needsReview"),
            value: metrics.needsReviewDays,
          },
          {
            helper: t("hr.attendance.processing.kpi.late.helper"),
            href: buildHref({ tab: "summary" }),
            label: t("hr.attendance.processing.kpi.late"),
            value: lateCount,
          },
          {
            helper: t("hr.attendance.processing.kpi.overtime.helper"),
            href: buildHref({ tab: "summary" }),
            label: t("hr.attendance.processing.kpi.overtime"),
            value: overtimeCount,
          },
          {
            helper: t("hr.attendance.processing.kpi.payrollReady.helper", { percent: metrics.payrollReadyPercent }),
            href: buildHref({ tab: "summary", payroll: "ready" }),
            label: t("hr.attendance.processing.kpi.payrollReady"),
            value: payrollReadyCount,
          },
        ]}
        title={t("hr.attendance.processing.title")}
        workspaceKey="attendance-processing"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-processing" query={query} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceSearchFilter defaultValue={query.search} placeholder={t("hr.common.searchEmployee")} />
            <HrWorkforceEmployeeFilter defaultValue={query.employeeId} />
            <HrWorkforceDepartmentFilter defaultValue={query.departmentId} />
            <HrWorkforceBranchFilter defaultValue={query.branchId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: t("hr.attendance.processing.status.pendingReview"), value: "pending" },
                { label: t("hr.attendance.processing.status.open"), value: "open" },
                { label: t("hr.overtime.status.approved"), value: "approved" },
              ]}
            />
            <HrWorkforceDateRangeFilters endValue={query.periodEnd} startValue={query.periodStart} />
          </HrWorkforceFilterBar>
        }
        sidebar={
          <div className="space-y-4">
            <EditableSectionCard title={t("hr.common.quickLinks")}>
              <div className="flex flex-wrap gap-2">
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-export">
                  {t("hr.attendance.processing.link.export")}
                </Link>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-live">
                  {t("hr.attendance.processing.link.live")}
                </Link>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-devices">
                  {t("hr.attendance.processing.link.devices")}
                </Link>
              </div>
            </EditableSectionCard>
          </div>
        }
      >
        {activeTab === "queue" ? (
          <EditableSectionCard
            description={t("hr.attendance.processing.queueDescription")}
            title={t("hr.attendance.processing.queueTitle")}
          >
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
                { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
                { header: t("hr.common.type"), key: "type", render: (record) => record.itemTypeLabel },
                {
                  header: t("hr.common.severity"),
                  key: "severity",
                  render: (record) => (
                    <span
                      className={
                        severityTone(record.severity) === "danger"
                          ? "text-[hsl(var(--danger))]"
                          : severityTone(record.severity) === "warning"
                            ? "text-[hsl(var(--warning))]"
                            : "text-muted-foreground"
                      }
                    >
                      {record.severityLabel}
                    </span>
                  ),
                },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
                { header: t("hr.common.notes"), key: "notes", render: (record) => record.notes || "—" },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      <form action={approveAttendanceReviewAction}>
                        {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                        {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                        <input name="reason" type="hidden" value="Approved from attendance processing queue" />
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.common.approve")}
                        </Button>
                      </form>
                      <form action={dismissAttendanceReviewAction}>
                        {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                        {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                        <input name="reason" type="hidden" value="Dismissed from attendance processing queue" />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.dismiss")}
                        </Button>
                      </form>
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.attendance.processing.emptyQueue")}
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredQueue.length || 1, totalRows: filteredQueue.length }}
              records={filteredQueue}
              rowActions={(record) => [
                { href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: t("hr.common.previewEmployee") },
              ]}
              state={{ globalSearch: query.search }}
            />
            <div className="mt-3 space-y-2 lg:hidden">
              {filteredQueue.slice(0, 8).map((record) => (
                <div className="flex flex-wrap gap-2 rounded-md border p-3" key={`mobile-actions-${record.id}`}>
                  <form action={approveAttendanceReviewAction}>
                    {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                    {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                    <input name="reason" type="hidden" value="Approved from attendance processing queue" />
                    <Button size="sm" type="submit" variant="primary">
                      {t("hr.common.approve")}
                    </Button>
                  </form>
                  <form action={dismissAttendanceReviewAction}>
                    {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                    {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                    <input name="reason" type="hidden" value="Dismissed from attendance processing queue" />
                    <Button size="sm" type="submit" variant="secondary">
                      {t("hr.common.dismiss")}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </EditableSectionCard>
        ) : null}

        {activeTab === "summary" ? (
          <EditableSectionCard title={t("hr.attendance.processing.summaryTitle")}>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
                { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
                { header: t("hr.common.workedMin"), key: "worked", render: (record) => record.workedMinutes },
                { header: t("hr.common.otMin"), key: "ot", render: (record) => record.overtimeMinutes },
                { header: t("hr.common.lateMin"), key: "late", render: (record) => record.lateMinutes },
                {
                  header: t("hr.common.lateEarly"),
                  key: "lateEarly",
                  render: (record) => record.lateEarlyStatus ?? "—",
                },
                {
                  header: t("hr.common.missing"),
                  key: "missing",
                  render: (record) => {
                    if (record.missingIn && record.missingOut) return t("hr.common.missingInOut");
                    if (record.missingIn) return t("hr.common.missingIn");
                    if (record.missingOut) return t("hr.common.missingOut");
                    return "—";
                  },
                },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
                {
                  header: t("hr.common.payroll"),
                  key: "payroll",
                  render: (record) => (record.payrollReady ? t("hr.common.ready") : t("hr.common.pending")),
                },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) =>
                    ["observed", "needs_review", "pending"].includes(record.rawStatus) ? (
                      <form action={approveAttendanceDayAction.bind(null, record.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.common.approveDay")}
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    ),
                },
              ]}
              emptyMessage={t("hr.attendance.processing.emptySummary")}
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredSummary.length || 1, totalRows: filteredSummary.length }}
              records={filteredSummary}
              rowActions={(record) => [{ href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "corrections" ? (
          <EditableSectionCard
            description={t("hr.attendance.processing.correctionsDescription")}
            title={t("hr.attendance.processing.correctionsTitle")}
          >
            <form action={addMissingPunchAdjustmentAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
              <DatePicker name="workDate" placeholder={t("hr.common.workDate")} required />
              <select className={nativeSelectClassName} name="punchType" required>
                <option value="in">{t("hr.common.punchIn")}</option>
                <option value="out">{t("hr.common.punchOut")}</option>
              </select>
              <Input name="punchTime" placeholder={t("hr.common.timeHm")} required />
              <Input name="reason" placeholder={t("hr.common.reasonOptional")} />
              <Button type="submit" variant="primary">
                {t("hr.common.addCorrection")}
              </Button>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title={t("hr.attendance.processing.timelineTitle")} /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
