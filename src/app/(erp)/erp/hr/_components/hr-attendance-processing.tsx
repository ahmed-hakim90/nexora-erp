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
    { href: buildHref({ tab: "queue" }), key: "queue", label: "Approval Queue" },
    { href: buildHref({ tab: "summary" }), key: "summary", label: "Attendance Summary" },
    { href: buildHref({ tab: "corrections" }), key: "corrections", label: "Corrections" },
    { href: buildHref({ tab: "timeline" }), key: "timeline", label: "Timeline" },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description="Review attendance exceptions, apply missing punch corrections, and approve daily summaries for payroll."
        help={resolveHrPageHelp("attendanceProcessing")}
        navItems={navItems}
        summaryMetrics={[
          { helper: "Days in summary", href: buildHref({ tab: "summary" }), label: "Working Days", value: summary.length },
          { helper: "Approved or observed", href: buildHref({ tab: "summary", status: "approved" }), label: "Present", value: presentCount },
          { helper: "Open exceptions", href: buildHref({ tab: "queue", severity: "high" }), label: "Exceptions", value: metrics.openExceptions },
          { helper: "Needs supervisor review", href: buildHref({ tab: "queue" }), label: "Needs Review", value: metrics.needsReviewDays },
          { helper: "Late minutes flagged", href: buildHref({ tab: "summary" }), label: "Late", value: lateCount },
          { helper: "OT minutes flagged", href: buildHref({ tab: "summary" }), label: "Overtime", value: overtimeCount },
          { helper: `${metrics.payrollReadyPercent}% ready`, href: buildHref({ tab: "summary", payroll: "ready" }), label: "Payroll Ready", value: payrollReadyCount },
        ]}
        title="Attendance Processing"
        workspaceKey="attendance-processing"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-processing" query={query} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceSearchFilter defaultValue={query.search} placeholder="Search employee" />
            <HrWorkforceEmployeeFilter defaultValue={query.employeeId} />
            <HrWorkforceDepartmentFilter defaultValue={query.departmentId} />
            <HrWorkforceBranchFilter defaultValue={query.branchId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: "Pending review", value: "pending" },
                { label: "Open", value: "open" },
                { label: "Approved", value: "approved" },
              ]}
            />
            <HrWorkforceDateRangeFilters endValue={query.periodEnd} startValue={query.periodStart} />
          </HrWorkforceFilterBar>
        }
        sidebar={
          <div className="space-y-4">
            <EditableSectionCard title="Quick links">
              <div className="flex flex-wrap gap-2">
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-export">
                  Attendance export
                </Link>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-live">
                  Live monitor
                </Link>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-devices">
                  Devices
                </Link>
              </div>
            </EditableSectionCard>
          </div>
        }
      >
        {activeTab === "queue" ? (
          <EditableSectionCard
            description="Approve, dismiss, or correct missing punches before payroll export. Grouped by severity with keyboard-friendly row actions."
            title="Approval Queue"
          >
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (record) => record.employeeLabel },
                { header: "Date", key: "date", render: (record) => record.workDate },
                { header: "Type", key: "type", render: (record) => record.itemTypeLabel },
                {
                  header: "Severity",
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
                { header: "Status", key: "status", render: (record) => record.status },
                { header: "Notes", key: "notes", render: (record) => record.notes || "—" },
                {
                  header: "Actions",
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      <form action={approveAttendanceReviewAction}>
                        {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                        {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                        <input name="reason" type="hidden" value="Approved from attendance processing queue" />
                        <Button size="sm" type="submit" variant="primary">
                          Approve
                        </Button>
                      </form>
                      <form action={dismissAttendanceReviewAction}>
                        {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                        {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                        <input name="reason" type="hidden" value="Dismissed from attendance processing queue" />
                        <Button size="sm" type="submit" variant="secondary">
                          Dismiss
                        </Button>
                      </form>
                    </div>
                  ),
                },
              ]}
              emptyMessage="No attendance items pending review."
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredQueue.length || 1, totalRows: filteredQueue.length }}
              records={filteredQueue}
              rowActions={(record) => [
                { href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: "Preview employee" },
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
                      Approve
                    </Button>
                  </form>
                  <form action={dismissAttendanceReviewAction}>
                    {record.queueItemId ? <input name="queueItemId" type="hidden" value={record.queueItemId} /> : null}
                    {record.exceptionId ? <input name="exceptionId" type="hidden" value={record.exceptionId} /> : null}
                    <input name="reason" type="hidden" value="Dismissed from attendance processing queue" />
                    <Button size="sm" type="submit" variant="secondary">
                      Dismiss
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </EditableSectionCard>
        ) : null}

        {activeTab === "summary" ? (
          <EditableSectionCard title="Attendance Summary">
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (record) => record.employeeLabel },
                { header: "Date", key: "date", render: (record) => record.workDate },
                { header: "Worked (min)", key: "worked", render: (record) => record.workedMinutes },
                { header: "OT (min)", key: "ot", render: (record) => record.overtimeMinutes },
                { header: "Late (min)", key: "late", render: (record) => record.lateMinutes },
                {
                  header: "Late/Early",
                  key: "lateEarly",
                  render: (record) => record.lateEarlyStatus ?? "—",
                },
                {
                  header: "Missing",
                  key: "missing",
                  render: (record) => {
                    if (record.missingIn && record.missingOut) return "In & out";
                    if (record.missingIn) return "In";
                    if (record.missingOut) return "Out";
                    return "—";
                  },
                },
                { header: "Status", key: "status", render: (record) => record.status },
                { header: "Payroll", key: "payroll", render: (record) => (record.payrollReady ? "Ready" : "Pending") },
                {
                  header: "Actions",
                  key: "actions",
                  render: (record) =>
                    ["observed", "needs_review", "pending"].includes(record.rawStatus) ? (
                      <form action={approveAttendanceDayAction.bind(null, record.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          Approve day
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    ),
                },
              ]}
              emptyMessage="No attendance days recorded."
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredSummary.length || 1, totalRows: filteredSummary.length }}
              records={filteredSummary}
              rowActions={(record) => [{ href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: "View profile" }]}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "corrections" ? (
          <EditableSectionCard
            description="Add a corrected punch and resolve linked queue items automatically."
            title="Missing Punch Adjustment"
          >
            <form action={addMissingPunchAdjustmentAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
              <DatePicker name="workDate" placeholder="Work date" required />
              <select className={nativeSelectClassName} name="punchType" required>
                <option value="in">Punch in</option>
                <option value="out">Punch out</option>
              </select>
              <Input name="punchTime" placeholder="Time (HH:MM)" required />
              <Input name="reason" placeholder="Reason (optional)" />
              <Button type="submit" variant="primary">
                Add correction
              </Button>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title="Attendance timeline" /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
