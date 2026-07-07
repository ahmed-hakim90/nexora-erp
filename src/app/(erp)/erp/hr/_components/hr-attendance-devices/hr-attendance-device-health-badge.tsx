"use client";

import type { HrAttendanceDeviceHealthDimensions } from "@/features/hr/public-api";
import {
  formatHrHealthDimensionLabel,
  healthDimensionTone,
} from "@/features/hr/public-api";
import { cn } from "@/shared/ui/utils";

const DIMENSION_KEYS = ["network", "queue", "clock", "firmware", "heartbeat", "sync", "storage"] as const;

export const HR_ATTENDANCE_DEVICE_HEALTH_STATUS_TONE: Record<string, string> = {
  connecting: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  never_connected: "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 text-muted-foreground",
  offline: "border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
  online: "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  sync_running: "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
};

export function HrAttendanceDeviceHealthBadge({
  dimensions,
  score,
}: Readonly<{
  dimensions: HrAttendanceDeviceHealthDimensions;
  score?: number | null;
}>) {
  const overall = score ?? dimensions.overallScorePercent;
  const tone =
    overall >= 80 ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10" : overall >= 50 ? "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10" : "border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/10";

  return (
    <div className={cn("rounded-xl border p-3", tone)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Health score</p>
        <p className="text-2xl font-semibold tabular-nums">{overall}%</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {DIMENSION_KEYS.map((key) => (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-[hsl(var(--surface))]/60 px-2 py-1" key={key}>
            <span className="text-muted-foreground">{formatHrHealthDimensionLabel(key)}</span>
            <span className={cn("font-medium capitalize", healthDimensionTone(dimensions[key]))}>{dimensions[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
