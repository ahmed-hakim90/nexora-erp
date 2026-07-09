import { z } from "zod";

export const hrCompensationComponentSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  name: z.string().min(1),
  categoryKey: z.string().default("basic_salary"),
  defaultAmount: z.coerce.number().optional(),
});

export const hrSalaryPackageSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  name: z.string().min(1),
  effectiveFrom: z.string().min(1),
});

export const hrEmployeeSalaryAssignmentSchema = z.object({
  employeeId: z.string().uuid(),
  salaryPackageVersionId: z.string().uuid(),
});

export const hrSalaryPackageLineSchema = z.object({
  amount: z.coerce.number().min(0),
  componentVersionId: z.string().uuid(),
  salaryPackageVersionId: z.string().uuid(),
});

export const hrSalaryPackageLineUpdateSchema = z.object({
  amount: z.coerce.number().min(0),
  lineId: z.string().uuid(),
});

export const hrSalaryPackageLineArchiveSchema = z.object({
  lineId: z.string().uuid(),
});

export const hrEmployeeBasicSalaryOverrideSchema = z.object({
  basicSalary: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().min(0).nullable(),
  ),
  effectiveFrom: z.string().min(1).optional(),
  employeeId: z.string().uuid(),
  reason: z.string().trim().optional(),
});

export const hrEmployeeBasicSalaryClearSchema = z.object({
  employeeId: z.string().uuid(),
});

export type HrSalaryPackageLineInput = z.infer<typeof hrSalaryPackageLineSchema>;
export type HrSalaryPackageLineUpdateInput = z.infer<typeof hrSalaryPackageLineUpdateSchema>;
export type HrEmployeeBasicSalaryOverrideInput = z.infer<typeof hrEmployeeBasicSalaryOverrideSchema>;
