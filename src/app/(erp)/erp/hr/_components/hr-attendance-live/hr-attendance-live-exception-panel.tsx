"use client";

import { formatHrStatusLabel, type HrAttendanceLiveExceptionRecord } from "@/features/hr/public-api";
import { Button, useTranslations } from "@/shared/ui";

import { executeHrAttendanceLiveSupervisorActionAction } from "@/features/hr/routes/actions/hr-attendance-live.actions";

export function HrAttendanceLiveExceptionPanel({
  exceptions,
  onOpenEmployee,
}: Readonly<{
  exceptions: readonly HrAttendanceLiveExceptionRecord[];
  onOpenEmployee: (employeeId: string) => void;
}>) {
  const t = useTranslations();

  if (exceptions.length === 0) {
    return (
      <div className="rounded-lg border bg-[hsl(var(--surface))] p-4 text-sm text-muted-foreground">
        {t("hr.attendance.live.exceptions.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-[hsl(var(--surface))] p-4">
      <h3 className="text-sm font-medium">{t("hr.attendance.live.exceptions.title")}</h3>
      <div className="space-y-2">
        {exceptions.map((exception) => (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm" key={exception.exceptionId}>
            <div>
              <p className="font-medium">{exception.employeeLabel}</p>
              <p className="text-muted-foreground">
                {formatHrStatusLabel(exception.panelType)} · {formatHrStatusLabel(exception.exceptionType)} · {exception.workDate}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onOpenEmployee(exception.employeeId)} size="sm" type="button" variant="secondary">
                {t("hr.attendance.live.exceptions.openEmployee")}
              </Button>
              <form action={executeHrAttendanceLiveSupervisorActionAction}>
                <input name="action" type="hidden" value="approve_missing_punch" />
                <input name="employeeId" type="hidden" value={exception.employeeId} />
                <input name="exceptionId" type="hidden" value={exception.exceptionId} />
                <input name="reason" type="hidden" value="Approved from live monitor" />
                <Button size="sm" type="submit" variant="primary">
                  {t("hr.attendance.live.exceptions.approve")}
                </Button>
              </form>
              <form action={executeHrAttendanceLiveSupervisorActionAction}>
                <input name="action" type="hidden" value="ignore_warning" />
                <input name="employeeId" type="hidden" value={exception.employeeId} />
                <input name="exceptionId" type="hidden" value={exception.exceptionId} />
                <input name="reason" type="hidden" value="Dismissed from live monitor" />
                <Button size="sm" type="submit" variant="secondary">
                  {t("hr.attendance.live.exceptions.ignore")}
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
