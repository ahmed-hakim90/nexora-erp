import { z } from "zod";

const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const hrAttendanceClosingCreateSchema = z.object({
  branchId: uuid.optional(),
  departmentId: uuid.optional(),
  payrollGroupId: uuid.optional(),
  periodEnd: dateString,
  periodStart: dateString,
  scope: z.enum(["weekly", "monthly", "department", "branch", "company"]),
});

export const hrAttendanceExportFilterSchema = z.object({
  branchId: uuid.optional(),
  departmentId: uuid.optional(),
  employeeId: uuid.optional(),
  payrollGroupId: uuid.optional(),
  periodEnd: dateString,
  periodStart: dateString,
});

export const hrAttendanceExportExecuteSchema = hrAttendanceExportFilterSchema.extend({
  closingId: uuid.optional(),
  confirmed: z.boolean().optional(),
});

export const hrAttendanceReopenSchema = z.object({
  closingId: uuid,
  reason: z.string().trim().min(10, "Reopen reason must be at least 10 characters."),
});

export const hrAttendanceLockClosingSchema = z.object({
  closingId: uuid,
});

export const hrAttendanceExportBatchActionSchema = z.object({
  batchId: uuid,
});

export type HrAttendanceClosingCreateInput = z.infer<typeof hrAttendanceClosingCreateSchema>;
export type HrAttendanceExportFilterInput = z.infer<typeof hrAttendanceExportFilterSchema>;
export type HrAttendanceExportExecuteInput = z.infer<typeof hrAttendanceExportExecuteSchema>;
export type HrAttendanceReopenInput = z.infer<typeof hrAttendanceReopenSchema>;
