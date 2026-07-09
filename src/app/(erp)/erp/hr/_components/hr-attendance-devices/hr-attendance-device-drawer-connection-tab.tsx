"use client";

import type { HrAttendanceDeviceConnectionSnapshot } from "@/features/hr/public-api";
import { runHrAttendanceDeviceConnectionAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, useTranslations } from "@/shared/ui";

import { DetailItem, DeviceActionForm, TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerConnectionTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const connectionActions = [
    { action: "ping", label: t("hr.attendance.devices.connection.ping") },
    { action: "reconnect", label: t("hr.attendance.devices.connection.reconnect") },
    { action: "resolve_dns", label: t("hr.attendance.devices.connection.resolveDns") },
  ] as const;
  const { data, error, loading, refetch } = useDeviceTabData<{ connection: HrAttendanceDeviceConnectionSnapshot }>(
    deviceId,
    "connection",
    enabled,
  );

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;
  const connection = data?.connection;
  if (!connection) return <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.noConnectionData")}</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.tab.connection")}</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <DetailItem label={t("hr.attendance.devices.connection.ip")} value={connection.ipAddress ?? "—"} />
          <DetailItem label={t("hr.attendance.devices.connection.hostname")} value={connection.hostname ?? "—"} />
          <DetailItem label={t("hr.attendance.devices.form.port")} value={connection.port ? String(connection.port) : "—"} />
          <DetailItem label={t("hr.attendance.devices.connection.protocol")} value={connection.protocol} />
          <DetailItem label={t("hr.attendance.devices.connection.mac")} value={connection.macAddress ?? "—"} />
          <DetailItem
            label={t("hr.attendance.devices.connection.packetLoss")}
            value={connection.packetLossPct !== null ? `${connection.packetLossPct}%` : "—"}
          />
        </dl>
      </section>

      <section className="flex flex-wrap gap-2">
        {connectionActions.map((item) => (
          <DeviceActionForm
            action={runHrAttendanceDeviceConnectionAction}
            hiddenFields={{ connectionAction: item.action, deviceId }}
            key={item.action}
            onCompleted={refetch}
          >
            <Button size="sm" type="submit" variant="secondary">
              {item.label}
            </Button>
          </DeviceActionForm>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.latencyHistory")}</h3>
        {connection.latencyHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.noLatencySamples")}</p>
        ) : (
          <div className="space-y-2">
            {connection.latencyHistory.slice(-8).map((point) => (
              <div className="flex items-center gap-3 text-sm" key={point.at}>
                <span className="w-28 shrink-0 text-muted-foreground">{new Date(point.at).toLocaleTimeString()}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--accent))]"
                    style={{ width: `${Math.min(100, Math.round((point.latencyMs / 500) * 100))}%` }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums">{point.latencyMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">{t("hr.attendance.devices.drawer.heartbeatHistory")}</h3>
        {connection.heartbeatHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.noHeartbeatHistory")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {connection.heartbeatHistory.slice(-8).map((point) => (
              <li className="flex items-center justify-between rounded-md border px-3 py-2" key={point.at}>
                <span>{new Date(point.at).toLocaleString()}</span>
                <span className="capitalize text-muted-foreground">{point.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
