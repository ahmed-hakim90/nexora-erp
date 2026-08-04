import "server-only";

import ZKLib from "node-zklib";

import { BaseAttendanceDeviceDriver } from "./base-driver";
import {
  formatDeviceDriverError,
  isRetryableZkDeviceError,
  toDeviceDriverError,
  type DeviceDriverErrorContext,
} from "./device-driver-error";
import { makeZkCommKey } from "./zkteco-comm-key";
import type {
  HrDeviceConnectionConfig,
  HrDeviceHeartbeatResult,
  HrDeviceInfo,
  HrDevicePingResult,
  HrDevicePunchRecord,
  HrDeviceStorageStatus,
  HrDeviceUserRecord,
} from "./types";

const ZK_CMD_AUTH = 1102;
const DEFAULT_PORT = 4370;
const CONNECTION_TIMEOUT_MS = 120_000;
const UDP_INPORT = 4000;
const MAX_OPERATION_ATTEMPTS = 2;
const STALE_SESSION_REAUTH_MS = 60_000;

type ZkLibInternal = Readonly<{
  zklibTcp: Readonly<{
    sessionId: number | null;
  }>;
}>;

function readCommKey(credentials?: Readonly<Record<string, unknown>>): number {
  const raw = credentials?.commKey;
  if (raw === undefined || raw === null || raw === "") return 0;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPunchType(userCode: string, punchTime: string, punchIndexByUser: Map<string, number>): "in" | "out" {
  const index = punchIndexByUser.get(userCode) ?? 0;
  punchIndexByUser.set(userCode, index + 1);
  return index % 2 === 0 ? "in" : "out";
}

export class ZktecoAttendanceDeviceDriver extends BaseAttendanceDeviceDriver {
  readonly key = "zkteco" as const;
  readonly label = "ZKTeco";
  readonly protocolFamily = "tcp" as const;

  private zk: InstanceType<typeof ZKLib> | null = null;
  private connectedAt: number | null = null;

  protected async onConnect(config: HrDeviceConnectionConfig): Promise<void> {
    if (!config.ipAddress) {
      throw new Error("ZKTeco requires an IP address.");
    }

    const port = config.port ?? DEFAULT_PORT;
    const commKey = readCommKey(config.credentials);
    this.zk = new ZKLib(config.ipAddress, port, CONNECTION_TIMEOUT_MS, UDP_INPORT);

    try {
      await this.zk.createSocket();
      await this.ensureAuthenticated(commKey);
      this.connectedAt = Date.now();
    } catch (cause) {
      await this.forceDisconnect();
      throw toDeviceDriverError(cause, this.errorContext("connect"));
    }
  }

  protected async onDisconnect(): Promise<void> {
    await this.forceDisconnect();
  }

  async ping(): Promise<HrDevicePingResult> {
    this.ensureConnected();
    const startedAt = Date.now();
    try {
      await this.zk!.getInfo();
      return { latencyMs: Date.now() - startedAt, reachable: true };
    } catch {
      return { latencyMs: Date.now() - startedAt, reachable: false };
    }
  }

  async heartbeat(): Promise<HrDeviceHeartbeatResult> {
    const ping = await this.ping();
    return { alive: ping.reachable, lastSeenAt: this.serverNow(), latencyMs: ping.latencyMs };
  }

  async downloadUsers(): Promise<readonly HrDeviceUserRecord[]> {
    return this.withZkRetry("download_users", async () => {
      this.ensureConnected();
      await this.refreshAuthenticationIfStale();
      const result = await this.zk!.getUsers();
      if (result.err) {
        throw toDeviceDriverError(result.err, this.errorContext("download_users"));
      }

      return result.data.map((user) => ({
        attendanceCode: String(user.userId).trim(),
        deviceCode: String(user.uid),
        faceEnrolled: false,
        fingerprintCount: 0,
        name: String(user.name).trim() || `User ${user.userId}`,
      }));
    });
  }

  async downloadPunches(since?: string): Promise<readonly HrDevicePunchRecord[]> {
    return this.withZkRetry("download_punches", async () => {
      this.ensureConnected();
      const config = this.ensureConnected();
      await this.refreshAuthenticationIfStale(true);
      const result = await this.zk!.getAttendances();
      if (result.err) {
        throw toDeviceDriverError(result.err, this.errorContext("download_punches"));
      }

      const sinceTime = since ? new Date(since).getTime() : null;
      const sorted = [...result.data].sort((left, right) => left.recordTime.getTime() - right.recordTime.getTime());
      const punchIndexByUser = new Map<string, number>();
      const punches: HrDevicePunchRecord[] = [];

      for (const record of sorted) {
        const punchTime = record.recordTime.toISOString();
        if (sinceTime !== null && record.recordTime.getTime() < sinceTime) continue;

        const attendanceCode = String(record.deviceUserId).trim();
        if (!attendanceCode) continue;

        punches.push({
          attendanceCode,
          deviceCode: config.serialNumber ?? String(config.deviceId),
          punchTime,
          punchType: mapPunchType(attendanceCode, punchTime, punchIndexByUser),
        });
      }

      return punches;
    });
  }

  async getDeviceInfo(): Promise<HrDeviceInfo> {
    this.ensureConnected();
    const config = this.ensureConnected();
    const serverTime = this.serverNow();

    return {
      clockDriftSeconds: 0,
      deviceTime: serverTime,
      firmwareVersion: config.firmwareVersion ?? "unknown",
      model: "ZKTeco",
      sdkVersion: "node-zklib",
      serialNumber: config.serialNumber ?? config.deviceId,
      serverTime,
      timezone: config.timezone,
    };
  }

  async getStorageStatus(): Promise<HrDeviceStorageStatus> {
    const info = await this.zk!.getInfo();
    return this.defaultStorageStatus(info.userCounts, info.logCounts);
  }

  private async ensureAuthenticated(commKey: number, force = false): Promise<void> {
    if (!force && (await this.probeDeviceReady())) return;

    const sessionId = this.readSessionId();
    if (sessionId === null) {
      throw new Error("Could not read ZKTeco session id for comm key authentication.");
    }

    try {
      await this.zk!.executeCmd(ZK_CMD_AUTH, makeZkCommKey(commKey, sessionId));
    } catch (cause) {
      throw this.buildCommKeyError(commKey, cause);
    }

    if (!(await this.probeDeviceReady())) {
      throw this.buildCommKeyError(commKey);
    }
  }

  private async refreshAuthenticationIfStale(force = false): Promise<void> {
    const commKey = readCommKey(this.config?.credentials);
    const sessionAgeMs = this.connectedAt === null ? Number.POSITIVE_INFINITY : Date.now() - this.connectedAt;
    if (!force && sessionAgeMs < STALE_SESSION_REAUTH_MS) return;
    await this.ensureAuthenticated(commKey, true);
    this.connectedAt = Date.now();
  }

  private async probeDeviceReady(): Promise<boolean> {
    try {
      await this.zk!.getInfo();
      return true;
    } catch {
      return false;
    }
  }

  private buildCommKeyError(commKey: number, cause?: unknown): Error {
    const baseMessage =
      commKey > 0
        ? "ZKTeco communication key was rejected by the device."
        : "ZKTeco device requires a communication key (Comm Key). Add it in device settings.";

    const detail = cause ? formatDeviceDriverError(cause, this.errorContext("authenticate")) : null;
    const message = detail ? `${baseMessage} ${detail}` : baseMessage;
    return toDeviceDriverError(new Error(message), this.errorContext("authenticate"));
  }

  private readSessionId(): number | null {
    if (!this.zk) return null;
    const sessionId = (this.zk as unknown as ZkLibInternal).zklibTcp.sessionId;
    return typeof sessionId === "number" ? sessionId : null;
  }

  private async withZkRetry<T>(operation: DeviceDriverErrorContext["operation"], fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_OPERATION_ATTEMPTS; attempt += 1) {
      try {
        return await fn();
      } catch (cause) {
        lastError = cause;
        if (attempt >= MAX_OPERATION_ATTEMPTS || !isRetryableZkDeviceError(cause)) {
          throw toDeviceDriverError(cause, this.errorContext(operation));
        }

        const config = this.config;
        if (!config) {
          throw toDeviceDriverError(cause, this.errorContext(operation));
        }

        await this.forceDisconnect();
        this.connected = true;
        await this.onConnect(config);
      }
    }

    throw toDeviceDriverError(lastError, this.errorContext(operation));
  }

  private async forceDisconnect(): Promise<void> {
    if (this.zk) {
      try {
        await this.zk.disconnect();
      } catch {
        // Best-effort disconnect.
      }
    }
    this.zk = null;
    this.connectedAt = null;
    this.connected = false;
  }

  private errorContext(operation?: DeviceDriverErrorContext["operation"]): DeviceDriverErrorContext {
    return {
      ip: this.config?.ipAddress ?? undefined,
      operation,
      port: this.config?.port ?? DEFAULT_PORT,
    };
  }
}
