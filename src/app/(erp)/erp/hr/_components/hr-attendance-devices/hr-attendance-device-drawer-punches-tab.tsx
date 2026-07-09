"use client";

import { useMemo, useState } from "react";

import type { HrAttendanceDevicePunchRecord } from "@/features/hr/public-api";
import { DatePicker, EnterpriseDataTable, nativeSelectClassName, useTranslations } from "@/shared/ui";

import { TabLoadingState, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerPunchesTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (direction) query.set("direction", direction);
    if (dateFrom) query.set("dateFrom", dateFrom);
    const suffix = query.toString();
    return suffix ? `punches?${suffix}` : "punches";
  }, [dateFrom, direction, status]);

  const { data, error, loading } = useDeviceTabData<{ records: readonly HrAttendanceDevicePunchRecord[]; totalRows: number }>(
    deviceId,
    path,
    enabled,
  );

  if (loading || error) return <TabLoadingState error={error} loading={loading} />;
  const records = data?.records ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <select className={nativeSelectClassName} onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="">{t("hr.attendance.devices.filter.allStatuses")}</option>
          <option value="imported">Imported</option>
          <option value="duplicate">Duplicate</option>
          <option value="rejected">Rejected</option>
          <option value="warning">Warning</option>
        </select>
        <select className={nativeSelectClassName} onChange={(event) => setDirection(event.target.value)} value={direction}>
          <option value="">{t("hr.attendance.devices.drawer.filter.allDirections")}</option>
          <option value="in">IN</option>
          <option value="out">OUT</option>
        </select>
        <DatePicker
          clearable
          onValueChange={(value) => setDateFrom(value ?? "")}
          placeholder={t("hr.attendance.devices.drawer.fromDate")}
          value={dateFrom || undefined}
        />
      </div>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
          { header: t("hr.common.time"), key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
          { header: t("hr.common.direction"), key: "direction", render: (row) => row.direction.toUpperCase() },
          { header: t("hr.common.status"), key: "status", render: (row) => row.processingStatus },
          { header: t("hr.common.branch"), key: "branch", render: (row) => row.branchLabel ?? "—" },
        ]}
        emptyMessage={t("hr.attendance.devices.drawer.emptyPunches")}
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: data?.totalRows ?? records.length }}
        records={records}
      />
    </div>
  );
}
