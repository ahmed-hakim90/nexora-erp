"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatHrStatusLabel, type HrAttendanceLiveEmployeeDrawer } from "@/features/hr/public-api";
import { HrRelativeTime } from "../hr-relative-time";
import { Button, RecordFormDialog } from "@/shared/ui";

import { executeHrAttendanceLiveSupervisorActionAction } from "@/features/hr/routes/actions/hr-attendance-live.actions";

const ROW_HEIGHT = 52;

export function HrAttendanceLiveDrawer({
  drawer,
  employeeId,
  onClose,
}: Readonly<{
  drawer: HrAttendanceLiveEmployeeDrawer | null;
  employeeId: string | null;
  onClose: () => void;
}>) {
  const open = Boolean(employeeId);

  return (
    <RecordFormDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      subtitle="Live attendance overview, timeline, shift, and payroll impact."
      title={drawer?.employeeLabel ?? "Employee attendance"}
    >
      {drawer ? (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label="Employee code" value={drawer.employeeCode} />
            <InfoBlock label="Manager" value={drawer.managerLabel ?? "—"} />
            <InfoBlock label="Shift" value={drawer.shiftSummary ?? "—"} />
            <InfoBlock label="Leave status" value={drawer.leaveStatus ?? "—"} />
            <InfoBlock label="Assignment" value={drawer.assignmentSummary ?? "—"} />
            <InfoBlock label="Payroll impact" value={drawer.payrollImpactSummary ?? "—"} />
          </div>

          <section>
            <h4 className="mb-2 font-medium">Today timeline</h4>
            {drawer.timelineToday.length === 0 ? (
              <p className="text-muted-foreground">No punches recorded today.</p>
            ) : (
              <ul className="space-y-1">
                {drawer.timelineToday.map((entry) => (
                  <li className="rounded border px-2 py-1" key={`${entry.punchTime}-${entry.punchType}`}>
                    {formatHrStatusLabel(entry.punchType)} · {entry.label} · {new Date(entry.punchTime).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 font-medium">Previous week</h4>
            {drawer.previousWeekPunches.length === 0 ? (
              <p className="text-muted-foreground">No recent punches.</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto">
                {drawer.previousWeekPunches.map((entry) => (
                  <li className="rounded border px-2 py-1" key={`${entry.punchTime}-${entry.punchType}`}>
                    {formatHrStatusLabel(entry.punchType)} · {entry.label} · {new Date(entry.punchTime).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {drawer.warningsCount > 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              {drawer.warningsCount} open warning(s). Review exceptions before payroll.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex" href={`/erp/hr/employees?edit=${drawer.employeeId}`}>
              <Button size="sm" type="button" variant="secondary">
                Open employee
              </Button>
            </Link>
            <form action={executeHrAttendanceLiveSupervisorActionAction}>
              <input name="action" type="hidden" value="send_notification" />
              <input name="employeeId" type="hidden" value={drawer.employeeId} />
              <input name="reason" type="hidden" value="Supervisor notification from live monitor" />
              <Button size="sm" type="submit" variant="secondary">
                Send notification
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading employee attendance details…</p>
      )}
    </RecordFormDialog>
  );
}

function InfoBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function HrAttendanceLiveVirtualGrid({
  onOpenEmployee,
  records,
}: Readonly<{
  onOpenEmployee: (employeeId: string) => void;
  records: readonly import("@/features/hr/application/types/hr-attendance-live.types").HrAttendanceLiveGridRow[];
}>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const overscan = 6;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + overscan * 2;
  const endIndex = Math.min(records.length, startIndex + visibleCount);
  const offsetY = startIndex * ROW_HEIGHT;
  const totalHeight = records.length * ROW_HEIGHT;
  const visibleRows = records.slice(startIndex, endIndex);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[56px_minmax(120px,1fr)_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(120px,1fr)_120px_100px_100px_90px_90px_90px_90px_minmax(140px,1fr)_minmax(120px,1fr)_120px_100px] gap-2 border-b bg-[hsl(var(--muted))] px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Photo</span>
        <span>Code</span>
        <span>Employee</span>
        <span>Department</span>
        <span>Position</span>
        <span>Shift</span>
        <span>Status</span>
        <span>Check In</span>
        <span>Check Out</span>
        <span>Worked</span>
        <span>Late</span>
        <span>OT</span>
        <span>Location</span>
        <span>Device</span>
        <span>Actions</span>
      </div>
      <div
        className="max-h-[520px] overflow-auto"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        ref={containerRef}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleRows.map((row) => (
              <div
                className="grid grid-cols-[56px_minmax(120px,1fr)_minmax(160px,1.4fr)_minmax(120px,1fr)_minmax(120px,1fr)_120px_100px_100px_90px_90px_90px_90px_minmax(140px,1fr)_minmax(120px,1fr)_120px_100px] items-center gap-2 border-b px-3 text-sm"
                key={row.employeeId}
                style={{ height: ROW_HEIGHT }}
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full border bg-[hsl(var(--muted))] text-xs font-medium">
                  {row.photoInitials}
                </span>
                <span>{row.employeeCode}</span>
                <span className="font-medium">{row.employeeLabel}</span>
                <span>{row.departmentLabel ?? "—"}</span>
                <span>{row.positionLabel ?? "—"}</span>
                <span>{row.shiftLabel ?? "—"}</span>
                <span>
                  <StatusInline status={row.liveStatus} />
                </span>
                <span>{row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString() : "—"}</span>
                <span>{row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString() : "—"}</span>
                <span>{row.workedMinutes}m</span>
                <span>{row.lateMinutes}m</span>
                <span>{row.overtimeMinutes}m</span>
                <span>
                  {row.location?.latitude !== null && row.location?.latitude !== undefined
                    ? `${row.location.latitude.toFixed(4)}, ${row.location.longitude?.toFixed(4) ?? "—"}`
                    : "—"}
                </span>
                <span>{row.attendanceDeviceLabel ?? "—"}</span>
                <span>
                  <Button onClick={() => onOpenEmployee(row.employeeId)} size="sm" type="button" variant="secondary">
                    Open
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {records.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No employees match the current filters.</p> : null}
    </div>
  );
}

function StatusInline({ status }: Readonly<{ status: import("@/features/hr/application/types/hr-attendance-live.types").HrAttendanceLiveStatus }>) {
  return <span className="capitalize">{formatHrStatusLabel(status)}</span>;
}

export function HrAttendanceLiveMapPanel({
  location,
}: Readonly<{
  location: HrAttendanceLiveEmployeeDrawer extends never ? never : import("@/features/hr/application/types/hr-attendance-live.types").HrAttendanceLiveGpsLocation | null;
}>) {
  if (!location?.latitude || !location.longitude) return null;
  return (
    <div className="rounded-lg border bg-[hsl(var(--surface))] p-4 text-sm">
      <h4 className="mb-2 font-medium">Last location</h4>
      <p>{location.label ?? "GPS capture"}</p>
      <p className="text-muted-foreground">
        Lat {location.latitude}, Long {location.longitude}
        {location.accuracyMeters !== null ? ` · ±${location.accuracyMeters}m` : ""}
        {location.capturedAt ? (
          <>
            {" · "}
            <HrRelativeTime value={location.capturedAt} />
          </>
        ) : null}
      </p>
    </div>
  );
}
