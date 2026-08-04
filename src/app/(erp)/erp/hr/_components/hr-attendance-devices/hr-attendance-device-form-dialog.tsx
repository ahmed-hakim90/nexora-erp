"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  HR_ATTENDANCE_DEVICE_DEFAULT_PORTS,
  isHrAttendanceFileImportDeviceType,
  isHrAttendanceRestDeviceType,
  isHrAttendanceTcpDeviceType,
} from "@/features/hr/public-api";
import {
  createHrAttendanceDeviceAction,
  updateHrAttendanceDeviceAction,
} from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  FieldGroup,
  Input,
  RecordFormDialog,
  RecordFormSection,
  buildModalCloseHref,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  useRecordFormModal,
  useTranslations,
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

const ATTENDANCE_DEVICE_TYPE_OPTIONS = [
  "zkteco",
  "suprema",
  "anviz",
  "fingertec",
  "cloud_attendance",
  "api_import",
  "excel_import",
] as const;

const ATTENDANCE_DEVICES_PATH = "/erp/hr/attendance-devices";

function resolveDeviceTypeLabel(
  deviceType: (typeof ATTENDANCE_DEVICE_TYPE_OPTIONS)[number],
  t: ReturnType<typeof useTranslations>,
): string {
  switch (deviceType) {
    case "zkteco":
      return t("hr.attendance.devices.form.deviceType.zkteco");
    case "suprema":
      return t("hr.attendance.devices.form.deviceType.suprema");
    case "anviz":
      return t("hr.attendance.devices.form.deviceType.anviz");
    case "fingertec":
      return t("hr.attendance.devices.form.deviceType.fingertec");
    case "cloud_attendance":
      return t("hr.attendance.devices.form.deviceType.cloudAttendance");
    case "api_import":
      return t("hr.attendance.devices.form.deviceType.apiImport");
    case "excel_import":
      return t("hr.attendance.devices.form.deviceType.excelImport");
    default:
      return deviceType;
  }
}

export function HrAttendanceDeviceFormDialog({
  device,
  mode,
  query,
}: Readonly<{
  device?: DeviceFormRecord;
  mode: "create" | "edit";
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deviceType, setDeviceType] = useState(device?.deviceType ?? "api_import");
  const [port, setPort] = useState(device?.port ?? "");
  const closeHref = buildModalCloseHref(ATTENDANCE_DEVICES_PATH, query);
  const { closeModal, formId, handleOpenChange, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });
  const action = mode === "create" ? createHrAttendanceDeviceAction : updateHrAttendanceDeviceAction;
  const isFileImportDevice = isHrAttendanceFileImportDeviceType(deviceType);
  const isTcpDevice = isHrAttendanceTcpDeviceType(deviceType);
  const isRestDevice = isHrAttendanceRestDeviceType(deviceType);
  const showNetworkSection = isTcpDevice || isRestDevice;
  const showSecuritySection = isTcpDevice;
  const showAutomationSection = !isFileImportDevice;
  const dialogTitle =
    mode === "create"
      ? isFileImportDevice
        ? t("hr.attendance.devices.form.createTitle.fileImport")
        : t("hr.attendance.devices.form.createTitle")
      : t("hr.attendance.devices.form.editTitle");
  const dialogSubtitle =
    mode === "create"
      ? isFileImportDevice
        ? t("hr.attendance.devices.form.createSubtitle.fileImport")
        : t("hr.attendance.devices.form.createSubtitle")
      : isFileImportDevice
        ? t("hr.attendance.devices.form.editSubtitle.fileImport")
        : t("hr.attendance.devices.form.editSubtitle");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const deviceName = String(formData.get("name") ?? "").trim();
    const deviceCode = String(formData.get("code") ?? "").trim();

    startTransition(async () => {
      try {
        await action(formData);
        platformFeedback.success(
          mode === "create" ? t("hr.attendance.devices.feedback.deviceRegistered") : t("hr.attendance.devices.feedback.deviceUpdated"),
          {
            description:
              deviceName.length > 0
                ? t("hr.attendance.devices.feedback.deviceSavedDescription", {
                    label: `${deviceName}${deviceCode ? ` (${deviceCode})` : ""}`,
                  })
                : t("hr.attendance.devices.feedback.configSaved"),
            entity: device?.id
              ? {
                  id: device.id,
                  label: deviceName || deviceCode || t("hr.attendance.devices.feedback.attendanceDevice"),
                  type: "hr_attendance_device",
                }
              : undefined,
            source: "runtime",
          },
        );
        closeModal();
        router.refresh();
      } catch (cause) {
        platformFeedback.error(
          mode === "create" ? t("hr.attendance.devices.feedback.couldNotRegister") : t("hr.attendance.devices.feedback.couldNotUpdate"),
          {
            description: cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.reviewForm"),
            source: "runtime",
          },
        );
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
          {isPending
            ? mode === "create"
              ? t("hr.attendance.devices.form.adding")
              : t("hr.attendance.devices.form.saving")
            : mode === "create"
              ? t("hr.attendance.devices.form.addDevice")
              : t("hr.attendance.devices.form.saveChanges")}
        </Button>
      }
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={dialogSubtitle}
      title={dialogTitle}
    >
      <form className="space-y-4" id={formId} onInput={markDirty} onSubmit={handleSubmit}>
        {device?.id ? <input name="id" type="hidden" value={device.id} /> : null}
        {isFileImportDevice ? <input name="autoSyncInterval" type="hidden" value="disabled" /> : null}
        <fieldset className="contents" disabled={isPending}>
          <RecordFormSection>
            <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.identity")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup isRequired label={t("hr.attendance.devices.form.deviceCode")}>
                <Input defaultValue={device?.code ?? ""} name="code" placeholder="e.g. GATE-01" required />
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.attendance.devices.form.deviceName")}>
                <Input defaultValue={device?.name ?? ""} name="name" placeholder="e.g. Main gate" required />
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.attendance.devices.form.deviceType")}>
                <select
                  className={nativeSelectClassName}
                  name="deviceType"
                  onChange={(event) => handleDeviceTypeChange(event.target.value)}
                  value={deviceType}
                >
                  {ATTENDANCE_DEVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {resolveDeviceTypeLabel(option, t)}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              {!isFileImportDevice ? (
                <FieldGroup label={t("hr.attendance.devices.form.serialNumber")}>
                  <Input defaultValue={device?.serialNumber ?? ""} name="serialNumber" placeholder="e.g. SN-12345" />
                </FieldGroup>
              ) : null}
            </div>
          </RecordFormSection>

          {isFileImportDevice ? (
            <RecordFormSection>
              <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.importSource")}</p>
              <div className="space-y-3 rounded-xl border border-border bg-[hsl(var(--surface))] p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("hr.attendance.devices.form.fileImport.helpTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.form.fileImport.helpBody")}</p>
                </div>
                <Link className={secondaryButtonLinkClassName} href="/api/hr/attendance-devices/import-template">
                  {t("hr.attendance.devices.form.fileImport.downloadTemplate")}
                </Link>
              </div>
            </RecordFormSection>
          ) : null}

          {showNetworkSection ? (
            <RecordFormSection>
              <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.network")}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup label={t("hr.attendance.devices.form.ipAddress")}>
                  <Input
                    defaultValue={device?.ipAddress ?? ""}
                    name="ipAddress"
                    placeholder={isRestDevice ? "https://api.example.com" : "192.168.1.50"}
                  />
                </FieldGroup>
                {isTcpDevice ? (
                  <FieldGroup label={t("hr.attendance.devices.form.port")}>
                    <Input
                      name="port"
                      onChange={(event) => setPort(event.target.value)}
                      placeholder="4370"
                      type="number"
                      value={port}
                    />
                  </FieldGroup>
                ) : null}
                <FieldGroup label={t("hr.attendance.devices.form.timezone")}>
                  <Input defaultValue={device?.timezone ?? "UTC"} name="timezone" placeholder="UTC" />
                </FieldGroup>
                {isTcpDevice ? (
                  <FieldGroup label={t("hr.attendance.devices.form.firmware")}>
                    <Input defaultValue={device?.firmwareVersion ?? ""} name="firmwareVersion" placeholder="e.g. 6.60" />
                  </FieldGroup>
                ) : null}
              </div>
            </RecordFormSection>
          ) : null}

          {isFileImportDevice ? (
            <RecordFormSection>
              <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.preferences")}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup label={t("hr.attendance.devices.form.timezone")}>
                  <Input defaultValue={device?.timezone ?? "UTC"} name="timezone" placeholder="UTC" />
                </FieldGroup>
              </div>
            </RecordFormSection>
          ) : null}

          {showSecuritySection ? (
            <RecordFormSection>
              <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.security")}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup label={t("hr.attendance.devices.form.commKeyCreatePlaceholder")}>
                  <Input
                    autoComplete="new-password"
                    name="commKey"
                    placeholder={
                      mode === "edit"
                        ? t("hr.attendance.devices.form.commKeyEditPlaceholder")
                        : t("hr.attendance.devices.form.commKeyCreatePlaceholder")
                    }
                    type="password"
                  />
                </FieldGroup>
              </div>
              {mode === "edit" ? (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    className="size-4 rounded border border-border bg-[hsl(var(--surface))] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    name="clearCommKey"
                    type="checkbox"
                    value="true"
                  />
                  {t("hr.attendance.devices.form.clearCommKey")}
                </label>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">{t("hr.attendance.devices.form.commKeyHint")}</p>
            </RecordFormSection>
          ) : null}

          {showAutomationSection ? (
            <RecordFormSection>
              <p className="mb-3 text-sm font-medium">{t("hr.attendance.devices.form.section.automation")}</p>
              <FieldGroup label={t("hr.attendance.devices.form.section.automation")}>
                <select className={nativeSelectClassName} defaultValue={device?.autoSyncInterval ?? "disabled"} name="autoSyncInterval">
                  <option value="disabled">{t("hr.attendance.devices.form.freq.disabled")}</option>
                  <option value="5min">{t("hr.attendance.devices.form.freq.5min")}</option>
                  <option value="15min">{t("hr.attendance.devices.form.freq.15min")}</option>
                  <option value="30min">{t("hr.attendance.devices.form.freq.30min")}</option>
                  <option value="hourly">{t("hr.attendance.devices.form.freq.hourly")}</option>
                  <option value="daily">{t("hr.attendance.devices.form.freq.daily")}</option>
                  <option value="weekly">{t("hr.attendance.devices.form.freq.weekly")}</option>
                </select>
              </FieldGroup>
            </RecordFormSection>
          ) : null}
        </fieldset>
      </form>
    </RecordFormDialog>
  );
}
