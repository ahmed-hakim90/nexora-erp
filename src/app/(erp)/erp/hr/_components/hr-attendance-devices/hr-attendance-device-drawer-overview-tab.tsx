"use client";

import type { HrAttendanceDeviceDetailRecord } from "@/features/hr/public-api";
import {
  formatHrAttendanceDeviceHealthLabel,
  formatHrConnectionQualityLabel,
  formatHrStatusLabel,
} from "@/features/hr/public-api";
import { useTranslations } from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";
import { DetailItem, TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerOverviewTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const { data, error, loading } = useDeviceTabData<{ detail: HrAttendanceDeviceDetailRecord }>(deviceId, "detail", enabled);

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;
  const detail = data?.detail;
  if (!detail) return <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.noDeviceDetail")}</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.operations")}</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <DetailItem label={t("hr.attendance.devices.card.branch")} value={detail.branchLabel} />
          <DetailItem label={t("hr.common.status")} value={formatHrStatusLabel(detail.status)} />
          <DetailItem label={t("hr.common.health")} value={formatHrAttendanceDeviceHealthLabel(detail.healthStatus)} />
          <DetailItem label={t("hr.attendance.devices.card.connection")} value={formatHrConnectionQualityLabel(detail.connectionQuality)} />
          <DetailItem label={t("hr.attendance.devices.card.autoSync")} value={detail.autoSyncInterval.replaceAll("_", " ")} />
          <DetailItem label={t("hr.attendance.devices.card.serial")} value={detail.serialNumber ?? "—"} />
          <div>
            <dt className="text-muted-foreground">{t("hr.attendance.devices.card.heartbeat")}</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastHeartbeatAt} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("hr.attendance.devices.card.lastSync")}</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastSyncAt} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("hr.attendance.devices.drawer.nextAutoSync")}</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.nextAutoSyncAt} />
            </dd>
          </div>
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.todayStats")}</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <DetailItem label={t("hr.common.punches")} value={String(detail.todayPunches)} />
          <DetailItem label={t("hr.attendance.devices.card.importedToday")} value={String(detail.importedToday)} />
          <DetailItem label={t("hr.attendance.devices.card.failedImports")} value={String(detail.failedImportsToday)} />
          <DetailItem label={t("hr.common.queue")} value={String(detail.pendingQueue)} />
          <DetailItem label={t("hr.attendance.devices.card.employees")} value={String(detail.employeesLoaded)} />
          <DetailItem label={t("hr.attendance.devices.card.autoSync")} value={detail.autoSyncInterval.replaceAll("_", " ")} />
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.runtime")}</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <DetailItem label={t("hr.attendance.devices.drawer.sdk")} value={detail.sdkVersion ?? "—"} />
          <DetailItem
            label={t("hr.attendance.devices.drawer.storage")}
            value={detail.storageUsagePct !== null ? `${detail.storageUsagePct}%` : "—"}
          />
          <DetailItem
            label={t("hr.attendance.devices.drawer.memory")}
            value={detail.memoryUsagePct !== null ? `${detail.memoryUsagePct}%` : "—"}
          />
          <DetailItem
            label={t("hr.attendance.devices.drawer.temperature")}
            value={detail.temperatureC !== null ? `${detail.temperatureC}°C` : "—"}
          />
          <DetailItem label={t("hr.attendance.devices.form.timezone")} value={detail.timezone} />
          <DetailItem label={t("hr.attendance.devices.connection.mac")} value={detail.macAddress ?? "—"} />
          <DetailItem label={t("hr.attendance.devices.connection.ip")} value={detail.ipAddress ?? "—"} />
          <DetailItem label={t("hr.attendance.devices.form.port")} value={detail.port ? String(detail.port) : "—"} />
          <DetailItem label={t("hr.attendance.devices.card.connection")} value={formatHrConnectionQualityLabel(detail.connectionQuality)} />
          <div>
            <dt className="text-muted-foreground">{t("hr.attendance.devices.drawer.lastRestart")}</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastRestartAt} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
