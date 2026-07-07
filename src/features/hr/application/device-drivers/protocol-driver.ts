import { BaseAttendanceDeviceDriver } from "./base-driver";
import type {
  HrDeviceConnectionConfig,
  HrDeviceDriverKey,
  HrDeviceHeartbeatResult,
  HrDeviceInfo,
  HrDevicePingResult,
  HrDevicePunchRecord,
  HrDeviceStorageStatus,
  HrDeviceUserRecord,
} from "./types";

type ProtocolDriverOptions = Readonly<{
  key: HrDeviceDriverKey;
  label: string;
  protocolFamily: "tcp" | "rest" | "sdk";
  defaultPort: number;
  modelPrefix: string;
}>;

export class ProtocolAttendanceDeviceDriver extends BaseAttendanceDeviceDriver {
  readonly key: HrDeviceDriverKey;
  readonly label: string;
  readonly protocolFamily: "tcp" | "rest" | "sdk";

  private readonly defaultPort: number;
  private readonly modelPrefix: string;
  private cachedUsers: HrDeviceUserRecord[] = [];
  private cachedPunches: HrDevicePunchRecord[] = [];

  constructor(options: ProtocolDriverOptions) {
    super();
    this.key = options.key;
    this.label = options.label;
    this.protocolFamily = options.protocolFamily;
    this.defaultPort = options.defaultPort;
    this.modelPrefix = options.modelPrefix;
  }

  protected async onConnect(config: HrDeviceConnectionConfig): Promise<void> {
    const port = config.port ?? this.defaultPort;
    if (this.protocolFamily === "tcp" && !config.ipAddress) {
      throw new Error(`${this.label} requires an IP address.`);
    }
    this.cachedUsers = [];
    this.cachedPunches = [];
    await Promise.resolve({ connected: true, port });
  }

  protected async onDisconnect(): Promise<void> {
    this.cachedUsers = [];
    this.cachedPunches = [];
  }

  async ping(): Promise<HrDevicePingResult> {
    this.ensureConnected();
    const latencyMs = this.simulateLatency();
    return { latencyMs, reachable: true };
  }

  async heartbeat(): Promise<HrDeviceHeartbeatResult> {
    const ping = await this.ping();
    return { alive: ping.reachable, lastSeenAt: this.serverNow(), latencyMs: ping.latencyMs };
  }

  async downloadUsers(): Promise<readonly HrDeviceUserRecord[]> {
    this.ensureConnected();
    if (this.cachedUsers.length === 0) {
      this.cachedUsers = Array.from({ length: 3 }, (_, index) => ({
        attendanceCode: `${this.modelPrefix}${String(index + 1).padStart(3, "0")}`,
        deviceCode: `${this.modelPrefix}${String(index + 1).padStart(3, "0")}`,
        faceEnrolled: index % 2 === 0,
        fingerprintCount: 2,
        name: `${this.label} User ${index + 1}`,
      }));
    }
    return this.cachedUsers;
  }

  async downloadPunches(since?: string): Promise<readonly HrDevicePunchRecord[]> {
    this.ensureConnected();
    const users = await this.downloadUsers();
    const sinceDate = since ? new Date(since) : new Date();
    sinceDate.setUTCHours(0, 0, 0, 0);
    const punches: HrDevicePunchRecord[] = [];

    for (const [index, user] of users.entries()) {
      const inTime = new Date(sinceDate);
      inTime.setUTCHours(8 + (index % 2), 5, 0, 0);
      const outTime = new Date(inTime);
      outTime.setUTCHours(inTime.getUTCHours() + 8);
      punches.push({
        attendanceCode: user.attendanceCode,
        deviceCode: String(this.config?.deviceId ?? this.modelPrefix),
        punchTime: inTime.toISOString(),
        punchType: "in",
      });
      punches.push({
        attendanceCode: user.attendanceCode,
        deviceCode: String(this.config?.deviceId ?? this.modelPrefix),
        punchTime: outTime.toISOString(),
        punchType: "out",
      });
    }

    this.cachedPunches = punches;
    return punches;
  }

  async getDeviceInfo(): Promise<HrDeviceInfo> {
    this.ensureConnected();
    const config = this.ensureConnected();
    const serverTime = this.serverNow();
    const deviceTime = new Date(Date.now() + (config.metadata?.simulatedDriftSeconds as number ?? 0) * 1000).toISOString();
    const clockDriftSeconds = Math.round((new Date(deviceTime).getTime() - new Date(serverTime).getTime()) / 1000);
    return {
      clockDriftSeconds,
      deviceTime,
      firmwareVersion: config.firmwareVersion ?? "1.0.0",
      model: `${this.modelPrefix}-Enterprise`,
      sdkVersion: `${this.key}-sdk-2.1`,
      serialNumber: config.serialNumber ?? `${this.key.toUpperCase()}-SN-001`,
      serverTime,
      timezone: config.timezone,
    };
  }

  async getStorageStatus(): Promise<HrDeviceStorageStatus> {
    const users = await this.downloadUsers();
    const punches = await this.downloadPunches();
    return this.defaultStorageStatus(users.length, punches.length);
  }
}
