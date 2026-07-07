import { isHrDeviceDriverSimulationEnabled } from "./driver-simulation";
import { FileImportAttendanceDeviceDriver } from "./file-import-driver";
import { ProtocolAttendanceDeviceDriver } from "./protocol-driver";
import type { HrAttendanceDeviceDriver, HrDeviceDriverDescriptor, HrDeviceDriverKey } from "./types";
import { ZktecoAttendanceDeviceDriver } from "./zkteco-driver";

const DRIVER_DESCRIPTORS: readonly HrDeviceDriverDescriptor[] = [
  {
    capabilities: ["biometric", "card", "tcp", "users", "punches", "time_sync"],
    key: "zkteco",
    label: "ZKTeco",
    protocolFamily: "tcp",
    supportedDeviceTypes: ["zkteco"],
  },
  {
    capabilities: ["biometric", "face", "tcp", "users", "punches"],
    key: "suprema",
    label: "Suprema",
    protocolFamily: "tcp",
    supportedDeviceTypes: ["suprema"],
  },
  {
    capabilities: ["face", "card", "rest", "users", "punches"],
    key: "hikvision",
    label: "Hikvision",
    protocolFamily: "rest",
    supportedDeviceTypes: ["hikvision", "cloud_attendance"],
  },
  {
    capabilities: ["biometric", "tcp", "users", "punches"],
    key: "anviz",
    label: "Anviz",
    protocolFamily: "tcp",
    supportedDeviceTypes: ["anviz"],
  },
  {
    capabilities: ["tcp", "users", "punches", "raw_protocol"],
    key: "generic_tcp",
    label: "Generic TCP",
    protocolFamily: "tcp",
    supportedDeviceTypes: [],
  },
  {
    capabilities: ["rest", "users", "punches", "webhook"],
    key: "generic_rest",
    label: "Generic REST",
    protocolFamily: "rest",
    supportedDeviceTypes: ["api_import", "cloud_attendance"],
  },
  {
    capabilities: ["sdk", "biometric", "face", "users", "punches"],
    key: "sdk",
    label: "SDK Driver",
    protocolFamily: "sdk",
    supportedDeviceTypes: ["fingertec"],
  },
  {
    capabilities: ["file", "import", "punches"],
    key: "file_import",
    label: "File Import",
    protocolFamily: "file",
    supportedDeviceTypes: ["excel_import"],
  },
] as const;

const DEVICE_TYPE_TO_DRIVER: Record<string, HrDeviceDriverKey> = {
  anviz: "anviz",
  api_import: "generic_rest",
  cloud_attendance: "generic_rest",
  excel_import: "file_import",
  fingertec: "sdk",
  hikvision: "hikvision",
  suprema: "suprema",
  zkteco: "zkteco",
};

function createDriverInstance(key: HrDeviceDriverKey): HrAttendanceDeviceDriver {
  switch (key) {
    case "zkteco":
      return isHrDeviceDriverSimulationEnabled()
        ? new ProtocolAttendanceDeviceDriver({ defaultPort: 4370, key: "zkteco", label: "ZKTeco", modelPrefix: "ZK", protocolFamily: "tcp" })
        : new ZktecoAttendanceDeviceDriver();
    case "suprema":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 1470, key: "suprema", label: "Suprema", modelPrefix: "SP", protocolFamily: "tcp" });
    case "hikvision":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 80, key: "hikvision", label: "Hikvision", modelPrefix: "HK", protocolFamily: "rest" });
    case "anviz":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 5010, key: "anviz", label: "Anviz", modelPrefix: "AV", protocolFamily: "tcp" });
    case "generic_tcp":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 4370, key: "generic_tcp", label: "Generic TCP", modelPrefix: "TCP", protocolFamily: "tcp" });
    case "generic_rest":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 443, key: "generic_rest", label: "Generic REST", modelPrefix: "REST", protocolFamily: "rest" });
    case "sdk":
      return new ProtocolAttendanceDeviceDriver({ defaultPort: 0, key: "sdk", label: "SDK Driver", modelPrefix: "SDK", protocolFamily: "sdk" });
    case "file_import":
      return new FileImportAttendanceDeviceDriver();
  }
}

export function resolveDriverKey(deviceType: string, overrideKey?: string | null): HrDeviceDriverKey {
  if (overrideKey && isValidDriverKey(overrideKey)) return overrideKey;
  return DEVICE_TYPE_TO_DRIVER[deviceType] ?? "generic_rest";
}

export function isValidDriverKey(value: string): value is HrDeviceDriverKey {
  return DRIVER_DESCRIPTORS.some((descriptor) => descriptor.key === value);
}

export function listDeviceDriverDescriptors(): readonly HrDeviceDriverDescriptor[] {
  return DRIVER_DESCRIPTORS;
}

export function getDeviceDriverDescriptor(key: HrDeviceDriverKey): HrDeviceDriverDescriptor | undefined {
  return DRIVER_DESCRIPTORS.find((descriptor) => descriptor.key === key);
}

export function createAttendanceDeviceDriver(key: HrDeviceDriverKey): HrAttendanceDeviceDriver {
  return createDriverInstance(key);
}

export function createAttendanceDeviceDriverForDevice(input: Readonly<{
  deviceType: string;
  driverKey?: string | null;
}>): HrAttendanceDeviceDriver {
  const key = resolveDriverKey(input.deviceType, input.driverKey);
  return createDriverInstance(key);
}
