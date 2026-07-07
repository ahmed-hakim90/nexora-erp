"use client";

import { lazy, Suspense, useState } from "react";

import type {
  HrAttendanceDeviceListRecord,
  HrAttendanceDeviceSyncHistoryRecord,
} from "@/features/hr/public-api";
import {
  formatHrAttendanceDeviceHealthLabel,
  formatHrAttendanceDeviceSubtitle,
} from "@/features/hr/public-api";
import { Button, Drawer, Tabs } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import {
  HrAttendanceDeviceHealthBadge,
  HR_ATTENDANCE_DEVICE_HEALTH_STATUS_TONE,
} from "./hr-attendance-device-health-badge";
import { HrAttendanceDeviceDrawerSyncTab } from "./hr-attendance-device-drawer-sync-tab";
import { HrAttendanceDeviceDrawerSettingsTab } from "./hr-attendance-device-drawer-settings-tab";
import { HrAttendanceDeviceDrawerAuditTab, HrAttendanceDeviceDrawerLogsTab } from "./hr-attendance-device-drawer-logs-tab";

const HrAttendanceDeviceDrawerOverviewTab = lazy(() =>
  import("./hr-attendance-device-drawer-overview-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerOverviewTab })),
);
const HrAttendanceDeviceDrawerConnectionTab = lazy(() =>
  import("./hr-attendance-device-drawer-connection-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerConnectionTab })),
);
const HrAttendanceDeviceDrawerRealtimeTab = lazy(() =>
  import("./hr-attendance-device-drawer-realtime-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerRealtimeTab })),
);
const HrAttendanceDeviceDrawerUsersTab = lazy(() =>
  import("./hr-attendance-device-drawer-users-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerUsersTab })),
);
const HrAttendanceDeviceDrawerPunchesTab = lazy(() =>
  import("./hr-attendance-device-drawer-punches-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerPunchesTab })),
);
const HrAttendanceDeviceDrawerDiagnosticsTab = lazy(() =>
  import("./hr-attendance-device-drawer-diagnostics-tab").then((module) => ({ default: module.HrAttendanceDeviceDrawerDiagnosticsTab })),
);

type DrawerTabKey =
  | "overview"
  | "connection"
  | "realtime"
  | "users"
  | "punches"
  | "diagnostics"
  | "sync"
  | "logs"
  | "settings"
  | "audit";

function TabFallback() {
  return <p className="text-sm text-muted-foreground">Loading tab…</p>;
}

export function HrAttendanceDeviceDrawer({
  autoSyncOptions,
  buildHref,
  device,
  history,
  onClose,
  onEdit,
  open,
}: Readonly<{
  autoSyncOptions: readonly string[];
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
  device: HrAttendanceDeviceListRecord | null;
  history: readonly HrAttendanceDeviceSyncHistoryRecord[];
  onClose: () => void;
  onEdit: (deviceId: string) => void;
  open: boolean;
}>) {
  const [activeTab, setActiveTab] = useState<DrawerTabKey>("overview");

  if (!device) return null;

  const tabs = [
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerOverviewTab deviceId={device.id} enabled={activeTab === "overview"} />
        </Suspense>
      ),
      key: "overview",
      label: "Overview",
    },
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerConnectionTab deviceId={device.id} enabled={activeTab === "connection"} />
        </Suspense>
      ),
      key: "connection",
      label: "Connection",
    },
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerRealtimeTab deviceId={device.id} enabled={activeTab === "realtime"} />
        </Suspense>
      ),
      key: "realtime",
      label: "Realtime",
    },
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerUsersTab deviceId={device.id} enabled={activeTab === "users"} />
        </Suspense>
      ),
      key: "users",
      label: "Users",
    },
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerPunchesTab deviceId={device.id} enabled={activeTab === "punches"} />
        </Suspense>
      ),
      key: "punches",
      label: "Punches",
    },
    {
      content: (
        <Suspense fallback={<TabFallback />}>
          <HrAttendanceDeviceDrawerDiagnosticsTab deviceId={device.id} enabled={activeTab === "diagnostics"} />
        </Suspense>
      ),
      key: "diagnostics",
      label: "Diagnostics",
    },
    {
      content: <HrAttendanceDeviceDrawerSyncTab buildHref={buildHref} deviceId={device.id} history={history} />,
      key: "sync",
      label: "Sync sessions",
    },
    {
      content: <HrAttendanceDeviceDrawerLogsTab deviceId={device.id} enabled={activeTab === "logs"} />,
      key: "logs",
      label: "Logs",
    },
    {
      content: <HrAttendanceDeviceDrawerSettingsTab autoSyncOptions={autoSyncOptions} device={device} onEdit={onEdit} />,
      key: "settings",
      label: "Settings",
    },
    {
      content: <HrAttendanceDeviceDrawerAuditTab deviceId={device.id} enabled={activeTab === "audit"} />,
      key: "audit",
      label: "Audit",
    },
  ];

  return (
    <Drawer onOpenChange={(next) => { if (!next) onClose(); }} open={open} title={device.name}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{device.code}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatHrAttendanceDeviceSubtitle({
                deviceType: device.deviceType,
                ipAddress: device.ipAddress,
                model: device.model,
                port: device.port,
                vendor: device.vendor,
              })}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
              HR_ATTENDANCE_DEVICE_HEALTH_STATUS_TONE[device.healthStatus],
            )}
          >
            {formatHrAttendanceDeviceHealthLabel(device.healthStatus)}
          </span>
        </div>

        <HrAttendanceDeviceHealthBadge dimensions={device.healthDimensions} score={device.healthDimensions.overallScorePercent} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onEdit(device.id)} size="sm" type="button">
            Edit device
          </Button>
          <Button onClick={() => window.location.assign(buildHref({ sync: device.id }))} size="sm" type="button" variant="secondary">
            Open sync wizard
          </Button>
        </div>

        <Tabs activeKey={activeTab} onValueChange={(value) => setActiveTab(value as DrawerTabKey)} tabs={tabs} />
      </div>
    </Drawer>
  );
}
