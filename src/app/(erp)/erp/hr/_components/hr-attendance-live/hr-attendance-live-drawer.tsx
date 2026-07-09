"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { translateHrLiveStatus, translateHrPunchType, type HrAttendanceLiveEmployeeDrawer } from "@/features/hr/public-api";
import { HrRelativeTime } from "../hr-relative-time";
import { executeHrAttendanceLiveSupervisorActionAction } from "@/features/hr/routes/actions/hr-attendance-live.actions";
import { Button, RecordFormDialog, useTranslations } from "@/shared/ui";

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
  const t = useTranslations();
  const open = Boolean(employeeId);

  return (
    <RecordFormDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      subtitle={t("hr.attendance.live.drawer.subtitle")}
      title={drawer?.employeeLabel ?? t("hr.attendance.live.drawer.defaultTitle")}
    >
      {drawer ? (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label={t("hr.attendance.live.drawer.employeeCode")} value={drawer.employeeCode} />
            <InfoBlock label={t("hr.common.manager")} value={drawer.managerLabel ?? "—"} />
            <InfoBlock label={t("hr.common.shift")} value={drawer.shiftSummary ?? "—"} />
            <InfoBlock label={t("hr.attendance.live.drawer.leaveStatus")} value={drawer.leaveStatus ? translateHrLiveStatus(t, drawer.leaveStatus) : "—"} />
            <InfoBlock label={t("hr.common.assignment")} value={drawer.assignmentSummary ?? "—"} />
            <InfoBlock label={t("hr.attendance.live.drawer.payrollImpact")} value={drawer.payrollImpactSummary ?? "—"} />
          </div>

          <section>
            <h4 className="mb-2 font-medium">{t("hr.attendance.live.drawer.todayTimeline")}</h4>
            {drawer.timelineToday.length === 0 ? (
              <p className="text-muted-foreground">{t("hr.attendance.live.drawer.noPunchesToday")}</p>
            ) : (
              <ul className="space-y-1">
                {drawer.timelineToday.map((entry) => (
                  <li className="rounded border px-2 py-1" key={`${entry.punchTime}-${entry.punchType}`}>
                    {translateHrPunchType(t, entry.punchType)} · {entry.label} · {new Date(entry.punchTime).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 font-medium">{t("hr.attendance.live.drawer.previousWeek")}</h4>
            {drawer.previousWeekPunches.length === 0 ? (
              <p className="text-muted-foreground">{t("hr.attendance.live.drawer.noRecentPunches")}</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto">
                {drawer.previousWeekPunches.map((entry) => (
                  <li className="rounded border px-2 py-1" key={`${entry.punchTime}-${entry.punchType}`}>
                    {translateHrPunchType(t, entry.punchType)} · {entry.label} · {new Date(entry.punchTime).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {drawer.warningsCount > 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              {t("hr.attendance.live.drawer.warnings", { count: drawer.warningsCount })}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex" href={`/erp/hr/employees?edit=${drawer.employeeId}`}>
              <Button size="sm" type="button" variant="secondary">
                {t("hr.attendance.live.drawer.openEmployee")}
              </Button>
            </Link>
            <form action={executeHrAttendanceLiveSupervisorActionAction}>
              <input name="action" type="hidden" value="send_notification" />
              <input name="employeeId" type="hidden" value={drawer.employeeId} />
              <input name="reason" type="hidden" value="Supervisor notification from live monitor" />
              <Button size="sm" type="submit" variant="secondary">
                {t("hr.attendance.live.drawer.sendNotification")}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("hr.attendance.live.drawer.loading")}</p>
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
  const t = useTranslations();
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
        <span>{t("hr.attendance.live.grid.photo")}</span>
        <span>{t("hr.attendance.live.grid.code")}</span>
        <span>{t("hr.attendance.live.grid.employee")}</span>
        <span>{t("hr.common.department")}</span>
        <span>{t("hr.common.position")}</span>
        <span>{t("hr.common.shift")}</span>
        <span>{t("hr.common.status")}</span>
        <span>{t("hr.attendance.live.grid.checkIn")}</span>
        <span>{t("hr.attendance.live.grid.checkOut")}</span>
        <span>{t("hr.attendance.live.grid.worked")}</span>
        <span>{t("hr.attendance.live.grid.late")}</span>
        <span>{t("hr.attendance.live.grid.ot")}</span>
        <span>{t("hr.attendance.live.grid.location")}</span>
        <span>{t("hr.attendance.live.grid.device")}</span>
        <span>{t("hr.common.actions")}</span>
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
                    {t("hr.common.openAction")}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {records.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{t("hr.attendance.live.grid.empty")}</p>
      ) : null}
    </div>
  );
}

function StatusInline({ status }: Readonly<{ status: import("@/features/hr/application/types/hr-attendance-live.types").HrAttendanceLiveStatus }>) {
  const t = useTranslations();
  return <span>{translateHrLiveStatus(t, status)}</span>;
}

export function HrAttendanceLiveMapPanel({
  location,
}: Readonly<{
  location: HrAttendanceLiveEmployeeDrawer extends never ? never : import("@/features/hr/application/types/hr-attendance-live.types").HrAttendanceLiveGpsLocation | null;
}>) {
  const t = useTranslations();
  if (!location?.latitude || !location.longitude) return null;
  return (
    <div className="rounded-lg border bg-[hsl(var(--surface))] p-4 text-sm">
      <h4 className="mb-2 font-medium">{t("hr.attendance.live.map.lastLocation")}</h4>
      <p>{location.label ?? t("hr.attendance.live.map.gpsCapture")}</p>
      <p className="text-muted-foreground">
        {t("hr.attendance.live.map.latLong", { lat: location.latitude, long: location.longitude })}
        {location.accuracyMeters !== null ? ` · ${t("hr.attendance.live.map.accuracy", { meters: location.accuracyMeters })}` : ""}
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
