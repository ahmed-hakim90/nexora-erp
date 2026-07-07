import { z } from "zod";

export const hrAttendanceReviewActionSchema = z.object({
  exceptionId: z.string().uuid().optional(),
  queueItemId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
}).refine((value) => Boolean(value.queueItemId || value.exceptionId), {
  message: "Queue item or exception id is required.",
});

export const hrAttendanceMissingPunchSchema = z.object({
  employeeId: z.string().uuid(),
  exceptionId: z.string().uuid().optional(),
  punchTime: z.string().min(1),
  punchType: z.enum(["in", "out"]),
  queueItemId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const hrAttendanceDayApproveSchema = z.object({
  attendanceDayId: z.string().uuid(),
});

export type HrAttendanceReviewActionInput = z.infer<typeof hrAttendanceReviewActionSchema>;
export type HrAttendanceMissingPunchInput = z.infer<typeof hrAttendanceMissingPunchSchema>;
export type HrAttendanceDayApproveInput = z.infer<typeof hrAttendanceDayApproveSchema>;
