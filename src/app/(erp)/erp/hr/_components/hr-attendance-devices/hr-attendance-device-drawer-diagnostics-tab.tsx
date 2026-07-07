"use client";

import { HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS } from "@/features/hr/public-api";
import type { HrAttendanceDeviceDiagnosticRecord } from "@/features/hr/public-api";
import { healthDimensionTone } from "@/features/hr/public-api";
import { runHrAttendanceDeviceDiagnosticAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EnterpriseDataTable } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import { TabLoadingState, DeviceActionForm, useDeviceTabData } from "./hr-attendance-device-drawer-shared";

const DIAGNOSTIC_LABELS: Record<string, string> = {
  clear_queue: "Clear queue",
  ping: "Ping",
  read_battery: "Battery",
  read_clock_drift: "Clock drift",
  read_cpu: "CPU",
  read_device_time: "Device time",
  read_door_status: "Door status",
  read_firmware: "Firmware",
  read_memory: "Memory",
  read_punch_count: "Punches",
  read_relay: "Relay",
  read_sdk: "SDK",
  read_storage: "Storage",
  read_tamper: "Tamper",
  read_temperature: "Temperature",
  read_user_count: "Users",
  restart_connection: "Restart connection",
  test_connection: "Test connection",
};

export function HrAttendanceDeviceDrawerDiagnosticsTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
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
            <p className="text-sm font-medium">{DIAGNOSTIC_LABELS[action] ?? action}</p>
            <Button className="mt-3" size="sm" type="submit" variant="secondary">
              Run
            </Button>
          </DeviceActionForm>
        ))}
      </section>

      {loading || error ? <TabLoadingState error={error} loading={loading} /> : null}
      <EnterpriseDataTable
        columns={[
          { header: "Action", key: "action", render: (row) => DIAGNOSTIC_LABELS[row.action] ?? row.action },
          { header: "Result", key: "message", render: (row) => row.message },
          {
            header: "Status",
            key: "status",
            render: (row) => (
              <span className={cn("capitalize", healthDimensionTone(row.resultStatus))}>{row.resultStatus}</span>
            ),
          },
          { header: "When", key: "when", render: (row) => new Date(row.createdAt).toLocaleString() },
        ]}
        emptyMessage="No diagnostic history yet."
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
