"use client";

import { cn } from "@/shared/ui/utils";

import type { HrAttendanceDeviceListRecord } from "@/features/hr/public-api";
import {
  formatHrAttendanceDeviceHealthLabel,
  formatHrAttendanceDeviceSubtitle,
  formatHrConnectionQualityLabel,
} from "@/features/hr/public-api";
import { HrRelativeTime } from "../hr-relative-time";
import { Button } from "@/shared/ui";

import {
  HrAttendanceDeviceHealthBadge,
  HR_ATTENDANCE_DEVICE_HEALTH_STATUS_TONE,
} from "./hr-attendance-device-health-badge";

export function HrAttendanceDeviceCard({
  device,
  onEdit,
  onOpen,
  onSync,
}: Readonly<{
  device: HrAttendanceDeviceListRecord;
  onEdit: (deviceId: string) => void;
  onOpen: (deviceId: string) => void;
  onSync: (deviceId: string) => void;
}>) {
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-[hsl(var(--surface))] p-4 shadow-sm transition hover:border-[hsl(var(--accent))]/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{device.code}</p>
          <h3 className="mt-1 text-lg font-semibold">{device.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatHrAttendanceDeviceSubtitle({
              deviceType: device.deviceType,
              model: device.model,
              vendor: device.vendor,
            })}
          </p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]", HR_ATTENDANCE_DEVICE_HEALTH_STATUS_TONE[device.healthStatus])}>
          {formatHrAttendanceDeviceHealthLabel(device.healthStatus)}
        </span>
      </div>

      <div className="mt-4">
        <HrAttendanceDeviceHealthBadge dimensions={device.healthDimensions} score={device.healthDimensions.overallScorePercent} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">IP / Port</dt>
          <dd className="font-medium">{device.ipAddress ?? "—"}{device.port ? `:${device.port}` : ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Branch</dt>
          <dd className="font-medium">{device.branchLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Connection</dt>
          <dd className="font-medium">{formatHrConnectionQualityLabel(device.connectionQuality)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Auto sync</dt>
          <dd className="font-medium capitalize">{device.autoSyncLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Employees</dt>
          <dd className="font-medium">{device.employeesLoaded}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Today punches</dt>
          <dd className="font-medium">{device.todayPunches}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Imported today</dt>
          <dd className="font-medium">{device.importedToday}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failed imports</dt>
          <dd className="font-medium">{device.failedImportsToday}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Pending queue</dt>
          <dd className="font-medium">{device.pendingQueue}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Firmware</dt>
          <dd className="font-medium">{device.firmware ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Serial</dt>
          <dd className="font-medium">{device.serialNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last sync</dt>
          <dd className="font-medium">
            <HrRelativeTime value={device.lastSyncAt} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Heartbeat</dt>
          <dd className="font-medium">
            <HrRelativeTime value={device.lastHeartbeatAt} />
          </dd>
        </div>
      </dl>

      {device.currentJobLabel ? (
        <p className="mt-3 rounded-md border bg-[hsl(var(--muted))]/40 px-3 py-2 text-sm text-muted-foreground">
          {device.currentJobLabel}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button onClick={() => onOpen(device.id)} size="sm" type="button" variant="secondary">
          Control center
        </Button>
        <Button onClick={() => onEdit(device.id)} size="sm" type="button" variant="secondary">
          Edit
        </Button>
        <Button onClick={() => onSync(device.id)} size="sm" type="button">
          Sync
        </Button>
      </div>
    </article>
  );
}
