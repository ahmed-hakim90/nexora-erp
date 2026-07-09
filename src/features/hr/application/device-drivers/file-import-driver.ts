import { BaseAttendanceDeviceDriver } from "./base-driver";
import type {
  HrDeviceConnectionConfig,
  HrDeviceHeartbeatResult,
  HrDeviceInfo,
  HrDevicePingResult,
  HrDevicePunchRecord,
  HrDeviceStorageStatus,
  HrDeviceUserRecord,
} from "./types";

export class FileImportAttendanceDeviceDriver extends BaseAttendanceDeviceDriver {
  readonly key = "file_import" as const;
  readonly label = "File Import Driver";
  readonly protocolFamily = "file" as const;

  protected async onConnect(config: HrDeviceConnectionConfig): Promise<void> {
    void config;
    await Promise.resolve();
  }

  protected async onDisconnect(): Promise<void> {
    await Promise.resolve();
  }

  async ping(): Promise<HrDevicePingResult> {
    return { latencyMs: 1, reachable: true };
  }

  async heartbeat(): Promise<HrDeviceHeartbeatResult> {
    return { alive: true, lastSeenAt: this.serverNow(), latencyMs: 1 };
  }

  async downloadUsers(): Promise<readonly HrDeviceUserRecord[]> {
    this.ensureConnected();
    return [];
  }

  async downloadPunches(): Promise<readonly HrDevicePunchRecord[]> {
    this.ensureConnected();
    const importPunches = this.config?.metadata?.importPunches;
    if (Array.isArray(importPunches)) {
      return importPunches as HrDevicePunchRecord[];
    }
    const downloadedPunches = this.config?.metadata?.downloadedPunches;
    if (Array.isArray(downloadedPunches)) {
      return downloadedPunches as HrDevicePunchRecord[];
    }
    return [];
  }

  async getDeviceInfo(): Promise<HrDeviceInfo> {
    const serverTime = this.serverNow();
    return {
      clockDriftSeconds: 0,
      deviceTime: serverTime,
      firmwareVersion: "file-import-1.0",
      model: "File Import",
      serialNumber: "FILE-IMPORT",
      serverTime,
      timezone: this.config?.timezone ?? "UTC",
    };
  }

  async getStorageStatus(): Promise<HrDeviceStorageStatus> {
    return this.defaultStorageStatus(0, 0);
  }
}
