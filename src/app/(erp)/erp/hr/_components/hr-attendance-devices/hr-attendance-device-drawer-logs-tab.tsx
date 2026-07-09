"use client";

import { useMemo, useState } from "react";

import type { HrAttendanceDeviceAuditRecord } from "@/features/hr/public-api";
import { platformFeedback } from "@/platform/feedback/public-api";
import { Button, EnterpriseDataTable, useTranslations } from "@/shared/ui";

import { TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

type DeviceLogRecord = Readonly<{ createdAt: string; id: string; level: string; message: string; source: string }>;

export function HrAttendanceDeviceDrawerLogsTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const { data, error, loading } = useDeviceTabData<{ logs: readonly DeviceLogRecord[] }>(deviceId, "logs", enabled);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);

  const logs = useMemo(() => {
    const rows = data?.logs ?? [];
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) => row.message.toLowerCase().includes(term) || row.source.toLowerCase().includes(term));
  }, [data?.logs, search]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/hr/attendance-devices/${deviceId}/logs`);
      if (!response.ok) throw new Error(t("hr.attendance.devices.feedback.couldNotDownloadLogs"));
      const payload = (await response.json()) as { logs?: readonly DeviceLogRecord[] };
      const rows = payload.logs ?? data?.logs ?? [];
      const csv = [
        "Time,Level,Source,Message",
        ...rows.map((row) =>
          [row.createdAt, row.level, row.source, row.message]
            .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `device-logs-${deviceId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      platformFeedback.success(t("hr.attendance.devices.feedback.logsExported"));
    } catch (cause) {
      platformFeedback.error(cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.couldNotDownloadLogs"));
    } finally {
      setDownloading(false);
    }
  };

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-10 min-w-[16rem] rounded-md border bg-[hsl(var(--surface))] px-3 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("hr.attendance.devices.drawer.searchLogs")}
          value={search}
        />
        <Button disabled={downloading} onClick={() => void handleDownload()} size="sm" type="button" variant="secondary">
          {downloading ? t("hr.common.downloading") : t("hr.common.download")}
        </Button>
      </div>
      <div className="max-h-[28rem] space-y-2 overflow-y-auto">
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.noLogsFound")}</p> : null}
        {logs.map((log) => (
          <article className="rounded-xl border px-3 py-2 text-sm" key={log.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium capitalize">{log.source}</span>
              <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1">
              <span className="text-muted-foreground">[{log.level}]</span> {log.message}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function HrAttendanceDeviceDrawerAuditTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const { data, error, loading } = useDeviceTabData<{ audit: readonly HrAttendanceDeviceAuditRecord[] }>(
    deviceId,
    "audit",
    enabled,
  );

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;

  return (
    <EnterpriseDataTable
      columns={[
        { header: t("hr.common.action"), key: "action", render: (row) => row.action },
        { header: t("hr.common.actor"), key: "actor", render: (row) => row.actorLabel },
        { header: t("hr.common.when"), key: "when", render: (row) => new Date(row.createdAt).toLocaleString() },
      ]}
      emptyMessage={t("hr.attendance.devices.drawer.emptyLogs")}
      getRowId={(row) => row.id}
      pagination={{ mode: "page", page: 1, pageSize: data?.audit.length || 1, totalRows: data?.audit.length ?? 0 }}
      records={data?.audit ?? []}
    />
  );
}
