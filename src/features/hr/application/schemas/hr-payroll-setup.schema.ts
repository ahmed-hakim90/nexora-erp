import { z } from "zod";

const upperCode = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.toUpperCase());

export const hrPayrollCalendarCreateSchema = z.object({
  code: upperCode,
  effectiveFrom: z.string().min(1),
  frequency: z.enum(["monthly", "biweekly", "weekly", "daily", "custom", "semi_monthly"]),
  name: z.string().trim().min(1),
  status: z.enum(["draft", "active", "inactive"]).default("active"),
});

export const hrPayrollCalendarUpdateSchema = hrPayrollCalendarCreateSchema.extend({
  calendarId: z.string().uuid(),
});

export const hrPayrollCalendarArchiveSchema = z.object({
  calendarId: z.string().uuid(),
});

export const hrPayrollGroupCreateSchema = z.object({
  code: upperCode,
  name: z.string().trim().min(1),
  payrollCalendarId: z.string().uuid(),
  payrollPolicyVersionId: z.string().uuid(),
  status: z.enum(["draft", "active", "inactive"]).default("active"),
});

export const hrPayrollGroupUpdateSchema = hrPayrollGroupCreateSchema.extend({
  groupId: z.string().uuid(),
});

export const hrPayrollGroupArchiveSchema = z.object({
  groupId: z.string().uuid(),
});

export const hrPayrollPeriodCreateSchema = z.object({
  endDate: z.string().min(1),
  paymentDate: z.string().min(1).optional(),
  payrollCalendarId: z.string().uuid(),
  periodCode: z.string().trim().min(1),
  periodName: z.string().trim().min(1),
  startDate: z.string().min(1),
});

export const hrPayrollPeriodUpdateSchema = hrPayrollPeriodCreateSchema.extend({
  periodId: z.string().uuid(),
});

export const hrPayrollPeriodArchiveSchema = z.object({
  periodId: z.string().uuid(),
});

export type HrPayrollCalendarCreateInput = z.infer<typeof hrPayrollCalendarCreateSchema>;
export type HrPayrollCalendarUpdateInput = z.infer<typeof hrPayrollCalendarUpdateSchema>;
export type HrPayrollGroupCreateInput = z.infer<typeof hrPayrollGroupCreateSchema>;
export type HrPayrollGroupUpdateInput = z.infer<typeof hrPayrollGroupUpdateSchema>;
export type HrPayrollPeriodCreateInput = z.infer<typeof hrPayrollPeriodCreateSchema>;
export type HrPayrollPeriodUpdateInput = z.infer<typeof hrPayrollPeriodUpdateSchema>;
