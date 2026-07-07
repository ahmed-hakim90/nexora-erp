"use client";

import { useState } from "react";

import type { HrAttendanceDeviceUserRecord } from "@/features/hr/public-api";
import { platformFeedback } from "@/platform/feedback/public-api";
import { Button, EnterpriseDataTable } from "@/shared/ui";

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
      if (!response.ok) throw new Error("Could not download users.");
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
      platformFeedback.success("Users exported.");
    } catch (cause) {
      platformFeedback.error(cause instanceof Error ? cause.message : "Could not download users.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={downloading} onClick={() => void handleDownload()} size="sm" type="button" variant="secondary">
          {downloading ? "Downloading…" : "Download users"}
        </Button>
        <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
          {records.filter((row) => row.isUnmapped).length} unmapped
        </span>
        <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
          {records.filter((row) => row.isDuplicate).length} duplicates
        </span>
      </div>
      <EnterpriseDataTable
        columns={[
          { header: "Device code", key: "code", render: (row) => row.deviceCode },
          { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
          { header: "Status", key: "status", render: (row) => row.employeeStatus ?? "—" },
          {
            header: "Flags",
            key: "flags",
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {[row.isUnmapped && "unmapped", row.isDuplicate && "duplicate", row.isInactive && "inactive"].filter(Boolean).join(", ") || "—"}
              </span>
            ),
          },
        ]}
        emptyMessage="No mapped users for this device."
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: data?.totalRows ?? records.length }}
        records={records}
      />
    </div>
  );
}
