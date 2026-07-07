"use client";

import { useEffect, useRef, useState } from "react";

import type { HrAttendanceDeviceRealtimeEvent } from "@/features/hr/public-api";
import { EnterpriseDataTable } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import { TabLoadingState } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerRealtimeTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const [events, setEvents] = useState<readonly HrAttendanceDeviceRealtimeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const previousTopId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/hr/attendance-devices/${deviceId}/realtime`);
        if (!response.ok) throw new Error("Could not load realtime events.");
        const payload = (await response.json()) as { events: readonly HrAttendanceDeviceRealtimeEvent[] };
        if (cancelled) return;
        const nextEvents = payload.events ?? [];
        const topId = nextEvents[0]?.id ?? null;
        if (topId && previousTopId.current && topId !== previousTopId.current) {
          setHighlightId(topId);
          window.setTimeout(() => setHighlightId(null), 1500);
        }
        previousTopId.current = topId;
        setEvents(nextEvents);
        setError(null);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load realtime events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void (async () => {
      setLoading(true);
      await load();
    })();
    const interval = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deviceId, enabled]);

  if (loading && events.length === 0) return <TabLoadingState error={error} loading={loading} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Live punch stream with auto-refresh every 5 seconds.</p>
      {error ? <TabLoadingState error={error} loading={false} /> : null}
      <EnterpriseDataTable
        columns={[
          { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
          { header: "Time", key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
          { header: "Device", key: "device", render: (row) => row.deviceCode },
          { header: "Direction", key: "direction", render: (row) => row.direction.toUpperCase() },
          {
            header: "Status",
            key: "status",
            render: (row) => (
              <span className={cn(highlightId === row.id && "rounded-full bg-[hsl(var(--accent))]/15 px-2 py-0.5")}>{row.status}</span>
            ),
          },
        ]}
        emptyMessage="No live punches yet."
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: events.length || 1, totalRows: events.length }}
        records={events}
      />
    </div>
  );
}
