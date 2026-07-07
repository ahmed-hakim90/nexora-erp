"use client";

import { formatHrStatusLabel, type HrAttendanceLiveStatus } from "@/features/hr/public-api";

const STATUS_TONES: Record<HrAttendanceLiveStatus, string> = {
  absent: "bg-red-500/15 text-red-700 dark:text-red-300",
  business_trip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  checked_out: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  holiday: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  late: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  leave: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  missing_punch: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  on_break: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300",
  overtime: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  remote: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

export function HrAttendanceLiveStatusBadge({ status }: Readonly<{ status: HrAttendanceLiveStatus }>) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_TONES[status]}`}>
      {formatHrStatusLabel(status)}
    </span>
  );
}
