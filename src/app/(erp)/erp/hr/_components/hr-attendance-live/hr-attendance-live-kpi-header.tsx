"use client";

import type { HrAttendanceLiveKpis } from "@/features/hr/public-api";
import { ProgressKpiCards, StickyToolbar, useTranslations } from "@/shared/ui";

export function HrAttendanceLiveKpiHeader({ kpis }: Readonly<{ kpis: HrAttendanceLiveKpis }>) {
  const t = useTranslations();
  const cards = [
    {
      description: t("hr.attendance.live.kpi.employeesPresent.helper"),
      key: "present",
      label: t("hr.attendance.live.kpi.employeesPresent"),
      tone: "success" as const,
      value: String(kpis.employeesPresent),
    },
    {
      description: t("hr.attendance.live.kpi.checkedInToday.helper"),
      key: "checked-in",
      label: t("hr.attendance.live.kpi.checkedInToday"),
      tone: "accent" as const,
      value: String(kpis.checkedInToday),
    },
    {
      description: t("hr.attendance.live.kpi.missingCheckIn.helper"),
      key: "missing-in",
      label: t("hr.attendance.live.kpi.missingCheckIn"),
      tone: "warning" as const,
      value: String(kpis.missingCheckIn),
    },
    {
      description: t("hr.attendance.live.kpi.missingCheckOut.helper"),
      key: "missing-out",
      label: t("hr.attendance.live.kpi.missingCheckOut"),
      tone: "warning" as const,
      value: String(kpis.missingCheckOut),
    },
    {
      description: t("hr.attendance.live.kpi.lateToday.helper"),
      key: "late",
      label: t("hr.attendance.live.kpi.lateToday"),
      tone: "warning" as const,
      value: String(kpis.lateToday),
    },
    {
      description: t("hr.attendance.live.kpi.earlyLeave.helper"),
      key: "early",
      label: t("hr.attendance.live.kpi.earlyLeave"),
      tone: "warning" as const,
      value: String(kpis.earlyLeave),
    },
    {
      description: t("hr.attendance.live.kpi.overtimeRunning.helper"),
      key: "ot",
      label: t("hr.attendance.live.kpi.overtimeRunning"),
      tone: "accent" as const,
      value: String(kpis.overtimeRunning),
    },
    {
      description: t("hr.attendance.live.kpi.absent.helper"),
      key: "absent",
      label: t("hr.attendance.live.kpi.absent"),
      tone: "warning" as const,
      value: String(kpis.absent),
    },
    {
      description: t("hr.attendance.live.kpi.currentlyWorking.helper"),
      key: "working",
      label: t("hr.attendance.live.kpi.currentlyWorking"),
      tone: "success" as const,
      value: String(kpis.currentlyWorking),
    },
    {
      description: t("hr.attendance.live.kpi.shiftCoverage.helper"),
      key: "coverage",
      label: t("hr.attendance.live.kpi.shiftCoverage"),
      tone: "accent" as const,
      value: `${kpis.currentShiftCoveragePct}%`,
    },
    {
      description: t("hr.attendance.live.kpi.activeDevices.helper"),
      key: "devices",
      label: t("hr.attendance.live.kpi.activeDevices"),
      tone: "success" as const,
      value: String(kpis.activeDevices),
    },
    {
      description: t("hr.attendance.live.kpi.offlineDevices.helper"),
      key: "offline",
      label: t("hr.attendance.live.kpi.offlineDevices"),
      tone: "warning" as const,
      value: String(kpis.offlineDevices),
    },
    {
      description: t("hr.attendance.live.kpi.pendingImports.helper"),
      key: "imports",
      label: t("hr.attendance.live.kpi.pendingImports"),
      tone: "warning" as const,
      value: String(kpis.pendingDeviceImports),
    },
  ];

  return (
    <StickyToolbar>
      <ProgressKpiCards kpis={cards} />
    </StickyToolbar>
  );
}
