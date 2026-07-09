"use client";

import { useState } from "react";

import type { HrAttendanceDeviceUserRecord } from "@/features/hr/public-api";
import { platformFeedback } from "@/platform/feedback/public-api";
import { Button, EnterpriseDataTable, useTranslations } from "@/shared/ui";

import { TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

export function HrAttendanceDeviceDrawerUsersTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const { data, error, loading } = useDeviceTabData<{ records: readonly HrAttendanceDeviceUserRecord[]; totalRows: number }>(
    deviceId,
    "users",
    enabled,
  );
  const [downloading, setDownloading] = useState(false);

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;
  const records = data?.records ?? [];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/hr/attendance-devices/${deviceId}/users`);
      if (!response.ok) throw new Error(t("hr.attendance.devices.feedback.couldNotDownloadUsers"));
      const payload = (await response.json()) as { records?: readonly HrAttendanceDeviceUserRecord[] };
      const rows = payload.records ?? records;
      const csv = [
        "Device code,Employee,Status,Flags",
        ...rows.map((row) =>
          [
            escapeCsvValue(row.deviceCode),
            escapeCsvValue(row.employeeLabel),
            escapeCsvValue(row.employeeStatus ?? ""),
            escapeCsvValue(
              [row.isUnmapped && "unmapped", row.isDuplicate && "duplicate", row.isInactive && "inactive"]
                .filter(Boolean)
                .join("; "),
            ),
          ].join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `device-users-${deviceId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      platformFeedback.success(t("hr.attendance.devices.feedback.usersExported"));
    } catch (cause) {
      platformFeedback.error(cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.couldNotDownloadUsers"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={downloading} onClick={() => void handleDownload()} size="sm" type="button" variant="secondary">
          {downloading ? t("hr.common.downloading") : t("hr.attendance.devices.drawer.downloadUsers")}
        </Button>
        <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
          {t("hr.attendance.devices.drawer.unmappedCount", { count: records.filter((row) => row.isUnmapped).length })}
        </span>
        <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
          {t("hr.attendance.devices.drawer.duplicatesCount", { count: records.filter((row) => row.isDuplicate).length })}
        </span>
      </div>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.attendance.devices.form.deviceCode"), key: "code", render: (row) => row.deviceCode },
          { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
          { header: t("hr.common.status"), key: "status", render: (row) => row.employeeStatus ?? "—" },
          {
            header: t("hr.common.flags"),
            key: "flags",
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {[row.isUnmapped && "unmapped", row.isDuplicate && "duplicate", row.isInactive && "inactive"].filter(Boolean).join(", ") || "—"}
              </span>
            ),
          },
        ]}
        emptyMessage={t("hr.attendance.devices.drawer.emptyUsers")}
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: data?.totalRows ?? records.length }}
        records={records}
      />
    </div>
  );
}
