import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const hrLateEarlyPolicyCreateSchema = z.object({
  code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  dailyLimitMinutes: z.coerce.number().int().positive().optional(),
  deductionMethod: z.enum(["minutes", "half_day", "full_day", "none"]).optional(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  earlyLeaveThresholdMinutes: z.coerce.number().int().min(0).default(1),
  graceMinutes: z.coerce.number().int().min(0).default(15),
  lateThresholdMinutes: z.coerce.number().int().min(0).default(1),
  monthlyLimitMinutes: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1),
  weeklyLimitMinutes: z.coerce.number().int().positive().optional(),
});

export const hrLateEarlyPolicyAssignmentCreateSchema = z.object({
  assignmentScope: z.enum(["company", "branch", "department", "shift", "contract", "employee"]),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.optional(),
  policyId: z.string().uuid(),
  referenceEntityId: z.string().uuid().optional(),
});

export const hrLateEarlyViolationApproveSchema = z.object({
  reason: z.string().optional(),
  violationId: z.string().uuid(),
});

export const hrLateEarlyViolationRejectSchema = z.object({
  reason: z.string().min(3),
  violationId: z.string().uuid(),
});

export const hrLateEarlyViolationCancelSchema = z.object({
  reason: z.string().min(3),
  violationId: z.string().uuid(),
});

export const hrLateEarlyViolationOverrideSchema = z.object({
  deductionMinutes: z.coerce.number().int().min(0),
  earlyLeaveMinutes: z.coerce.number().int().min(0),
  lateMinutes: z.coerce.number().int().min(0),
  reason: z.string().min(3),
  status: z.enum(["submitted", "warning_only", "approved"]).optional(),
  violationId: z.string().uuid(),
});

export type HrLateEarlyPolicyCreateInput = z.infer<typeof hrLateEarlyPolicyCreateSchema>;
export type HrLateEarlyPolicyAssignmentCreateInput = z.infer<typeof hrLateEarlyPolicyAssignmentCreateSchema>;
export type HrLateEarlyViolationOverrideInput = z.infer<typeof hrLateEarlyViolationOverrideSchema>;
