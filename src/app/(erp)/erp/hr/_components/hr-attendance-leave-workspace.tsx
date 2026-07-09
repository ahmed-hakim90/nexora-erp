"use client";

import Link from "next/link";

import {
  adjustLeaveBalanceAction,
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  createLeaveRequestAction,
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
  useTranslations,
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
  const t = useTranslations();
  const activeTab = data.activeTab;

  const navItems = [
    { href: buildHref({ tab: "leave", employeeId: data.employeeId }), key: "leave", label: t("hr.attendanceLeave.tab.leave") },
    { href: buildHref({ tab: "balances", employeeId: data.employeeId }), key: "balances", label: t("hr.attendanceLeave.tab.balances") },
    { href: buildHref({ tab: "attendance", employeeId: data.employeeId }), key: "attendance", label: t("hr.attendanceLeave.tab.attendance") },
    {
      href: buildHref({
        employeeId: data.employeeId,
        month: String(data.calendarMonth.month),
        tab: "calendar",
        year: String(data.calendarMonth.year),
      }),
      key: "calendar",
      label: t("hr.attendanceLeave.tab.calendar"),
    },
    { href: buildHref({ tab: "timeline", employeeId: data.employeeId }), key: "timeline", label: t("hr.attendanceLeave.tab.timeline") },
  ] as const;

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

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={t("hr.attendanceLeave.description")}
        help={resolveHrPageHelp("attendanceLeave")}
        navItems={navItems}
        summaryMetrics={[
          { helper: t("hr.attendanceLeave.kpi.workingDays.helper"), href: buildHref({ tab: "attendance" }), label: t("hr.attendance.processing.kpi.workingDays"), value: data.summary.workingDays },
          { helper: t("hr.attendanceLeave.kpi.present.helper"), href: buildHref({ tab: "attendance", status: "present" }), label: t("hr.attendance.processing.kpi.present"), value: data.summary.present },
          { helper: t("hr.attendanceLeave.kpi.absent.helper"), href: buildHref({ tab: "attendance", status: "open" }), label: t("hr.attendanceLeave.kpi.absent"), value: data.summary.absent },
          { helper: t("hr.attendanceLeave.kpi.leave.helper"), href: buildHref({ tab: "leave" }), label: t("hr.common.leaveType"), value: data.summary.leave },
          { helper: t("hr.attendanceLeave.kpi.late.helper"), href: buildHref({ tab: "attendance" }), label: t("hr.common.late"), value: data.summary.late },
          { helper: t("hr.attendanceLeave.kpi.early.helper"), href: buildHref({ tab: "attendance" }), label: t("hr.common.early"), value: data.summary.early },
          { helper: t("hr.attendanceLeave.kpi.overtime.helper"), href: "/erp/hr/overtime", label: t("hr.attendance.processing.kpi.overtime"), value: data.summary.overtime },
          { helper: t("hr.attendanceLeave.kpi.payrollReady.helper"), href: "/erp/hr/attendance-processing?tab=summary&payroll=ready", label: t("hr.attendance.processing.kpi.payrollReady"), value: data.summary.payrollReady },
        ]}
        title={t("hr.attendanceLeave.title")}
        workspaceKey="attendance-leave"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-leave" query={{ ...query, tab: activeTab }} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceEmployeeFilter defaultValue={data.employeeId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: t("hr.attendanceLeave.filter.submitted"), value: "submitted" },
                { label: t("hr.attendanceLeave.filter.approved"), value: "approved" },
                { label: t("hr.attendanceLeave.filter.open"), value: "open" },
              ]}
            />
          </HrWorkforceFilterBar>
        }
      >
        {data.employeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {t("hr.attendanceLeave.filtered")}{" "}
            <Link className="underline" href="/erp/hr/attendance-leave">
              {t("hr.attendanceLeave.showAll")}
            </Link>
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
            <EditableSectionCard title={t("hr.attendanceLeave.section.submitLeave")}>
              <form action={createLeaveRequestAction} className={`grid gap-3 md:grid-cols-3 xl:grid-cols-6 ${data.highlightCreate ? "rounded-lg border border-[hsl(var(--accent))] p-4 ring-1 ring-[hsl(var(--accent))]" : ""}`}>
                <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required value={data.employeeId} />
                <select className={nativeSelectClassName} name="leaveTypeId" required>
                  <option value="">{t("hr.attendanceLeave.selectLeaveType")}</option>
                  {data.leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <DatePicker name="startsOn" placeholder={t("hr.common.startDate")} required />
                <DatePicker name="endsOn" placeholder={t("hr.common.endDate")} required />
                <Input name="notes" placeholder={`${t("hr.common.notes")} ${t("hr.common.optional")}`} />
                <Button disabled={data.leaveTypes.length === 0} type="submit" variant="primary">{t("hr.attendanceLeave.submitLeave")}</Button>
              </form>
              {data.leaveTypes.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("hr.attendanceLeave.noLeaveTypes")}{" "}
                  <Link className="underline" href="/erp/hr/settings?tab=leave-types">
                    {t("hr.attendanceLeave.createLeaveTypes")}
                  </Link>
                  .
                </p>
              ) : null}
            </EditableSectionCard>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (record) => record.employee },
                { header: t("hr.leave.column.leaveType"), key: "type", render: (record) => record.leaveType },
                { header: t("hr.leave.column.from"), key: "from", render: (record) => record.startsOn },
                { header: t("hr.leave.column.to"), key: "to", render: (record) => record.endsOn },
                { header: t("hr.attendanceLeave.column.days"), key: "days", render: (record) => record.days },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      {["submitted", "under_review"].includes(record.rawStatus) ? (
                        <>
                          <form action={approveLeaveRequestAction.bind(null, record.id)}>
                            <Button size="sm" type="submit" variant="primary">{t("hr.common.approve")}</Button>
                          </form>
                          <form action={rejectLeaveRequestAction.bind(null, record.id)}>
                            <Button size="sm" type="submit" variant="secondary">{t("hr.common.reject")}</Button>
                          </form>
                        </>
                      ) : null}
                      {["draft", "submitted"].includes(record.rawStatus) ? (
                        <form action={cancelLeaveRequestAction.bind(null, record.id)}>
                          <Button size="sm" type="submit" variant="secondary">{t("hr.common.cancel")}</Button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.attendanceLeave.empty.leaveRequests")}
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={data.leaveRecords}
              rowActions={(record) => [{ href: `/erp/hr/employees/${record.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
            />
          </div>
        ) : null}

        {activeTab === "balances" ? (
          <EditableSectionCard title={t("hr.attendanceLeave.section.balances")}>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (record) => record.employee },
                { header: t("hr.leave.column.leaveType"), key: "type", render: (record) => record.leaveType },
                { header: t("hr.common.date"), key: "asOf", render: (record) => record.asOfDate },
                { header: t("hr.attendanceLeave.column.availableDays"), key: "balance", render: (record) => String(record.availableQuantity) },
                {
                  header: t("hr.attendanceLeave.column.adjust"),
                  key: "adjust",
                  render: (record) => (
                    <form action={adjustLeaveBalanceAction} className="flex items-center gap-2">
                      <input name="balanceId" type="hidden" value={record.id} />
                      <Input className="w-24" defaultValue={String(record.availableQuantity)} min="0" name="availableQuantity" step="0.5" type="number" />
                      <Button size="sm" type="submit" variant="secondary">{t("hr.common.save")}</Button>
                    </form>
                  ),
                },
              ]}
              emptyMessage={t("hr.attendanceLeave.empty.balances")}
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={data.balanceRecords}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "attendance" ? (
          <div className="space-y-6">
            <EditableSectionCard title={t("hr.attendanceLeave.section.recordPunch")}>
              <form action={recordAttendancePunchAction} className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required value={data.employeeId} />
                <select className={nativeSelectClassName} defaultValue="in" name="punchType">
                  <option value="in">{t("hr.attendanceLeave.clockIn")}</option>
                  <option value="out">{t("hr.attendanceLeave.clockOut")}</option>
                </select>
                <Input name="punchTime" placeholder={t("hr.attendanceLeave.punchTimeOptional")} type="datetime-local" />
                <Button type="submit" variant="primary">{t("hr.attendanceLeave.recordPunch")}</Button>
              </form>
            </EditableSectionCard>
            <EditableSectionCard title={t("hr.attendanceLeave.section.punchLog")}>
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
                  { header: t("hr.common.type"), key: "type", render: (r) => r.punchType },
                  { header: t("hr.common.time"), key: "time", render: (r) => r.punchTime },
                  { header: t("hr.attendanceLeave.column.source"), key: "source", render: (r) => r.source },
                ]}
                emptyMessage={t("hr.attendanceLeave.empty.punches")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.punchRecords}
              />
            </EditableSectionCard>
            <EditableSectionCard title={t("hr.attendanceLeave.section.attendanceDays")}>
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
                  { header: t("hr.common.date"), key: "date", render: (r) => r.workDate },
                  { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                ]}
                emptyMessage={t("hr.attendanceLeave.empty.days")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.dayRecords}
              />
            </EditableSectionCard>
            <EditableSectionCard title={t("hr.attendanceLeave.section.exceptions")}>
              <form action={createAttendanceExceptionAction} className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
                <DatePicker defaultValue={new Date().toISOString().slice(0, 10)} name="workDate" placeholder={t("hr.common.workDate")} required />
                <select className={nativeSelectClassName} name="exceptionType">
                  <option value="missing_punch_in">{t("hr.attendanceLeave.exception.missingPunchIn")}</option>
                  <option value="missing_punch_out">{t("hr.attendanceLeave.exception.missingPunchOut")}</option>
                  <option value="late_arrival">{t("hr.attendanceLeave.exception.lateArrival")}</option>
                  <option value="early_departure">{t("hr.attendanceLeave.exception.earlyDeparture")}</option>
                </select>
                <Input name="notes" placeholder={t("hr.common.notes")} />
                <Button type="submit" variant="secondary">{t("hr.attendanceLeave.addException")}</Button>
              </form>
              <HrWorkforceEnterpriseTable
                columns={[
                  { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
                  { header: t("hr.common.date"), key: "date", render: (r) => r.workDate },
                  { header: t("hr.common.type"), key: "type", render: (r) => r.exceptionType },
                  { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (r) =>
                      r.rawStatus === "open" ? (
                        <form action={resolveAttendanceExceptionAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">{t("hr.attendanceLeave.resolve")}</Button>
                        </form>
                      ) : null,
                  },
                ]}
                emptyMessage={t("hr.attendanceLeave.empty.exceptions")}
                getRowId={(r) => r.id}
                pagination={{ mode: "cursor", pageSize: 50 }}
                records={data.exceptionRecords}
              />
            </EditableSectionCard>
          </div>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title={t("hr.attendanceLeave.timelineTitle")} /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
