"use client";

import type { HrAttendanceDeviceListRecord } from "@/features/hr/public-api";
import { updateHrAttendanceDeviceAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, Input, nativeSelectClassName } from "@/shared/ui";

import { DeviceActionForm } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerSettingsTab({
  autoSyncOptions,
  device,
  onEdit,
}: Readonly<{
  autoSyncOptions: readonly string[];
  device: HrAttendanceDeviceListRecord;
  onEdit: (deviceId: string) => void;
}>) {
  return (
    <div className="space-y-6">
      <DeviceActionForm action={updateHrAttendanceDeviceAction} className="grid gap-4 md:grid-cols-2" hiddenFields={{ id: device.id }}>
        <label className="space-y-1 text-sm">
          <span>Name</span>
          <Input defaultValue={device.name} name="name" required />
        </label>
        <label className="space-y-1 text-sm">
          <span>IP address</span>
          <Input defaultValue={device.ipAddress ?? ""} name="ipAddress" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Port</span>
          <Input defaultValue={device.port ? String(device.port) : ""} name="port" type="number" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Timezone</span>
          <Input defaultValue={device.timezone} name="timezone" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Firmware</span>
          <Input defaultValue={device.firmware ?? ""} name="firmwareVersion" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Serial number</span>
          <Input defaultValue={device.serialNumber ?? ""} name="serialNumber" />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>Auto sync interval</span>
          <select className={nativeSelectClassName} defaultValue={device.autoSyncInterval} name="autoSyncInterval">
            {autoSyncOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" variant="primary">Save settings</Button>
          <Button onClick={() => onEdit(device.id)} type="button" variant="secondary">
            Open full editor
          </Button>
        </div>
      </DeviceActionForm>
    </div>
  );
}
