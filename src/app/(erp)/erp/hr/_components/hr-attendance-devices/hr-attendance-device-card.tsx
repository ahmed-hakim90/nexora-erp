"use client";

import { cn } from "@/shared/ui/utils";

import type { HrAttendanceDeviceListRecord } from "@/features/hr/public-api";
import {
  formatHrAttendanceDeviceHealthLabel,
  formatHrAttendanceDeviceSubtitle,
  formatHrConnectionQualityLabel,
} from "@/features/hr/public-api";
import { HrRelativeTime } from "../hr-relative-time";
import { Button, useTranslations } from "@/shared/ui";

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
  const t = useTranslations();

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
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.ipPort")}</dt>
          <dd className="font-medium">{device.ipAddress ?? "—"}{device.port ? `:${device.port}` : ""}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.branch")}</dt>
          <dd className="font-medium">{device.branchLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.connection")}</dt>
          <dd className="font-medium">{formatHrConnectionQualityLabel(device.connectionQuality)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.autoSync")}</dt>
          <dd className="font-medium capitalize">{device.autoSyncLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.employees")}</dt>
          <dd className="font-medium">{device.employeesLoaded}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.todayPunches")}</dt>
          <dd className="font-medium">{device.todayPunches}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.importedToday")}</dt>
          <dd className="font-medium">{device.importedToday}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.failedImports")}</dt>
          <dd className="font-medium">{device.failedImportsToday}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.pendingQueue")}</dt>
          <dd className="font-medium">{device.pendingQueue}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.firmware")}</dt>
          <dd className="font-medium">{device.firmware ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.serial")}</dt>
          <dd className="font-medium">{device.serialNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.lastSync")}</dt>
          <dd className="font-medium">
            <HrRelativeTime value={device.lastSyncAt} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("hr.attendance.devices.card.heartbeat")}</dt>
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
          {t("hr.attendance.devices.card.controlCenter")}
        </Button>
        <Button onClick={() => onEdit(device.id)} size="sm" type="button" variant="secondary">
          {t("hr.attendance.devices.card.edit")}
        </Button>
        <Button onClick={() => onSync(device.id)} size="sm" type="button" variant="primary">
          {t("hr.attendance.devices.card.sync")}
        </Button>
      </div>
    </article>
  );
}
