import { z } from "zod";

export const hrAttendanceCodeSchema = z
  .string()
  .max(50, "Attendance code must be 50 characters or fewer.")
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

export const hrEmployeeListQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  contractStatus: z.string().optional(),
  cursor: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  edit: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  payrollGroupId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  wizard: z.enum(["1"]).optional(),
});

export const hrEmployeeNumberSchema = z
  .string()
  .min(1, "Employee number is required.")
  .transform((value) => value.trim().toUpperCase());

export const hrEmployeePersonalSchema = z.object({
  birthDate: z.string().optional(),
  employeeNumber: hrEmployeeNumberSchema.optional(),
  fullName: z.string().min(1),
  gender: z.enum(["female", "male", "other", "undisclosed"]).optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "undisclosed"]).optional(),
  nationalId: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
});

export const hrEmployeeContactSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  phone: z.string().optional(),
});

export const hrEmployeeEmploymentSchema = z.object({
  attendanceCode: hrAttendanceCodeSchema,
  branchId: z.string().uuid().optional(),
  employmentType: z.enum(["full-time", "part-time", "temporary", "contractor", "intern", "seasonal", "consultant"]),
  workLocationId: z.string().uuid().optional(),
});

export const hrEmployeeWizardSchema = hrEmployeePersonalSchema
  .merge(hrEmployeeContactSchema)
  .merge(hrEmployeeEmploymentSchema)
  .extend({
    employeeNumber: hrEmployeeNumberSchema,
    contractNumber: z.string().optional(),
    contractStartsOn: z.string().optional(),
    contractType: z.string().optional(),
    departmentId: z.string().uuid(),
    effectiveFrom: z.string().min(1),
    managerEmployeeId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
    probationPeriodDays: z.coerce.number().int().min(0).optional(),
    salaryPackageRef: z.string().uuid().optional(),
  });

export type HrEmployeeWizardInput = z.infer<typeof hrEmployeeWizardSchema>;

export const hrEmployeeQuickEditSchema = hrEmployeePersonalSchema.merge(hrEmployeeContactSchema).extend({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  attendanceCode: hrAttendanceCodeSchema,
  city: z.string().optional(),
  employeeId: z.string().uuid(),
  employeeNumber: hrEmployeeNumberSchema.optional(),
});
