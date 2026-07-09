"use client";

import { useEffect, useRef, useState } from "react";

import type { HrAttendanceDeviceRealtimeEvent } from "@/features/hr/public-api";
import { EnterpriseDataTable, useTranslations } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import { TabLoadingState } from "./hr-attendance-device-drawer-shared";

export function HrAttendanceDeviceDrawerRealtimeTab({
  deviceId,
  enabled,
}: Readonly<{ deviceId: string; enabled: boolean }>) {
  const t = useTranslations();
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
        if (!response.ok) throw new Error(t("hr.attendance.devices.feedback.couldNotLoadRealtime"));
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
        if (!cancelled) setError(cause instanceof Error ? cause.message : t("hr.attendance.devices.feedback.couldNotLoadRealtime"));
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
  }, [deviceId, enabled, t]);

  if (loading && events.length === 0) return <TabLoadingState error={error} loading={loading} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.drawer.realtimeHint")}</p>
      {error ? <TabLoadingState error={error} loading={false} /> : null}
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
          { header: t("hr.common.time"), key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
          { header: t("hr.common.device"), key: "device", render: (row) => row.deviceCode },
          { header: t("hr.common.direction"), key: "direction", render: (row) => row.direction.toUpperCase() },
          {
            header: t("hr.common.status"),
            key: "status",
            render: (row) => (
              <span className={cn(highlightId === row.id && "rounded-full bg-[hsl(var(--accent))]/15 px-2 py-0.5")}>{row.status}</span>
            ),
          },
        ]}
        emptyMessage={t("hr.attendance.devices.drawer.emptyRealtime")}
        getRowId={(row) => row.id}
        pagination={{ mode: "page", page: 1, pageSize: events.length || 1, totalRows: events.length }}
        records={events}
      />
    </div>
  );
}
