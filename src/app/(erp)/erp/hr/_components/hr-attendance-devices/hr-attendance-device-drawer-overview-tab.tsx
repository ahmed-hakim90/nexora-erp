"use client";

import type { HrAttendanceDeviceDetailRecord } from "@/features/hr/public-api";
import {
  formatHrAttendanceDeviceHealthLabel,
  formatHrConnectionQualityLabel,
  formatHrStatusLabel,
} from "@/features/hr/public-api";
import { HrRelativeTime } from "../hr-relative-time";
import { DetailItem, TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerOverviewTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const { data, error, loading } = useDeviceTabData<{ detail: HrAttendanceDeviceDetailRecord }>(deviceId, "detail", enabled);

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;
  const detail = data?.detail;
  if (!detail) return <p className="text-sm text-muted-foreground">No device detail available.</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-medium">Operations</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <DetailItem label="Branch" value={detail.branchLabel} />
          <DetailItem label="Status" value={formatHrStatusLabel(detail.status)} />
          <DetailItem label="Health" value={formatHrAttendanceDeviceHealthLabel(detail.healthStatus)} />
          <DetailItem label="Connection" value={formatHrConnectionQualityLabel(detail.connectionQuality)} />
          <DetailItem label="Auto sync" value={detail.autoSyncInterval.replaceAll("_", " ")} />
          <DetailItem label="Serial" value={detail.serialNumber ?? "—"} />
          <div>
            <dt className="text-muted-foreground">Heartbeat</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastHeartbeatAt} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last sync</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastSyncAt} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Next auto sync</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.nextAutoSyncAt} />
            </dd>
          </div>
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">Today&apos;s statistics</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <DetailItem label="Punches" value={String(detail.todayPunches)} />
          <DetailItem label="Imported today" value={String(detail.importedToday)} />
          <DetailItem label="Failed imports" value={String(detail.failedImportsToday)} />
          <DetailItem label="Queue" value={String(detail.pendingQueue)} />
          <DetailItem label="Employees" value={String(detail.employeesLoaded)} />
          <DetailItem label="Auto sync" value={detail.autoSyncInterval.replaceAll("_", " ")} />
        </dl>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium">Runtime</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <DetailItem label="SDK" value={detail.sdkVersion ?? "—"} />
          <DetailItem label="Storage" value={detail.storageUsagePct !== null ? `${detail.storageUsagePct}%` : "—"} />
          <DetailItem label="Memory" value={detail.memoryUsagePct !== null ? `${detail.memoryUsagePct}%` : "—"} />
          <DetailItem label="Temperature" value={detail.temperatureC !== null ? `${detail.temperatureC}°C` : "—"} />
          <DetailItem label="Timezone" value={detail.timezone} />
          <DetailItem label="MAC" value={detail.macAddress ?? "—"} />
          <DetailItem label="IP" value={detail.ipAddress ?? "—"} />
          <DetailItem label="Port" value={detail.port ? String(detail.port) : "—"} />
          <DetailItem label="Connection" value={formatHrConnectionQualityLabel(detail.connectionQuality)} />
          <div>
            <dt className="text-muted-foreground">Last restart</dt>
            <dd className="font-medium">
              <HrRelativeTime value={detail.lastRestartAt} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
