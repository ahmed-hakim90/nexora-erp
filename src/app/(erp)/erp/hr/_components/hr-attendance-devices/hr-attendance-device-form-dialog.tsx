"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  HR_ATTENDANCE_DEVICE_DEFAULT_PORTS,
  HR_ATTENDANCE_DEVICE_TCP_TYPES,
} from "@/features/hr/application/schemas/hr-attendance-device.schema";
import {
  createHrAttendanceDeviceAction,
  updateHrAttendanceDeviceAction,
} from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  Input,
  RecordFormDialog,
  RecordFormSection,
  buildModalCloseHref,
  nativeSelectClassName,
  useRecordFormModal,
} from "@/shared/ui";

type DeviceFormRecord = Readonly<{
  autoSyncInterval: string;
  code: string;
  deviceType: string;
  firmwareVersion: string;
  id?: string;
  ipAddress: string;
  name: string;
  port: string;
  serialNumber: string;
  timezone: string;
}>;

const TCP_DEVICE_TYPES = new Set<string>(HR_ATTENDANCE_DEVICE_TCP_TYPES);

const ATTENDANCE_DEVICES_PATH = "/erp/hr/attendance-devices";

export function HrAttendanceDeviceFormDialog({
  device,
  mode,
  query,
}: Readonly<{
  device?: DeviceFormRecord;
  mode: "create" | "edit";
  query: Record<string, string | undefined>;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deviceType, setDeviceType] = useState(device?.deviceType ?? "api_import");
  const [port, setPort] = useState(device?.port ?? "");
  const closeHref = buildModalCloseHref(ATTENDANCE_DEVICES_PATH, query);
  const { closeModal, formId, handleOpenChange, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });
  const action = mode === "create" ? createHrAttendanceDeviceAction : updateHrAttendanceDeviceAction;
  const showSecuritySection = TCP_DEVICE_TYPES.has(deviceType);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const deviceName = String(formData.get("name") ?? "").trim();
    const deviceCode = String(formData.get("code") ?? "").trim();

    startTransition(async () => {
      try {
        await action(formData);
        platformFeedback.success(
          mode === "create" ? "Device registered" : "Device updated",
          {
            description:
              deviceName.length > 0
                ? `${deviceName}${deviceCode ? ` (${deviceCode})` : ""} saved successfully.`
                : "Attendance device configuration saved.",
            entity: device?.id
              ? { id: device.id, label: deviceName || deviceCode || "Attendance device", type: "hr_attendance_device" }
              : undefined,
            source: "runtime",
          },
        );
        closeModal();
        router.refresh();
      } catch (cause) {
        platformFeedback.error(mode === "create" ? "Could not register device" : "Could not update device", {
          description: cause instanceof Error ? cause.message : "Please review the form and try again.",
          source: "runtime",
        });
      }
    });
  }

  function handleDeviceTypeChange(nextType: string) {
    setDeviceType(nextType);
    const defaultPort = HR_ATTENDANCE_DEVICE_DEFAULT_PORTS[nextType];
    if (defaultPort && !port) {
      setPort(String(defaultPort));
    }
  }

  return (
    <RecordFormDialog
      actions={
        <Button disabled={isPending} form={formId} type="submit" variant="primary">
          {isPending ? (mode === "create" ? "Adding device…" : "Saving…") : mode === "create" ? "Add device" : "Save changes"}
        </Button>
      }
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={mode === "create" ? "Register a biometric or API attendance device." : "Update device configuration."}
      title={mode === "create" ? "Register device" : "Edit device"}
    >
      <form className="space-y-4" id={formId} onInput={markDirty} onSubmit={handleSubmit}>
        {device?.id ? <input name="id" type="hidden" value={device.id} /> : null}
        <fieldset className="contents" disabled={isPending}>
        <RecordFormSection>
          <p className="mb-3 text-sm font-medium">Identity</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input defaultValue={device?.code ?? ""} name="code" placeholder="Device code" required />
            <Input defaultValue={device?.name ?? ""} name="name" placeholder="Device name" required />
            <select
              className={nativeSelectClassName}
              name="deviceType"
              onChange={(event) => handleDeviceTypeChange(event.target.value)}
              value={deviceType}
            >
              <option value="zkteco">ZKTeco</option>
              <option value="suprema">Suprema</option>
              <option value="anviz">Anviz</option>
              <option value="fingertec">Fingertec</option>
              <option value="cloud_attendance">Cloud attendance</option>
              <option value="api_import">API import</option>
              <option value="excel_import">Excel import</option>
            </select>
            <Input defaultValue={device?.serialNumber ?? ""} name="serialNumber" placeholder="Serial number" />
          </div>
        </RecordFormSection>
        <RecordFormSection>
          <p className="mb-3 text-sm font-medium">Network</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input defaultValue={device?.ipAddress ?? ""} name="ipAddress" placeholder="IP address" />
            <Input
              name="port"
              onChange={(event) => setPort(event.target.value)}
              placeholder="Port"
              type="number"
              value={port}
            />
            <Input defaultValue={device?.timezone ?? "UTC"} name="timezone" placeholder="Timezone" />
            <Input defaultValue={device?.firmwareVersion ?? ""} name="firmwareVersion" placeholder="Firmware version" />
          </div>
        </RecordFormSection>
        {showSecuritySection ? (
          <RecordFormSection>
            <p className="mb-3 text-sm font-medium">Security</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                autoComplete="new-password"
                name="commKey"
                placeholder={mode === "edit" ? "Enter a new comm key (optional)" : "Device comm key (optional)"}
                type="password"
              />
            </div>
            {mode === "edit" ? (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  className="size-4 rounded border border-border bg-[hsl(var(--surface))] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  name="clearCommKey"
                  type="checkbox"
                  value="true"
                />
                Clear saved communication key
              </label>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Stored securely on the server. Existing comm keys are never shown when editing. Leave the field blank to
              keep the current key, or check the box above to remove it.
            </p>
          </RecordFormSection>
        ) : null}
        <RecordFormSection>
          <p className="mb-3 text-sm font-medium">Automation</p>
          <select className={nativeSelectClassName} defaultValue={device?.autoSyncInterval ?? "disabled"} name="autoSyncInterval">
            <option value="disabled">Disabled</option>
            <option value="5min">Every 5 minutes</option>
            <option value="15min">Every 15 minutes</option>
            <option value="30min">Every 30 minutes</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </RecordFormSection>
        </fieldset>
      </form>
    </RecordFormDialog>
  );
}
