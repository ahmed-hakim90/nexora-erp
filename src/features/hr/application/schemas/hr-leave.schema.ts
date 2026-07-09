import { z } from "zod";

const checkboxBool = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("off"), z.literal("false"), z.literal("0"), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true" || value === "1");

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

export const hrLeaveTypeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  impactsPayroll: checkboxBool,
  name: z.string().trim().min(1),
  paid: checkboxBool,
  requiresApproval: checkboxBool,
  status: z.enum(["draft", "active", "inactive"]).default("active"),
});

export const hrLeaveTypeUpdateSchema = hrLeaveTypeCreateSchema.extend({
  leaveTypeId: z.string().uuid(),
});

export const hrLeaveTypeArchiveSchema = z.object({
  leaveTypeId: z.string().uuid(),
});

export const hrLeavePolicyCreateSchema = z.object({
  annualEntitlement: z.coerce.number().min(0),
  carryForwardAllowed: checkboxBool,
  entitlementUnit: z.enum(["days", "hours"]).default("days"),
  leaveTypeId: z.string().uuid(),
  policyRules: z.record(z.string(), z.unknown()).optional(),
});

export const hrLeavePolicyUpdateSchema = z.object({
  annualEntitlement: z.coerce.number().min(0),
  carryForwardAllowed: checkboxBool,
  entitlementUnit: z.enum(["days", "hours"]).default("days"),
  policyId: z.string().uuid(),
});

export const hrLeavePolicyStatusSchema = z.object({
  policyId: z.string().uuid(),
});

export type HrLeaveCreateInput = z.infer<typeof hrLeaveCreateSchema>;
export type HrLeaveTypeCreateInput = z.infer<typeof hrLeaveTypeCreateSchema>;
export type HrLeaveTypeUpdateInput = z.infer<typeof hrLeaveTypeUpdateSchema>;
export type HrLeavePolicyCreateInput = z.infer<typeof hrLeavePolicyCreateSchema>;
export type HrLeavePolicyUpdateInput = z.infer<typeof hrLeavePolicyUpdateSchema>;
