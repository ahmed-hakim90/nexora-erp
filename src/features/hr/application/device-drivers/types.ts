export type HrDeviceDriverKey =
  | "zkteco"
  | "suprema"
  | "hikvision"
  | "anviz"
  | "generic_tcp"
  | "generic_rest"
  | "sdk"
  | "file_import";

export type HrDeviceConnectionConfig = Readonly<{
  deviceId: string;
  deviceType: string;
  driverKey: HrDeviceDriverKey;
  ipAddress?: string | null;
  port?: number | null;
  serialNumber?: string | null;
  firmwareVersion?: string | null;
  timezone: string;
  credentials?: Readonly<Record<string, unknown>>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type HrDevicePingResult = Readonly<{ latencyMs: number; reachable: boolean }>;

export type HrDeviceHeartbeatResult = Readonly<{
  alive: boolean;
  lastSeenAt: string;
  latencyMs?: number;
}>;

export type HrDeviceUserRecord = Readonly<{
  deviceCode: string;
  attendanceCode: string;
  name: string;
  cardNumber?: string | null;
  fingerprintCount?: number;
  faceEnrolled?: boolean;
}>;

export type HrDevicePunchRecord = Readonly<{
  attendanceCode: string;
  deviceCode: string;
  punchTime: string;
  punchType: "in" | "out";
}>;

export type HrDeviceInfo = Readonly<{
  model: string;
  firmwareVersion: string;
  serialNumber: string;
  sdkVersion?: string;
  timezone: string;
  deviceTime: string;
  serverTime: string;
  clockDriftSeconds: number;
}>;

export type HrDeviceStorageStatus = Readonly<{
  userCount: number;
  punchCount: number;
  fingerprintCount: number;
  faceCount: number;
  cardCount: number;
  userCapacity: number;
  punchCapacity: number;
  fingerprintCapacity: number;
  faceCapacity: number;
  cardCapacity: number;
  storageUsagePct: number;
  memoryUsagePct: number;
}>;

export type HrDeviceCommandResult = Readonly<{
  success: boolean;
  message: string;
  payload?: Readonly<Record<string, unknown>>;
}>;

export type HrDeviceConfigPayload = Readonly<Record<string, unknown>>;

export interface HrAttendanceDeviceDriver {
  readonly key: HrDeviceDriverKey;
  readonly label: string;
  readonly protocolFamily: "tcp" | "rest" | "sdk" | "file";

  connect(config: HrDeviceConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<HrDevicePingResult>;
  heartbeat(): Promise<HrDeviceHeartbeatResult>;
  downloadUsers(): Promise<readonly HrDeviceUserRecord[]>;
  uploadUsers(users: readonly HrDeviceUserRecord[]): Promise<HrDeviceCommandResult>;
  downloadPunches(since?: string): Promise<readonly HrDevicePunchRecord[]>;
  uploadFingerprints?(userCode: string, data: Uint8Array): Promise<HrDeviceCommandResult>;
  uploadFaces?(userCode: string, data: Uint8Array): Promise<HrDeviceCommandResult>;
  uploadCards?(userCode: string, cardNumber: string): Promise<HrDeviceCommandResult>;
  clearLogs(): Promise<HrDeviceCommandResult>;
  restart(): Promise<HrDeviceCommandResult>;
  shutdown?(): Promise<HrDeviceCommandResult>;
  backup(): Promise<HrDeviceCommandResult>;
  restore(payload: HrDeviceConfigPayload): Promise<HrDeviceCommandResult>;
  syncTime(serverTime?: string): Promise<HrDeviceCommandResult>;
  getDeviceInfo(): Promise<HrDeviceInfo>;
  getStorageStatus(): Promise<HrDeviceStorageStatus>;
  readConfiguration?(): Promise<HrDeviceConfigPayload>;
  writeConfiguration?(config: HrDeviceConfigPayload): Promise<HrDeviceCommandResult>;
  factoryReset?(): Promise<HrDeviceCommandResult>;
}

export type HrDeviceDriverDescriptor = Readonly<{
  key: HrDeviceDriverKey;
  label: string;
  protocolFamily: HrAttendanceDeviceDriver["protocolFamily"];
  supportedDeviceTypes: readonly string[];
  capabilities: readonly string[];
}>;
