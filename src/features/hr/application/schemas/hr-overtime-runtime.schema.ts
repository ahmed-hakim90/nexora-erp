import { z } from "zod";

import { HR_OVERTIME_TYPES } from "../constants/hr-overtime-runtime.constants";

const overtimeTypeSchema = z.enum(HR_OVERTIME_TYPES);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const hrOvertimeCreateSchema = z.object({
  attachmentRef: z.string().optional(),
  attendanceDayId: z.string().uuid().optional(),
  compensationType: z.enum(["pay", "time_off", "mixed"]).default("pay"),
  costCenter: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  employeeId: z.string().uuid(),
  endTime: z.string().optional(),
  hours: z.coerce.number().positive().optional(),
  overtimeType: overtimeTypeSchema.default("normal"),
  payrollEligible: z.coerce.boolean().default(true),
  priority: z.coerce.number().min(0).max(100).default(50),
  projectRef: z.string().optional(),
  rateMultiplier: z.coerce.number().positive().default(1.5),
  reason: z.string().default(""),
  shiftId: z.string().uuid().optional(),
  startTime: z.string().optional(),
  workDate: dateSchema,
});

export const hrOvertimeSubmitSchema = z.object({
  overtimeRequestId: z.string().uuid(),
});

export const hrOvertimeApproveSchema = z.object({
  overtimeRequestId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrOvertimeRejectSchema = z.object({
  overtimeRequestId: z.string().uuid(),
  reason: z.string().min(3),
});

export const hrOvertimeCancelSchema = z.object({
  overtimeRequestId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrOvertimeWithdrawSchema = z.object({
  overtimeRequestId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrOvertimeReturnSchema = z.object({
  overtimeRequestId: z.string().uuid(),
  reason: z.string().min(3),
});

export const hrOvertimeCandidateActionSchema = z.object({
  action: z.enum(["approve", "reject", "ignore", "convert"]),
  candidateId: z.string().uuid(),
  reason: z.string().optional(),
});

export const hrOvertimePolicyCreateSchema = z.object({
  code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  dailyLimitMinutes: z.coerce.number().int().positive().optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  monthlyLimitMinutes: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1),
  overtimeType: overtimeTypeSchema.default("normal"),
  rateMultiplier: z.coerce.number().positive().default(1.5),
  weeklyLimitMinutes: z.coerce.number().int().positive().optional(),
});

export type HrOvertimeCreateInput = z.infer<typeof hrOvertimeCreateSchema>;
export type HrOvertimeCandidateActionInput = z.infer<typeof hrOvertimeCandidateActionSchema>;
export type HrOvertimePolicyCreateInput = z.infer<typeof hrOvertimePolicyCreateSchema>;
