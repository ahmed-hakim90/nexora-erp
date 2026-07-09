"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { platformFeedback } from "@/platform/feedback/public-api";

import {
  HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS,
  type HrAttendanceLiveEmployeeDrawer,
  type HrAttendanceLiveRefreshPayload,
  type HrAttendanceLiveWorkspaceData,
} from "@/features/hr/public-api";
import {
  Button,
  Input,
  PageActions,
  PageContainer,
  PageFilters,
  PageHeader,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

import { HrRelativeTime } from "../hr-relative-time";
import { HrAttendanceLiveDrawer, HrAttendanceLiveVirtualGrid } from "./hr-attendance-live-drawer";
import { HrAttendanceLiveExceptionPanel } from "./hr-attendance-live-exception-panel";
import { HrAttendanceLiveKpiHeader } from "./hr-attendance-live-kpi-header";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/attendance-live?${query}` : "/erp/hr/attendance-live";
}

function buildRefreshQuery(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "employee" || !value) continue;
    next.set(key, value);
  }
  return next.toString();
}

export function HrAttendanceLiveWorkspace({
  data,
  initialDrawer,
  query,
}: Readonly<{
  data: HrAttendanceLiveWorkspaceData;
  initialDrawer?: HrAttendanceLiveEmployeeDrawer | null;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [snapshot, setSnapshot] = useState(data);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(query.employee ?? null);
  const [drawer, setDrawer] = useState<HrAttendanceLiveEmployeeDrawer | null>(initialDrawer ?? null);
  const refreshIntervalSeconds = Number(query.refreshIntervalSeconds ?? snapshot.defaultRefreshIntervalSeconds);

  const refreshQuery = useMemo(() => buildRefreshQuery(query), [query]);

  const pollSnapshot = useCallback(async () => {
    const response = await fetch(`/api/hr/attendance-live/refresh?${refreshQuery}`);
    if (!response.ok) return;
    const payload = (await response.json()) as HrAttendanceLiveRefreshPayload;
    setSnapshot((current) => ({
      ...current,
      alerts: payload.alerts,
      exceptions: payload.exceptions,
      kpis: payload.kpis,
      nextCursor: payload.nextCursor,
      records: payload.records,
      snapshotAt: payload.snapshotAt,
    }));

    for (const alert of payload.alerts.slice(0, 3)) {
      if (alert.severity === "error") platformFeedback.error(alert.title, { description: alert.body });
      else if (alert.severity === "warning") platformFeedback.warning(alert.title, { description: alert.body });
    }
  }, [refreshQuery]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await pollSnapshot();
    };
    void tick();
    const interval = window.setInterval(tick, refreshIntervalSeconds * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pollSnapshot, refreshIntervalSeconds]);

  const openEmployee = (employeeId: string) => {
    setDrawerEmployeeId(employeeId);
    setDrawer(null);
    void (async () => {
      const response = await fetch(`/api/hr/attendance-live/employee/${employeeId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as HrAttendanceLiveEmployeeDrawer;
      setDrawer(payload);
    })();
    startTransition(() => {
      router.push(buildHref(query, { employee: employeeId }));
    });
  };

  const closeDrawer = () => {
    setDrawerEmployeeId(null);
    setDrawer(null);
    startTransition(() => {
      router.push(buildHref(query, { employee: null }));
    });
  };

  const exportHref = `/api/hr/attendance-live/export?${refreshQuery}`;

  return (
    <PageContainer className="max-w-[120rem]">
      <PageHeader
        description={t("hr.attendance.live.description")}
        title={t("hr.attendance.live.title")}
      >
        <PageActions>
          <span className="text-sm text-muted-foreground">
            {t("hr.attendance.live.updated")} <HrRelativeTime value={snapshot.snapshotAt} />
          </span>
          <Link className={secondaryButtonLinkClassName} href={exportHref}>
            {t("hr.common.exportCsv")}
          </Link>
          <Button onClick={() => window.print()} type="button" variant="secondary">
            {t("hr.attendance.live.printSnapshot")}
          </Button>
        </PageActions>
      </PageHeader>

      <div className="space-y-6">
        <HrAttendanceLiveKpiHeader kpis={snapshot.kpis} />

        <PageFilters>
          <form action="/erp/hr/attendance-live" className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
            <Input defaultValue={query.search ?? ""} name="search" placeholder={t("hr.attendance.live.searchPlaceholder")} />
            <select className={nativeSelectClassName} defaultValue={query.departmentId ?? ""} name="departmentId">
              <option value="">All departments</option>
              {snapshot.departmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.branchId ?? ""} name="branchId">
              <option value="">All branches</option>
              {snapshot.branchOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.shiftId ?? ""} name="shiftId">
              <option value="">All shifts</option>
              {snapshot.shiftOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.managerId ?? ""} name="managerId">
              <option value="">All managers</option>
              {snapshot.managerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.attendanceStatus ?? ""} name="attendanceStatus">
              <option value="">All statuses</option>
              {snapshot.liveStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.deviceId ?? ""} name="deviceId">
              <option value="">All devices</option>
              {snapshot.deviceOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={String(refreshIntervalSeconds)} name="refreshIntervalSeconds">
              {HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  Refresh {seconds}s
                </option>
              ))}
            </select>
            <Button className="xl:col-span-8" type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
        </PageFilters>

        <HrAttendanceLiveExceptionPanel exceptions={snapshot.exceptions} onOpenEmployee={openEmployee} />

        <HrAttendanceLiveVirtualGrid onOpenEmployee={openEmployee} records={snapshot.records} />

        <HrAttendanceLiveDrawer drawer={drawer} employeeId={drawerEmployeeId} onClose={closeDrawer} />
      </div>
    </PageContainer>
  );
}
