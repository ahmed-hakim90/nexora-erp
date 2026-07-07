import "server-only";

import { resolveDriverKey } from "../device-drivers/registry";
import type { HrDeviceConnectionConfig } from "../device-drivers/types";
import { readDeviceCredentials, readDeviceMetadata } from "./hr-attendance-device-credentials";

export function buildHrDeviceConnectionConfig(device: Readonly<Record<string, unknown>>): HrDeviceConnectionConfig {
  const metadata = readDeviceMetadata(device.metadata);
  const driverKey = resolveDriverKey(String(device.device_type), device.driver_key ? String(device.driver_key) : null);

  return {
    credentials: readDeviceCredentials(metadata),
    deviceId: String(device.id),
    deviceType: String(device.device_type),
    driverKey,
    firmwareVersion: device.firmware_version ? String(device.firmware_version) : null,
    ipAddress: device.ip_address ? String(device.ip_address) : null,
    metadata,
    port: device.port !== null && device.port !== undefined ? Number(device.port) : null,
    serialNumber: device.serial_number ? String(device.serial_number) : null,
    timezone: String(device.timezone ?? "UTC"),
  };
}
