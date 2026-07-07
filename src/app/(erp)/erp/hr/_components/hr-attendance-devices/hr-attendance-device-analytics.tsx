"use client";

import type { HrAttendanceDeviceFleetAnalytics } from "@/features/hr/public-api";
import { formatHrDurationSeconds } from "@/features/hr/public-api";

function MiniBars({
  items,
  labelKey,
  valueKey,
}: Readonly<{
  items: readonly Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
}>) {
  const max = Math.max(...items.map((item) => Number(item[valueKey])), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div className="space-y-1" key={String(item[labelKey])}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{String(item[labelKey])}</span>
            <span className="font-medium tabular-nums">{String(item[valueKey])}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
            <div
              className="h-full rounded-full bg-[hsl(var(--accent))]"
              style={{ width: `${Math.round((Number(item[valueKey]) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HrAttendanceDeviceAnalyticsPanel({
  analytics,
}: Readonly<{ analytics: HrAttendanceDeviceFleetAnalytics }>) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Availability {analytics.availabilityPct}% · Offline {analytics.offlinePct}%
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard label="Punches today" value={String(analytics.punchesToday)} />
        <AnalyticsCard label="Availability" value={`${analytics.availabilityPct}%`} />
        <AnalyticsCard label="Offline" value={`${analytics.offlinePct}%`} />
        <AnalyticsCard
          label="Avg sync duration"
          value={
            analytics.syncDurationTrend.length > 0
              ? formatHrDurationSeconds(analytics.syncDurationTrend[analytics.syncDurationTrend.length - 1]?.durationSeconds ?? 0)
              : "—"
          }
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <h3 className="mb-3 text-sm font-medium">Punches this week</h3>
          <MiniBars items={analytics.punchesThisWeek.map((row) => ({ date: row.date.slice(5), count: row.count }))} labelKey="date" valueKey="count" />
        </div>
        <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <h3 className="mb-3 text-sm font-medium">Import trend</h3>
          <MiniBars items={analytics.importTrend.map((row) => ({ date: row.date.slice(5), imported: row.imported }))} labelKey="date" valueKey="imported" />
        </div>
        <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <h3 className="mb-3 text-sm font-medium">Top device usage</h3>
          <MiniBars
            items={analytics.deviceUsage.map((row) => ({ device: row.deviceCode, punches: row.punches }))}
            labelKey="device"
            valueKey="punches"
          />
        </div>
      </div>
      {analytics.topErrors.length > 0 ? (
        <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
          <h3 className="mb-3 text-sm font-medium">Top errors</h3>
          <ul className="space-y-2 text-sm">
            {analytics.topErrors.map((error) => (
              <li className="flex items-start justify-between gap-3 rounded-md border px-3 py-2" key={error.message}>
                <span>{error.message}</span>
                <span className="shrink-0 font-medium tabular-nums">{error.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function AnalyticsCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
