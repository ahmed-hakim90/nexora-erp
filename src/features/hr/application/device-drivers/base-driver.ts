import type {
  HrAttendanceDeviceDriver,
  HrDeviceCommandResult,
  HrDeviceConfigPayload,
  HrDeviceConnectionConfig,
  HrDeviceDriverKey,
  HrDeviceHeartbeatResult,
  HrDeviceInfo,
  HrDevicePingResult,
  HrDevicePunchRecord,
  HrDeviceStorageStatus,
  HrDeviceUserRecord,
} from "./types";

export abstract class BaseAttendanceDeviceDriver implements HrAttendanceDeviceDriver {
  abstract readonly key: HrDeviceDriverKey;
  abstract readonly label: string;
  abstract readonly protocolFamily: HrAttendanceDeviceDriver["protocolFamily"];

  protected config: HrDeviceConnectionConfig | null = null;
  protected connected = false;

  async connect(config: HrDeviceConnectionConfig): Promise<void> {
    this.config = config;
    this.connected = true;
    await this.onConnect(config);
  }

  async disconnect(): Promise<void> {
    await this.onDisconnect();
    this.connected = false;
    this.config = null;
  }

  protected abstract onConnect(config: HrDeviceConnectionConfig): Promise<void>;
  protected abstract onDisconnect(): Promise<void>;

  protected ensureConnected(): HrDeviceConnectionConfig {
    if (!this.connected || !this.config) {
      throw new Error(`Driver ${this.key} is not connected.`);
    }
    return this.config;
  }

  protected success(message: string, payload?: Record<string, unknown>): HrDeviceCommandResult {
    return { message, payload, success: true };
  }

  protected failure(message: string): HrDeviceCommandResult {
    return { message, success: false };
  }

  abstract ping(): Promise<HrDevicePingResult>;
  abstract heartbeat(): Promise<HrDeviceHeartbeatResult>;
  abstract downloadUsers(): Promise<readonly HrDeviceUserRecord[]>;
  abstract downloadPunches(since?: string): Promise<readonly HrDevicePunchRecord[]>;
  abstract getDeviceInfo(): Promise<HrDeviceInfo>;
  abstract getStorageStatus(): Promise<HrDeviceStorageStatus>;

  async uploadUsers(users: readonly HrDeviceUserRecord[]): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success(`Uploaded ${users.length} users to ${this.label} device.`, { uploaded: users.length });
  }

  async clearLogs(): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success("Attendance logs cleared.");
  }

  async restart(): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success("Device restart initiated.");
  }

  async shutdown(): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success("Device shutdown initiated.");
  }

  async backup(): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    const config = await this.readConfiguration();
    return this.success("Device backup created.", { config });
  }

  async restore(payload: HrDeviceConfigPayload): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.writeConfiguration(payload);
  }

  async syncTime(serverTime?: string): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    const time = serverTime ?? new Date().toISOString();
    return this.success("Device time synchronized.", { syncedAt: time });
  }

  async readConfiguration(): Promise<HrDeviceConfigPayload> {
    this.ensureConnected();
    return {
      driverKey: this.key,
      firmwareVersion: this.config?.firmwareVersion ?? null,
      ipAddress: this.config?.ipAddress ?? null,
      port: this.config?.port ?? null,
      timezone: this.config?.timezone ?? "UTC",
    };
  }

  async writeConfiguration(config: HrDeviceConfigPayload): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success("Configuration written.", { config });
  }

  async factoryReset(): Promise<HrDeviceCommandResult> {
    this.ensureConnected();
    return this.success("Factory reset initiated.");
  }

  protected simulateLatency(): number {
    return 20 + Math.floor(Math.random() * 80);
  }

  protected serverNow(): string {
    return new Date().toISOString();
  }

  protected defaultStorageStatus(userCount: number, punchCount: number): HrDeviceStorageStatus {
    return {
      cardCapacity: 10000,
      cardCount: Math.min(userCount, 10000),
      faceCapacity: 5000,
      faceCount: Math.floor(userCount * 0.3),
      fingerprintCapacity: 10000,
      fingerprintCount: Math.floor(userCount * 0.8),
      memoryUsagePct: Math.min(95, 10 + userCount * 0.05),
      punchCapacity: 500000,
      punchCount,
      storageUsagePct: Math.min(99, 5 + punchCount * 0.001),
      userCapacity: 10000,
      userCount,
    };
  }
}
