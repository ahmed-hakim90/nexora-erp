"use client";

import Link from "next/link";

import type { HrAttendanceDeviceSyncHistoryRecord } from "@/features/hr/public-api";
import { formatHrDurationSeconds } from "@/features/hr/public-api";
import { deleteHrAttendanceDeviceSyncSessionAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EnterpriseDataTable, useTranslations } from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";

export function HrAttendanceDeviceSyncHistory({
  buildHref,
  history,
}: Readonly<{
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
  history: readonly HrAttendanceDeviceSyncHistoryRecord[];
}>) {
  const t = useTranslations();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("hr.attendance.devices.sync.history.title")}</h2>
      </div>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.device"), key: "device", render: (row) => `${row.deviceCode} — ${row.deviceName}` },
          { header: t("hr.common.status"), key: "status", render: (row) => row.status.replaceAll("_", " ") },
          { header: t("hr.common.started"), key: "started", render: (row) => <HrRelativeTime value={row.startedAt} /> },
          { header: t("hr.common.finished"), key: "finished", render: (row) => <HrRelativeTime value={row.completedAt} /> },
          { header: t("hr.common.duration"), key: "duration", render: (row) => formatHrDurationSeconds(row.durationSeconds ?? 0) },
          { header: t("hr.common.imported"), key: "imported", render: (row) => String(row.importedCount) },
          { header: t("hr.common.warnings"), key: "warnings", render: (row) => String(row.warningCount) },
          { header: t("hr.common.errors"), key: "errors", render: (row) => String(row.errorCount) },
          { header: t("hr.common.operator"), key: "operator", render: (row) => row.operatorLabel ?? "—" },
        ]}
        emptyMessage={t("hr.attendance.devices.sync.history.empty")}
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: history.length || 1, totalRows: history.length }}
        records={history}
        rowActions={(row) => [
          {
            href: buildHref({ sync: row.deviceId, syncSession: row.id }),
            isDisabled: false,
            key: "view",
            label: t("hr.common.view"),
          },
          {
            href: buildHref({ sync: row.deviceId }),
            isDisabled: row.status === "completed",
            key: "retry",
            label: t("hr.attendance.devices.drawer.retry"),
          },
          {
            href: `/api/hr/attendance-devices/sync/${row.id}/report`,
            isDisabled: false,
            key: "download",
            label: t("hr.attendance.devices.drawer.report"),
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 5).map((row) => (
          <form action={deleteHrAttendanceDeviceSyncSessionAction} key={`delete-${row.id}`}>
            <input name="sessionId" type="hidden" value={row.id} />
            <Button size="sm" type="submit" variant="secondary">
              {t("hr.attendance.devices.sync.history.deleteDevice", { code: row.deviceCode })}
            </Button>
          </form>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("hr.attendance.devices.sync.history.hint")}{" "}
        <Link className="underline" href={buildHref({})}>
          {t("hr.common.refreshList")}
        </Link>
      </p>
    </section>
  );
}
