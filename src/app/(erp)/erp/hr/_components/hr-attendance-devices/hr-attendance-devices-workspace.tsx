"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formatHrDurationSeconds } from "@/features/hr/public-api";
import type {
  HrAttendanceDeviceEditRecord,
  HrAttendanceDevicesWorkspaceData,
} from "@/features/hr/public-api";
import { Input, PageContainer, nativeSelectClassName, primaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";
import { HrWorkforceFilterBar, HrWorkforceSearchFilter } from "../hr-workforce-filter-bar";
import { HrWorkforceWorkspaceShell } from "../hr-workforce-workspace-shell";
import { HrAttendanceDeviceAnalyticsPanel } from "./hr-attendance-device-analytics";
import { HrAttendanceDeviceCard } from "./hr-attendance-device-card";
import { HrAttendanceDeviceDrawer } from "./hr-attendance-device-drawer";
import { HrAttendanceDeviceFormDialog } from "./hr-attendance-device-form-dialog";
import { HrAttendanceDeviceSyncHistory } from "./hr-attendance-device-sync-history";
import { HrAttendanceDeviceSyncWizard } from "./hr-attendance-device-sync-wizard";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined> = {}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/attendance-devices?${query}` : "/erp/hr/attendance-devices";
}

export function HrAttendanceDevicesWorkspace({
  data,
  editDevice,
  query,
}: Readonly<{
  data: HrAttendanceDevicesWorkspaceData;
  editDevice?: HrAttendanceDeviceEditRecord | null;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [drawerDeviceId, setDrawerDeviceId] = useState<string | null>(null);
  const drawerDevice = useMemo(
    () => data.records.find((record) => record.id === drawerDeviceId) ?? null,
    [data.records, drawerDeviceId],
  );

  const activeTab = query.tab ?? "devices";

  const navItems = [
    { href: buildHref(query, { tab: "devices" }), key: "devices", label: t("hr.attendance.devices.tab.devices") },
    { href: buildHref(query, { tab: "analytics" }), key: "analytics", label: t("hr.attendance.devices.tab.analytics") },
    { href: buildHref(query, { tab: "sync-history" }), key: "sync-history", label: t("hr.attendance.devices.tab.syncHistory") },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={t("hr.attendance.devices.description")}
        navItems={navItems}
        summaryMetrics={[
          {
            helper: t("hr.attendance.devices.kpi.connected.helper"),
            href: buildHref(query, { healthStatus: "healthy", tab: "devices" }),
            label: t("hr.attendance.devices.kpi.connected"),
            value: data.kpis.connectedCount,
          },
          {
            helper: t("hr.attendance.devices.kpi.offline.helper"),
            href: buildHref(query, { healthStatus: "offline", tab: "devices" }),
            label: t("hr.attendance.devices.kpi.offline"),
            value: data.kpis.offlineCount,
          },
          {
            helper: t("hr.attendance.devices.kpi.syncing.helper"),
            href: buildHref(query, { status: "syncing", tab: "devices" }),
            label: t("hr.attendance.devices.kpi.syncing"),
            value: data.kpis.syncingCount,
          },
          {
            helper: t("hr.attendance.devices.kpi.todayPunches.helper"),
            href: buildHref(query, { tab: "sync-history" }),
            label: t("hr.attendance.devices.kpi.todayPunches"),
            value: data.kpis.todayPunches,
          },
          {
            helper: t("hr.attendance.devices.kpi.pendingImports.helper"),
            href: buildHref(query, { tab: "sync-history" }),
            label: t("hr.attendance.devices.kpi.pendingImports"),
            value: data.kpis.pendingImports,
          },
          {
            helper: t("hr.attendance.devices.kpi.importErrors.helper"),
            href: buildHref(query, { tab: "sync-history" }),
            label: t("hr.attendance.devices.kpi.importErrors"),
            value: data.kpis.importErrors,
          },
          {
            helper: t("hr.attendance.devices.kpi.avgSync.helper"),
            href: buildHref(query, { tab: "sync-history" }),
            label: t("hr.attendance.devices.kpi.avgSync"),
            value: formatHrDurationSeconds(data.kpis.avgSyncDurationSeconds),
          },
          {
            helper: t("hr.attendance.devices.kpi.lastSync.helper"),
            href: buildHref(query, { tab: "sync-history" }),
            label: t("hr.attendance.devices.kpi.lastSync"),
            value: <HrRelativeTime value={data.kpis.lastSuccessfulSyncAt} />,
          },
        ]}
        title={t("hr.attendance.devices.title")}
        workspaceKey="attendance-devices"
        headerActions={
          <Link className={primaryButtonLinkClassName} href={buildHref(query, { create: "1" })}>
            {t("hr.attendance.devices.register")}
          </Link>
        }
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/attendance-devices" query={{ tab: activeTab }} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceSearchFilter defaultValue={query.search} placeholder={t("hr.attendance.devices.filter.search")} />
            <select className={nativeSelectClassName} defaultValue={query.deviceType ?? ""} name="deviceType">
              <option value="">{t("hr.attendance.devices.filter.allTypes")}</option>
              {data.deviceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.healthStatus ?? ""} name="healthStatus">
              <option value="">{t("hr.attendance.devices.filter.allHealth")}</option>
              {data.healthStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.status ?? ""} name="status">
              <option value="">{t("hr.attendance.devices.filter.allStatuses")}</option>
              {data.statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Input defaultValue={query.ipAddress ?? ""} name="ipAddress" placeholder={t("hr.attendance.devices.filter.ip")} />
          </HrWorkforceFilterBar>
        }
      >
        {activeTab === "analytics" ? <HrAttendanceDeviceAnalyticsPanel analytics={data.analytics} /> : null}

        {activeTab === "sync-history" ? (
          <HrAttendanceDeviceSyncHistory buildHref={(overrides) => buildHref(query, overrides)} history={data.history} />
        ) : null}

        {activeTab === "devices" ? (
          data.records.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-lg font-medium">{t("hr.attendance.devices.empty.title")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("hr.attendance.devices.empty.body")}</p>
              <Link className={`mt-4 ${primaryButtonLinkClassName}`} href={buildHref(query, { create: "1" })}>
                {t("hr.attendance.devices.register")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.records.map((device) => (
                <HrAttendanceDeviceCard
                  device={device}
                  key={device.id}
                  onEdit={(deviceId) => router.push(buildHref(query, { edit: deviceId }))}
                  onOpen={setDrawerDeviceId}
                  onSync={(deviceId) => router.push(buildHref(query, { sync: deviceId }))}
                />
              ))}
            </div>
          )
        ) : null}
      </HrWorkforceWorkspaceShell>

      {query.create === "1" ? <HrAttendanceDeviceFormDialog mode="create" query={query} /> : null}
      {query.edit && editDevice ? <HrAttendanceDeviceFormDialog device={editDevice} mode="edit" query={query} /> : null}
      {query.sync ? (
        <HrAttendanceDeviceSyncWizard
          deviceId={query.sync}
          deviceType={data.records.find((record) => record.id === query.sync)?.deviceType}
          query={query}
          sessionId={query.syncSession}
        />
      ) : null}

      <HrAttendanceDeviceDrawer
        autoSyncOptions={data.autoSyncOptions}
        buildHref={(overrides) => buildHref(query, overrides)}
        device={drawerDevice}
        history={data.history}
        onClose={() => setDrawerDeviceId(null)}
        onEdit={(deviceId) => {
          setDrawerDeviceId(null);
          router.push(buildHref(query, { edit: deviceId }));
        }}
        open={Boolean(drawerDevice)}
      />
    </PageContainer>
  );
}
