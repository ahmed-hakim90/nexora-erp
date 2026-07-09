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
  unassigned: z.enum(["1"]).optional(),
  wizard: z.enum(["1"]).optional(),
});

export const hrEmployeeNumberSchema = z
  .string()
  .min(1, "Employee number is required.")
  .max(50, "Employee code must be 50 characters or fewer.")
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => value.length > 0 && value.length <= 50, {
    message: "Employee code must be between 1 and 50 characters.",
  });

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

const wizardBooleanField = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("1"), z.literal("false"), z.literal(""), z.undefined()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true" || value === "1");

export const hrEmployeeWizardSchema = hrEmployeePersonalSchema
  .merge(hrEmployeeContactSchema)
  .merge(hrEmployeeEmploymentSchema)
  .extend({
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankIsPrimary: wizardBooleanField,
    bankName: z.string().optional(),
    contractNumber: z.string().optional(),
    contractStartsOn: z.string().optional(),
    contractTypeVersionId: z.string().uuid().optional(),
    departmentId: z.string().uuid(),
    effectiveFrom: z.string().min(1),
    iban: z.string().optional(),
    managerEmployeeId: z.string().uuid().optional(),
    payrollGroupId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
    probationPeriodDays: z.coerce.number().int().min(0).optional(),
    salaryPackageRef: z.string().uuid().optional(),
    salaryPackageVersionId: z.string().uuid().optional(),
    shiftApplyWorkingDays: wizardBooleanField,
    shiftDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    shiftId: z.string().uuid().optional(),
    employeeNumber: hrEmployeeNumberSchema,
  })
  .superRefine((value, ctx) => {
    if (value.contractTypeVersionId && !value.contractStartsOn?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contract start date is required when a contract type is selected.",
        path: ["contractStartsOn"],
      });
    }

    const hasBankInput = Boolean(value.bankName?.trim() || value.accountNumber?.trim() || value.accountHolderName?.trim());
    if (hasBankInput) {
      if (!value.bankName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bank name is required.", path: ["bankName"] });
      }
      if (!value.accountHolderName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account holder name is required.", path: ["accountHolderName"] });
      }
      if (!value.accountNumber?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account number is required.", path: ["accountNumber"] });
      }
    }

    if (value.shiftId && value.shiftApplyWorkingDays === false && value.shiftDayOfWeek === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a day of week when not applying the shift to all working days.",
        path: ["shiftDayOfWeek"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    salaryPackageVersionId: value.salaryPackageVersionId ?? value.salaryPackageRef ?? undefined,
    shiftApplyWorkingDays: value.shiftId ? value.shiftApplyWorkingDays !== false : false,
  }));

export type HrEmployeeWizardInput = z.infer<typeof hrEmployeeWizardSchema>;

export const hrEmployeeQuickEditSchema = hrEmployeePersonalSchema.merge(hrEmployeeContactSchema).extend({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  attendanceCode: hrAttendanceCodeSchema,
  city: z.string().optional(),
  employeeId: z.string().uuid(),
  employeeNumber: hrEmployeeNumberSchema.optional(),
});
