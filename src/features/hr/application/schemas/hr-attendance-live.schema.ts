import { z } from "zod";

import { HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS, HR_ATTENDANCE_LIVE_STATUSES } from "../constants/hr-attendance-live.constants";

export const hrAttendanceLiveListQuerySchema = z.object({
  attendanceStatus: z.enum(HR_ATTENDANCE_LIVE_STATUSES).optional(),
  branchId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  refreshIntervalSeconds: z.coerce
    .number()
    .int()
    .refine((value) => (HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS as readonly number[]).includes(value), {
      message: "Invalid refresh interval.",
    })
    .optional(),
  search: z.string().trim().max(120).optional(),
  shiftId: z.string().uuid().optional(),
});

export const hrAttendanceLiveSupervisorActionSchema = z.object({
  action: z.enum([
    "approve_missing_punch",
    "ignore_warning",
    "manual_correction",
    "send_notification",
  ]),
  employeeId: z.string().uuid(),
  exceptionId: z.string().uuid().optional(),
  reason: z.string().trim().min(3).max(500),
});

export type HrAttendanceLiveListQuery = z.infer<typeof hrAttendanceLiveListQuerySchema>;
export type HrAttendanceLiveSupervisorActionInput = z.infer<typeof hrAttendanceLiveSupervisorActionSchema>;
