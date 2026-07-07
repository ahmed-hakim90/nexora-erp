import { formatHrDisplayLabel, formatHrStatusLabel } from "./hr-display";

import {
  HR_ATTENDANCE_DEVICE_HEALTH_DIMENSION_LABELS,
  HR_ATTENDANCE_DEVICE_HEALTH_LABELS,
  HR_ATTENDANCE_DEVICE_SYNC_MODE_LABELS,
  HR_ATTENDANCE_DEVICE_SYNC_PHASE_LABELS,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS,
} from "../constants/hr-attendance-device.constants";
import type { HrAttendanceDeviceHealthDimensionStatus } from "../types/hr-attendance-device.types";

export function formatHrAttendanceDeviceHealthLabel(status: string): string {
  return HR_ATTENDANCE_DEVICE_HEALTH_LABELS[status] ?? formatHrStatusLabel(status);
}

export function formatHrAttendanceDevicePhaseLabel(phase: string): string {
  return HR_ATTENDANCE_DEVICE_SYNC_PHASE_LABELS[phase] ?? formatHrStatusLabel(phase);
}

export function formatHrAbsoluteTime(value: string | null | undefined): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatHrRelativeTime(
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!value) return "Never";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Never";
  const diffMs = nowMs - timestamp;
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "Just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  return `${Math.round(abs / day)}d ago`;
}

export function formatHrDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatHrConnectionQualityLabel(value: string | null | undefined): string {
  return formatHrDisplayLabel(value, "Unknown");
}

export function formatHrDeviceTypeLabel(value: string): string {
  return formatHrStatusLabel(value);
}

export function formatHrAttendanceDeviceSubtitle(input: Readonly<{
  deviceType: string;
  ipAddress?: string | null;
  model?: string | null;
  port?: number | null;
  vendor?: string | null;
}>): string {
  const typeLabel = formatHrDeviceTypeLabel(input.deviceType);
  const vendorLabel = input.vendor?.trim() || typeLabel;
  const modelLabel = input.model?.trim() || null;
  const segments: string[] = [];

  if (modelLabel) {
    if (vendorLabel.toLowerCase() !== modelLabel.toLowerCase()) {
      segments.push(vendorLabel);
    }
    segments.push(modelLabel);
  } else if (
    vendorLabel.toLowerCase() !== typeLabel.toLowerCase() &&
    vendorLabel.toLowerCase() !== input.deviceType.toLowerCase()
  ) {
    segments.push(vendorLabel);
  } else {
    segments.push(typeLabel);
  }

  const ip = input.ipAddress?.trim();
  if (ip) {
    segments.push(input.port ? `${ip}:${input.port}` : ip);
  }

  return segments.join(" · ");
}

export function formatHrAttendanceDeviceSyncModeLabel(mode: string): string {
  return HR_ATTENDANCE_DEVICE_SYNC_MODE_LABELS[mode] ?? formatHrStatusLabel(mode);
}

export function formatHrAttendanceDeviceSyncStrategyLabel(strategy: string): string {
  return HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS[strategy] ?? formatHrStatusLabel(strategy);
}

export function formatHrHealthDimensionLabel(key: string): string {
  return HR_ATTENDANCE_DEVICE_HEALTH_DIMENSION_LABELS[key] ?? formatHrStatusLabel(key);
}

const HEALTH_DIMENSION_TONE: Record<HrAttendanceDeviceHealthDimensionStatus, string> = {
  critical: "text-[hsl(var(--danger))]",
  healthy: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
};

export function healthDimensionTone(status: HrAttendanceDeviceHealthDimensionStatus): string {
  return HEALTH_DIMENSION_TONE[status];
}
