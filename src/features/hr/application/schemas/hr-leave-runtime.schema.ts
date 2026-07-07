import { z } from "zod";

export const hrLeaveCarryForwardPreviewSchema = z.object({
  scope: z.enum(["company_closing", "policy_closing", "employee_anniversary", "manual"]),
  sourcePeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const hrLeaveCarryForwardExecuteSchema = hrLeaveCarryForwardPreviewSchema.extend({
  runId: z.string().uuid(),
});

export const hrLeaveEncashmentCreateSchema = z.object({
  employeeId: z.string().uuid(),
  encashmentKind: z.enum(["partial", "full"]).default("partial"),
  leaveTypeId: z.string().uuid(),
  maxPercentage: z.coerce.number().min(0).max(100).optional(),
  requestedQuantity: z.coerce.number().positive(),
});

export const hrLeaveEncashmentActionSchema = z.object({
  encashmentId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrLeaveWithdrawSchema = z.object({
  leaveRequestId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrLeaveReturnSchema = z.object({
  leaveRequestId: z.string().uuid(),
  reason: z.string().min(3),
});

export const hrLeaveHolidayCreateSchema = z.object({
  holidayCalendarId: z.string().uuid(),
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holidayType: z.enum(["national", "company", "branch", "factory_shutdown", "emergency_closure", "half_day", "recurring"]),
  name: z.string().trim().min(1),
});

export type HrLeaveCarryForwardPreviewInput = z.infer<typeof hrLeaveCarryForwardPreviewSchema>;
export type HrLeaveEncashmentCreateInput = z.infer<typeof hrLeaveEncashmentCreateSchema>;
