"use client";

import Link from "next/link";

import { HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES } from "@/features/hr/public-api";
import type { HrAttendanceDeviceSyncHistoryRecord } from "@/features/hr/public-api";
import { formatHrAttendanceDeviceSyncStrategyLabel, formatHrDurationSeconds } from "@/features/hr/public-api";
import {
  deleteHrAttendanceDeviceSyncSessionAction,
  startHrAttendanceDeviceEnterpriseSyncFormAction,
  cancelHrAttendanceDeviceSyncSessionAction,
} from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EnterpriseDataTable } from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";
import { DeviceActionForm } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerSyncTab({
  buildHref,
  deviceId,
  history,
}: Readonly<{
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
  deviceId: string;
  history: readonly HrAttendanceDeviceSyncHistoryRecord[];
}>) {
  const deviceHistory = history.filter((row) => row.deviceId === deviceId);
  const activeSession = deviceHistory.find((row) =>
    ["queued", "connecting", "downloading_users", "downloading_punches", "validating", "importing"].includes(row.status),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-medium">Sync center</h3>
        <div className="flex flex-wrap gap-2">
          {HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES.map((strategy) => (
            <DeviceActionForm
              action={startHrAttendanceDeviceEnterpriseSyncFormAction}
              hiddenFields={{
                deviceId,
                recalculateAttendance: "true",
                skipDuplicates: "true",
                strategy,
              }}
              key={strategy}
            >
              <Button size="sm" type="submit" variant={strategy === "incremental" ? "primary" : "secondary"}>
                {formatHrAttendanceDeviceSyncStrategyLabel(strategy)}
              </Button>
            </DeviceActionForm>
          ))}
        </div>
        {activeSession ? (
          <div className="flex flex-wrap gap-2">
            <DeviceActionForm hiddenFields={{ sessionId: activeSession.id }} action={cancelHrAttendanceDeviceSyncSessionAction}>
              <Button size="sm" type="submit" variant="secondary">
                Cancel running
              </Button>
            </DeviceActionForm>
            <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm" href={buildHref({ sync: deviceId, syncSession: activeSession.id })}>
              View progress
            </Link>
          </div>
        ) : null}
      </section>

      <EnterpriseDataTable
        columns={[
          { header: "Strategy", key: "strategy", render: (row) => row.strategyLabel ?? "—" },
          { header: "Status", key: "status", render: (row) => row.status.replaceAll("_", " ") },
          { header: "Started", key: "started", render: (row) => <HrRelativeTime value={row.startedAt} /> },
          { header: "Duration", key: "duration", render: (row) => formatHrDurationSeconds(row.durationSeconds ?? 0) },
          { header: "Imported", key: "imported", render: (row) => String(row.importedCount) },
          { header: "Skipped", key: "skipped", render: (row) => String(row.recordsSkipped) },
          { header: "Warnings", key: "warnings", render: (row) => String(row.warningCount) },
          { header: "Errors", key: "errors", render: (row) => String(row.errorCount) },
          { header: "Operator", key: "operator", render: (row) => row.operatorLabel ?? "—" },
        ]}
        emptyMessage="No sync sessions for this device."
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: deviceHistory.length || 1, totalRows: deviceHistory.length }}
        records={deviceHistory}
        rowActions={(row) => [
          { href: buildHref({ sync: deviceId, syncSession: row.id }), isDisabled: false, key: "view", label: "Replay" },
          { href: buildHref({ sync: deviceId }), isDisabled: row.status === "completed", key: "retry", label: "Retry" },
          { href: `/api/hr/attendance-devices/sync/${row.id}/report`, isDisabled: false, key: "report", label: "Report" },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {deviceHistory.slice(0, 3).map((row) => (
          <DeviceActionForm action={deleteHrAttendanceDeviceSyncSessionAction} hiddenFields={{ sessionId: row.id }} key={`delete-${row.id}`}>
            <Button size="sm" type="submit" variant="secondary">
              Delete session
            </Button>
          </DeviceActionForm>
        ))}
      </div>
    </div>
  );
}
