import { z } from "zod";

export const hrLeaveCreateSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  notes: z.string().optional(),
});

export const hrLeaveBalanceAdjustSchema = z.object({
  balanceId: z.string().uuid(),
  availableQuantity: z.coerce.number().min(0),
});

export const hrLeavePolicyCreateSchema = z.object({
  annualEntitlement: z.coerce.number().min(0),
  carryForwardAllowed: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("off"), z.literal("false"), z.literal("0")])
    .optional()
    .transform((value) => value === "on" || value === "true" || value === "1"),
  entitlementUnit: z.enum(["days", "hours"]).default("days"),
  leaveTypeId: z.string().uuid(),
  policyRules: z.record(z.string(), z.unknown()).optional(),
});

export const hrLeavePolicyStatusSchema = z.object({
  policyId: z.string().uuid(),
});

export type HrLeaveCreateInput = z.infer<typeof hrLeaveCreateSchema>;
export type HrLeavePolicyCreateInput = z.infer<typeof hrLeavePolicyCreateSchema>;
