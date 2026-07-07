"use client";

import type { HrAttendanceLiveKpis } from "@/features/hr/public-api";
import { ProgressKpiCards, StickyToolbar } from "@/shared/ui";

export function HrAttendanceLiveKpiHeader({ kpis }: Readonly<{ kpis: HrAttendanceLiveKpis }>) {
  const cards = [
    { description: "Employees currently present", key: "present", label: "Employees Present", tone: "success" as const, value: String(kpis.employeesPresent) },
    { description: "Checked in today", key: "checked-in", label: "Checked In Today", tone: "accent" as const, value: String(kpis.checkedInToday) },
    { description: "Missing check in", key: "missing-in", label: "Missing Check In", tone: "warning" as const, value: String(kpis.missingCheckIn) },
    { description: "Missing check out", key: "missing-out", label: "Missing Check Out", tone: "warning" as const, value: String(kpis.missingCheckOut) },
    { description: "Late arrivals today", key: "late", label: "Late Today", tone: "warning" as const, value: String(kpis.lateToday) },
    { description: "Early leave cases", key: "early", label: "Early Leave", tone: "warning" as const, value: String(kpis.earlyLeave) },
    { description: "Overtime running", key: "ot", label: "Overtime Running", tone: "accent" as const, value: String(kpis.overtimeRunning) },
    { description: "Absent employees", key: "absent", label: "Absent", tone: "warning" as const, value: String(kpis.absent) },
    { description: "Currently working", key: "working", label: "Currently Working", tone: "success" as const, value: String(kpis.currentlyWorking) },
    { description: "Shift coverage", key: "coverage", label: "Shift Coverage %", tone: "accent" as const, value: `${kpis.currentShiftCoveragePct}%` },
    { description: "Online devices", key: "devices", label: "Active Devices", tone: "success" as const, value: String(kpis.activeDevices) },
    { description: "Offline devices", key: "offline", label: "Offline Devices", tone: "warning" as const, value: String(kpis.offlineDevices) },
    { description: "Pending device imports", key: "imports", label: "Pending Imports", tone: "warning" as const, value: String(kpis.pendingDeviceImports) },
  ];

  return (
    <StickyToolbar>
      <ProgressKpiCards kpis={cards} />
    </StickyToolbar>
  );
}
