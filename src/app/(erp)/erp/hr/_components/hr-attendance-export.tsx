"use client";

import Link from "next/link";

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
import { resolveHrPageHelp } from "@/features/hr/public-api";
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
  const { closings, defaultPeriodEnd, defaultPeriodStart, history, metrics } = data;
  const activeTab = query.tab ?? "export";

  const timelineEvents: PlatformTimelineEvent[] = history.map((batch) => ({
    action: `Export batch ${batch.status}`,
    category: "attachment",
    key: batch.id,
    source: `${batch.periodStart} → ${batch.periodEnd}`,
    timestamp: batch.createdAt,
  }));

  const navItems = [
    { href: buildHref({ tab: "export" }), key: "export", label: "Export" },
    { href: buildHref({ tab: "closings" }), key: "closings", label: "Closings" },
    { href: buildHref({ tab: "history" }), key: "history", label: "History" },
    { href: buildHref({ tab: "timeline" }), key: "timeline", label: "Timeline" },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description="Lock attendance, validate payroll readiness, and export immutable attendance snapshots for payroll input."
        help={resolveHrPageHelp("attendanceExport")}
        navItems={navItems}
        summaryMetrics={[
          { helper: "Current period readiness", href: buildHref({ tab: "export" }), label: "Payroll Ready", value: `${metrics.payrollReadyPercent}%` },
          { helper: "Locked attendance days", href: buildHref({ tab: "closings" }), label: "Locked Days", value: metrics.lockedDays },
          { helper: "Exported attendance days", href: buildHref({ tab: "history" }), label: "Exported", value: metrics.exportedDays },
          { helper: "Open attendance days", href: buildHref({ tab: "export", payroll: "open" }), label: "Open Days", value: metrics.openDays },
          { helper: "Employees without blockers", href: buildHref({ tab: "export" }), label: "Employees Ready", value: metrics.employeesReady },
          { helper: "Employees with validation blockers", href: buildHref({ tab: "export" }), label: "Blocked", value: metrics.employeesBlocked },
        ]}
        title="Attendance Export"
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
          <EditableSectionCard
            description="Select period and scope. Export creates immutable payroll input snapshots — no payroll calculation runs here."
            title="Export Filters"
          >
            <form action={executeAttendanceExportAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DatePicker defaultValue={query.periodStart ?? defaultPeriodStart} name="periodStart" placeholder="Period start" required />
              <DatePicker defaultValue={query.periodEnd ?? defaultPeriodEnd} name="periodEnd" placeholder="Period end" required />
              <EntityLookup label="Department" name="departmentId" providerKey="hr.org-units.lookup" value={query.departmentId} />
              <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" value={query.employeeId} />
              <input name="confirmed" type="hidden" value="1" />
              <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-4">
                <Button type="submit" variant="primary">
                  Validate &amp; Export
                </Button>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/attendance-processing">
                  Review processing queue
                </Link>
              </div>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "closings" ? (
          <EditableSectionCard title="Attendance Closing">
            <form action={createAttendanceClosingAction} className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select className={nativeSelectClassName} defaultValue="monthly" name="scope" required>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="department">Department</option>
                <option value="branch">Branch</option>
                <option value="company">Company</option>
              </select>
              <DatePicker defaultValue={defaultPeriodStart} name="periodStart" placeholder="Period start" required />
              <DatePicker defaultValue={defaultPeriodEnd} name="periodEnd" placeholder="Period end" required />
              <EntityLookup label="Department" name="departmentId" providerKey="hr.org-units.lookup" />
              <Button type="submit" variant="secondary">
                Create closing
              </Button>
            </form>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Scope", key: "scope", render: (record) => record.scope },
                { header: "Period", key: "period", render: (record) => `${record.periodStart} → ${record.periodEnd}` },
                { header: "Status", key: "status", render: (record) => record.status },
                { header: "Ready %", key: "ready", render: (record) => `${record.payrollReadyPercent}%` },
                { header: "Employees", key: "employees", render: (record) => `${record.readyEmployeeCount}/${record.employeeCount}` },
                { header: "Blocked", key: "blocked", render: (record) => record.blockedEmployeeCount },
                {
                  header: "Actions",
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      <form action={refreshAttendanceClosingAction}>
                        <input name="closingId" type="hidden" value={record.id} />
                        <Button size="sm" type="submit" variant="secondary">Refresh</Button>
                      </form>
                      <form action={lockAttendanceClosingAction}>
                        <input name="closingId" type="hidden" value={record.id} />
                        <Button size="sm" type="submit" variant="primary">Lock</Button>
                      </form>
                      <form action={reopenAttendanceClosingAction} className="flex flex-wrap items-center gap-2">
                        <input name="closingId" type="hidden" value={record.id} />
                        <Input className="min-w-[12rem]" name="reason" placeholder="Reopen reason" required />
                        <Button size="sm" type="submit" variant="secondary">Reopen</Button>
                      </form>
                    </div>
                  ),
                },
              ]}
              emptyMessage="No attendance closings yet."
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: closings.length || 1, totalRows: closings.length }}
              records={closings}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "history" ? (
          <>
            <EditableSectionCard title="Export History">
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: "Period", key: "period", render: (record) => `${record.periodStart} → ${record.periodEnd}` },
                  { header: "Employees", key: "employees", render: (record) => record.employeeCount },
                  { header: "Status", key: "status", render: (record) => record.status },
                  { header: "Created", key: "created", render: (record) => new Date(record.createdAt).toLocaleString() },
                  { header: "Downloaded", key: "downloaded", render: (record) => (record.downloadedAt ? new Date(record.downloadedAt).toLocaleString() : "—") },
                  {
                    header: "Actions",
                    key: "actions",
                    render: (record) => (
                      <div className="flex flex-wrap gap-1">
                        <form action={markAttendanceExportDownloadedAction}>
                          <input name="batchId" type="hidden" value={record.id} />
                          <Button size="sm" type="submit" variant="secondary">Mark downloaded</Button>
                        </form>
                        <form action={cancelAttendanceExportBatchAction}>
                          <input name="batchId" type="hidden" value={record.id} />
                          <Button size="sm" type="submit" variant="secondary">Cancel</Button>
                        </form>
                      </div>
                    ),
                  },
                ]}
                emptyMessage="No export batches yet."
                getRowId={(record) => record.id}
                pagination={{ mode: "page", page: 1, pageSize: history.length || 1, totalRows: history.length }}
                records={history}
              />
            </EditableSectionCard>
            <AttachmentPanel
              attachments={history.map((batch) => ({
                fileName: `Export ${batch.periodStart} → ${batch.periodEnd}`,
                id: batch.id,
                status: batch.status,
                uploadedAt: new Date(batch.createdAt).toLocaleString(),
              }))}
              emptyMessage="Export artifacts appear here after batches are created."
              title="Export artifacts"
            />
          </>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title="Export timeline" /> : null}

        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Payroll input contract</p>
          <p className="mt-1 text-muted-foreground">
            Payroll consumes attendance payroll snapshots only. Reopening locked attendance requires permission and audit.
          </p>
        </section>
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
