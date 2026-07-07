"use client";

import Link from "next/link";

import type { HrAttendanceDeviceSyncHistoryRecord } from "@/features/hr/public-api";
import { formatHrDurationSeconds } from "@/features/hr/public-api";
import { deleteHrAttendanceDeviceSyncSessionAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EnterpriseDataTable } from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";

export function HrAttendanceDeviceSyncHistory({
  buildHref,
  history,
}: Readonly<{
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
  history: readonly HrAttendanceDeviceSyncHistoryRecord[];
}>) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sync history</h2>
      </div>
      <EnterpriseDataTable
        columns={[
          { header: "Device", key: "device", render: (row) => `${row.deviceCode} — ${row.deviceName}` },
          { header: "Status", key: "status", render: (row) => row.status.replaceAll("_", " ") },
          { header: "Started", key: "started", render: (row) => <HrRelativeTime value={row.startedAt} /> },
          { header: "Finished", key: "finished", render: (row) => <HrRelativeTime value={row.completedAt} /> },
          { header: "Duration", key: "duration", render: (row) => formatHrDurationSeconds(row.durationSeconds ?? 0) },
          { header: "Imported", key: "imported", render: (row) => String(row.importedCount) },
          { header: "Warnings", key: "warnings", render: (row) => String(row.warningCount) },
          { header: "Errors", key: "errors", render: (row) => String(row.errorCount) },
          { header: "Operator", key: "operator", render: (row) => row.operatorLabel ?? "—" },
        ]}
        emptyMessage="No sync sessions yet."
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: history.length || 1, totalRows: history.length }}
        records={history}
        rowActions={(row) => [
          {
            href: buildHref({ sync: row.deviceId, syncSession: row.id }),
            isDisabled: false,
            key: "view",
            label: "View",
          },
          {
            href: buildHref({ sync: row.deviceId }),
            isDisabled: row.status === "completed",
            key: "retry",
            label: "Retry",
          },
          {
            href: `/api/hr/attendance-devices/sync/${row.id}/report`,
            isDisabled: false,
            key: "download",
            label: "Report",
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 5).map((row) => (
          <form action={deleteHrAttendanceDeviceSyncSessionAction} key={`delete-${row.id}`}>
            <input name="sessionId" type="hidden" value={row.id} />
            <Button size="sm" type="submit" variant="secondary">
              Delete {row.deviceCode}
            </Button>
          </form>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Use row actions to view, retry, or download sync reports.{" "}
        <Link className="underline" href={buildHref({})}>
          Refresh list
        </Link>
      </p>
    </section>
  );
}
