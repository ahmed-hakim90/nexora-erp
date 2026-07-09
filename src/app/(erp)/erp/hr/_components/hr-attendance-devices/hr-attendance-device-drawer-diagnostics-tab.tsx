"use client";

import { HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS } from "@/features/hr/public-api";
import type { HrAttendanceDeviceDiagnosticRecord } from "@/features/hr/public-api";
import { healthDimensionTone } from "@/features/hr/public-api";
import { runHrAttendanceDeviceDiagnosticAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EnterpriseDataTable, useTranslations } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import { TabLoadingState, DeviceActionForm, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

function useDiagnosticLabels() {
  const t = useTranslations();
  return {
    clear_queue: t("hr.attendance.devices.diagnostic.clearQueue"),
    ping: t("hr.attendance.devices.diagnostic.ping"),
    read_battery: t("hr.attendance.devices.diagnostic.readBattery"),
    read_clock_drift: t("hr.attendance.devices.diagnostic.readClockDrift"),
    read_cpu: t("hr.attendance.devices.diagnostic.readCpu"),
    read_device_time: t("hr.attendance.devices.diagnostic.readDeviceTime"),
    read_door_status: t("hr.attendance.devices.diagnostic.readDoorStatus"),
    read_firmware: t("hr.attendance.devices.diagnostic.readFirmware"),
    read_memory: t("hr.attendance.devices.diagnostic.readMemory"),
    read_punch_count: t("hr.attendance.devices.diagnostic.readPunchCount"),
    read_relay: t("hr.attendance.devices.diagnostic.readRelay"),
    read_sdk: t("hr.attendance.devices.diagnostic.readSdk"),
    read_storage: t("hr.attendance.devices.diagnostic.readStorage"),
    read_tamper: t("hr.attendance.devices.diagnostic.readTamper"),
    read_temperature: t("hr.attendance.devices.diagnostic.readTemperature"),
    read_user_count: t("hr.attendance.devices.diagnostic.readUserCount"),
    restart_connection: t("hr.attendance.devices.diagnostic.restartConnection"),
    test_connection: t("hr.attendance.devices.diagnostic.testConnection"),
  } as const;
}

export function HrAttendanceDeviceDrawerDiagnosticsTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
  const diagnosticLabels = useDiagnosticLabels();
  const { data, error, loading, refetch } = useDeviceTabData<{ diagnostics: readonly HrAttendanceDeviceDiagnosticRecord[] }>(
    deviceId,
    "logs?kind=diagnostics",
    enabled,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS.map((action) => (
          <DeviceActionForm
            action={runHrAttendanceDeviceDiagnosticAction}
            className="rounded-xl border p-3"
            hiddenFields={{ deviceId, diagnosticAction: action }}
            key={action}
            onCompleted={refetch}
          >
            <p className="text-sm font-medium">{diagnosticLabels[action as keyof typeof diagnosticLabels] ?? action}</p>
            <Button className="mt-3" size="sm" type="submit" variant="secondary">
              {t("hr.common.run")}
            </Button>
          </DeviceActionForm>
        ))}
      </section>

      {loading || error ? <TabLoadingState error={error} loading={loading} /> : null}
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.action"), key: "action", render: (row) => diagnosticLabels[row.action as keyof typeof diagnosticLabels] ?? row.action },
          { header: t("hr.common.result"), key: "message", render: (row) => row.message },
          {
            header: t("hr.common.status"),
            key: "status",
            render: (row) => (
              <span className={cn("capitalize", healthDimensionTone(row.resultStatus))}>{row.resultStatus}</span>
            ),
          },
          { header: t("hr.common.when"), key: "when", render: (row) => new Date(row.createdAt).toLocaleString() },
        ]}
        emptyMessage={t("hr.attendance.devices.drawer.emptyDiagnostics")}
        getRowId={(row) => row.id}
        pagination={{
          mode: "page",
          page: 1,
          pageSize: data?.diagnostics.length || 1,
          totalRows: data?.diagnostics.length ?? 0,
        }}
        records={data?.diagnostics ?? []}
      />
    </div>
  );
}
