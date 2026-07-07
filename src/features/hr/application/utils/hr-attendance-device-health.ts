import type { HrAttendanceDeviceHealthDimensionStatus } from "../types/hr-attendance-device.types";

export type HrDeviceHealthInput = Readonly<{
  autoSyncInterval: string;
  clockDriftSeconds: number;
  connectionQuality: string;
  firmwareVersion: string | null;
  healthScore: string | null;
  healthStatus: string;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  latencyMs: number | null;
  memoryUsagePct: number | null;
  pendingQueueCount: number;
  storageUsagePct: number | null;
}>;

export type HrDeviceHealthDimensions = Readonly<{
  clock: HrAttendanceDeviceHealthDimensionStatus;
  firmware: HrAttendanceDeviceHealthDimensionStatus;
  heartbeat: HrAttendanceDeviceHealthDimensionStatus;
  network: HrAttendanceDeviceHealthDimensionStatus;
  overallScorePercent: number;
  queue: HrAttendanceDeviceHealthDimensionStatus;
  storage: HrAttendanceDeviceHealthDimensionStatus;
  sync: HrAttendanceDeviceHealthDimensionStatus;
}>;

const DIMENSION_WEIGHT = 12.5;

function scoreDimension(status: HrAttendanceDeviceHealthDimensionStatus): number {
  if (status === "healthy") return DIMENSION_WEIGHT;
  if (status === "warning") return DIMENSION_WEIGHT * 0.5;
  return 0;
}

function heartbeatAgeMinutes(lastHeartbeatAt: string | null, nowMs: number): number | null {
  if (!lastHeartbeatAt) return null;
  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(timestamp)) return null;
  return (nowMs - timestamp) / 60_000;
}

function syncAgeHours(lastSyncAt: string | null, nowMs: number): number | null {
  if (!lastSyncAt) return null;
  const timestamp = new Date(lastSyncAt).getTime();
  if (Number.isNaN(timestamp)) return null;
  return (nowMs - timestamp) / 3_600_000;
}

export function computeDeviceHealthDimensions(
  input: HrDeviceHealthInput,
  nowMs: number = Date.now(),
): HrDeviceHealthDimensions {
  const network =
    input.healthStatus === "offline" || input.healthStatus === "never_connected"
      ? "critical"
      : input.connectionQuality === "poor" || (input.latencyMs !== null && input.latencyMs > 500)
        ? "warning"
        : input.connectionQuality === "excellent" || input.connectionQuality === "good"
          ? "healthy"
          : "warning";

  const queue =
    input.pendingQueueCount >= 500
      ? "critical"
      : input.pendingQueueCount >= 100
        ? "warning"
        : "healthy";

  const clock =
    Math.abs(input.clockDriftSeconds) >= 300
      ? "critical"
      : Math.abs(input.clockDriftSeconds) >= 60
        ? "warning"
        : "healthy";

  const firmware = input.firmwareVersion ? "healthy" : "warning";

  const heartbeatMinutes = heartbeatAgeMinutes(input.lastHeartbeatAt, nowMs);
  const heartbeat =
    heartbeatMinutes === null
      ? "critical"
      : heartbeatMinutes > 30
        ? "critical"
        : heartbeatMinutes > 10
          ? "warning"
          : "healthy";

  const syncHours = syncAgeHours(input.lastSyncAt, nowMs);
  const sync =
    input.healthStatus === "sync_running"
      ? "healthy"
      : syncHours === null
        ? "warning"
        : syncHours > 48
          ? "critical"
          : syncHours > 24
            ? "warning"
            : "healthy";

  const storagePct = input.storageUsagePct ?? 0;
  const storage =
    storagePct >= 95
      ? "critical"
      : storagePct >= 80
        ? "warning"
        : "healthy";

  const dimensions: Omit<HrDeviceHealthDimensions, "overallScorePercent"> = {
    clock,
    firmware,
    heartbeat,
    network,
    queue,
    storage,
    sync,
  };
  const overallScorePercent = Math.round(
    Object.values(dimensions).reduce((sum, status) => sum + scoreDimension(status), 0),
  );

  return { ...dimensions, overallScorePercent };
}

export function formatHealthDimensionLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
