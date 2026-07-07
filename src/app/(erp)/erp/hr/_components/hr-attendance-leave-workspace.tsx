"use client";

import Link from "next/link";

import {
  adjustLeaveBalanceAction,
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  createLeaveRequestAction,
  ensureDefaultLeaveTypesAction,
  rejectLeaveRequestAction,
} from "@/features/hr/routes/actions/hr-leave.actions";
import {
  createAttendanceExceptionAction,
  recordAttendancePunchAction,
  resolveAttendanceExceptionAction,
} from "@/features/hr/routes/actions/hr-attendance.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  EditableSectionCard,
  EntityLookup,
  Input,
  PageContainer,
  PlatformTimeline,
  nativeSelectClassName,
  type PlatformTimelineEvent,
} from "@/shared/ui";

import { HrLeaveCalendar, type HrLeaveCalendarEntry } from "./hr-leave-calendar";
import { HrWorkforceEnterpriseTable } from "./hr-workforce-enterprise-table";
import {
  HrWorkforceEmployeeFilter,
  HrWorkforceFilterBar,
  HrWorkforceStatusFilter,
} from "./hr-workforce-filter-bar";
import { HrWorkforceWorkspaceShell } from "./hr-workforce-workspace-shell";

export type HrAttendanceLeaveWorkspaceData = Readonly<{
  activeTab: string;
  balanceRecords: readonly {
    asOfDate: string;
    availableQuantity: number;
    employee: string;
    id: string;
    leaveType: string;
  }[];
  calendarEntries: readonly HrLeaveCalendarEntry[];
  calendarMonth: Readonly<{ month: number; year: number }>;
  dayRecords: readonly { employee: string; id: string; status: string; workDate: string }[];
  employeeId?: string;
  exceptionRecords: readonly {
    employee: string;
    exceptionType: string;
    id: string;
    rawStatus: string;
    status: string;
    workDate: string;
  }[];
  highlightCreate: boolean;
  leaveRecords: readonly {
    approvalStatus: string;
    days: string;
    employee: string;
    employeeId: string;
    endsOn: string;
    id: string;
    leaveType: string;
    rawStatus: string;
    startsOn: string;
    status: string;
  }[];
  leaveTypes: readonly { id: string; name: string }[];
  punchRecords: readonly { employee: string; id: string; punchTime: string; punchType: string; source: string }[];
  summary: Readonly<{
    absent: number;
    early: number;
    late: number;
    leave: number;
    overtime: number;
    payrollReady: number;
    present: number;
    workingDays: number;
  }>;
}>;

function buildHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/attendance-leave?${query}` : "/erp/hr/attendance-leave";
}

export function HrAttendanceLeaveWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrAttendanceLeaveWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const activeTab = data.activeTab;

  const timelineEvents: PlatformTimelineEvent[] = [
    ...data.leaveRecords.slice(0, 10).map((row) => ({
      action: `Leave ${row.status}`,
      actor: row.employee,
      category: "approval" as const,
      key: `leave-${row.id}`,
      source: row.leaveType,
      timestamp: row.startsOn,
    })),
    ...data.punchRecords.slice(0, 8).map((row) => ({
      action: `Punch ${row.punchType}`,
      actor: row.employee,
      category: "status" as const,
      key: `punch-${row.id}`,
      source: row.source,
      timestamp: row.punchTime,
    })),
    ...data.exceptionRecords.slice(0, 8).map((row) => ({
      action: row.exceptionType,
      actor: row.employee,
      category: "audit" as const,
      key: `exception-${row.id}`,
      source: row.status,
      timestamp: row.workDate,
    })),
  ];

  const navItems = [
    { href: buildHref({ tab: "leave", employeeId: data.employeeId }), key: "leave", label: "Leave Requests" },
    { href: buildHref({ tab: "balances", employeeId: data.employeeId }), key: "balances", label: "Leave Balances" },
    { href: buildHref({ tab: "attendance", employeeId: data.employeeId }), key: "attendance", label: "Attendance" },
    {
      href: buildHref({
        employeeId: data.employeeId,
        month: String(data.calendarMonth.month),
        tab: "calendar",
        year: String(data.calendarMonth.year),
      }),
      key: "calendar",
      label: "Leave Calendar",
    },
    { href: buildHref({ tab: "timeline", employeeId: data.employeeId }), key: "timeline", label: "Timeline" },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description="Leave requests, balances, attendance punches, and calendar in one workforce workspace."
        help={resolveHrPageHelp("attendanceLeave")}
        navItems={navItems}
        summaryMetrics={[
          { helper: "Attendance days tracked", href: buildHref({ tab: "attendance" }), label: "Working Days", value: data.summary.workingDays },
          { helper: "Observed attendance", href: buildHref({ tab: "attendance", status: "present" }), label: "Present", value: data.summary.present },
          { helper: "Open exceptions", href: buildHref({ tab: "attendance", status: "open" }), label: "Absent", value: data.summary.absent },
          { helper: "Leave requests", href: buildHref({ tab: "leave" }), label: "Leave", value: data.summary.leave },
          { helper: "Late arrivals", href: buildHref({ tab: "attendance" }), label: "Late", value: data.summary.late },
          { helper: "Early departures", href: buildHref({ tab: "attendance" }), label: "Early", value: data.summary.early },
          { helper: "OT flagged days", href: "/erp/hr/overtime", label: "Overtime", value: data.summary.overtime },
          { helper: "Ready for payroll", href: "/erp/hr/attendance-processing?tab=summary&payroll=ready", label: "Payroll Ready", value: data.summary.payrollReady },
        ]}
        title="Attendance & Leave"
        workspaceKey="attendance-leave"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-leave" query={{ ...query, tab: activeTab }} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceEmployeeFilter defaultValue={data.employeeId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: "Submitted", value: "submitted" },
                { label: "Approved", value: "approved" },
                { label: "Open", value: "open" },
              ]}
            />
          </HrWorkforceFilterBar>
        }
      >
        {data.employeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Filtered to employee. <Link className="underline" href="/erp/hr/attendance-leave">Show all</Link>
          </p>
        ) : null}

        {activeTab === "calendar" ? (
          <HrLeaveCalendar
            calendarView={query.calendarView}
            day={query.day}
            employeeId={data.employeeId}
            entries={data.calendarEntries}
            month={data.calendarMonth.month}
            year={data.calendarMonth.year}
          />
        ) : null}

        {activeTab === "leave" ? (
          <div className="space-y-6">
            <EditableSectionCard title="Submit leave request">
              <form action={createLeaveRequestAction} className={`grid gap-3 md:grid-cols-3 xl:grid-cols-6 ${data.highlightCreate ? "rounded-lg border border-[hsl(var(--accent))] p-4 ring-1 ring-[hsl(var(--accent))]" : ""}`}>
                <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required value={data.employeeId} />
                <select className={nativeSelectClassName} name="leaveTypeId" required>
                  <option value="">Leave type</option>
                  {data.leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <DatePicker name="startsOn" placeholder="Start date" required />
                <DatePicker name="endsOn" placeholder="End date" required />
                <Input name="notes" placeholder="Notes (optional)" />
                <Button disabled={data.leaveTypes.length === 0} type="submit" variant="primary">Submit Leave</Button>
              </form>
              {data.leaveTypes.length === 0 ? (
                <form action={ensureDefaultLeaveTypesAction} className="mt-3">
                  <Button type="submit" variant="secondary">Seed Default Leave Types</Button>
                </form>
              ) : null}
            </EditableSectionCard>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (record) => record.employee },
                { header: "Leave type", key: "type", render: (record) => record.leaveType },
                { header: "From", key: "from", render: (record) => record.startsOn },
                { header: "To", key: "to", render: (record) => record.endsOn },
                { header: "Days", key: "days", render: (record) => record.days },
                { header: "Status", key: "status", render: (record) => record.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      {["submitted", "under_review"].includes(record.rawStatus) ? (
                        <>
                          <form action={approveLeaveRequestAction.bind(null, record.id)}>
                            <Button size="sm" type="submit" variant="primary">Approve</Button>
                          </form>
                          <form action={rejectLeaveRequestAction.bind(null, record.id)}>
                            <Button size="sm" type="submit" variant="secondary">Reject</Button>
                          </form>
                        </>
                      ) : null}
                      {["draft", "submitted"].includes(record.rawStatus) ? (
                        <form action={cancelLeaveRequestAction.bind(null, record.id)}>
                          <Button size="sm" type="submit" variant="secondary">Cancel</Button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage="No leave requests yet."
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={data.leaveRecords}
              rowActions={(record) => [{ href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: "View profile" }]}
            />
          </div>
        ) : null}

        {activeTab === "balances" ? (
          <EditableSectionCard title="Leave balances">
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (record) => record.employee },
                { header: "Leave type", key: "type", render: (record) => record.leaveType },
                { header: "As of", key: "asOf", render: (record) => record.asOfDate },
                { header: "Available days", key: "balance", render: (record) => String(record.availableQuantity) },
                {
                  header: "Adjust",
                  key: "adjust",
                  render: (record) => (
                    <form action={adjustLeaveBalanceAction} className="flex items-center gap-2">
                      <input name="balanceId" type="hidden" value={record.id} />
                      <Input className="w-24" defaultValue={String(record.availableQuantity)} min="0" name="availableQuantity" step="0.5" type="number" />
                      <Button size="sm" type="submit" variant="secondary">Save</Button>
                    </form>
                  ),
                },
              ]}
              emptyMessage="No leave balances recorded yet."
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={data.balanceRecords}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "attendance" ? (
          <div className="space-y-6">
            <EditableSectionCard title="Record punch">
              <form action={recordAttendancePunchAction} className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required value={data.employeeId} />
                <select className={nativeSelectClassName} defaultValue="in" name="punchType">
                  <option value="in">Clock In</option>
                  <option value="out">Clock Out</option>
                </select>
                <Input name="punchTime" placeholder="Punch time (ISO, optional)" type="datetime-local" />
                <Button type="submit" variant="primary">Record Punch</Button>
              </form>
            </EditableSectionCard>
            <EditableSectionCard title="Punch log">
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: "Employee", key: "employee", render: (r) => r.employee },
                  { header: "Type", key: "type", render: (r) => r.punchType },
                  { header: "Time", key: "time", render: (r) => r.punchTime },
                  { header: "Source", key: "source", render: (r) => r.source },
                ]}
                emptyMessage="No punches recorded yet."
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.punchRecords}
              />
            </EditableSectionCard>
            <EditableSectionCard title="Attendance days">
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: "Employee", key: "employee", render: (r) => r.employee },
                  { header: "Date", key: "date", render: (r) => r.workDate },
                  { header: "Status", key: "status", render: (r) => r.status },
                ]}
                emptyMessage="No attendance days aggregated yet."
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.dayRecords}
              />
            </EditableSectionCard>
            <EditableSectionCard title="Exceptions">
              <form action={createAttendanceExceptionAction} className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
                <DatePicker defaultValue={new Date().toISOString().slice(0, 10)} name="workDate" placeholder="Work date" required />
                <select className={nativeSelectClassName} name="exceptionType">
                  <option value="missing_punch_in">Missing punch in</option>
                  <option value="missing_punch_out">Missing punch out</option>
                  <option value="late_arrival">Late arrival</option>
                  <option value="early_departure">Early departure</option>
                </select>
                <Input name="notes" placeholder="Notes" />
                <Button type="submit" variant="secondary">Add Exception</Button>
              </form>
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: "Employee", key: "employee", render: (r) => r.employee },
                  { header: "Date", key: "date", render: (r) => r.workDate },
                  { header: "Type", key: "type", render: (r) => r.exceptionType },
                  { header: "Status", key: "status", render: (r) => r.status },
                  {
                    header: "Actions",
                    key: "actions",
                    render: (r) =>
                      r.rawStatus === "open" ? (
                        <form action={resolveAttendanceExceptionAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">Resolve</Button>
                        </form>
                      ) : null,
                  },
                ]}
                emptyMessage="No attendance exceptions."
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.exceptionRecords}
              />
            </EditableSectionCard>
          </div>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title="Attendance & leave timeline" /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
