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

export const hrContractCreateSchema = z.object({
  contractNumber: z.string().min(1),
  contractType: z.string().min(1),
  employeeId: z.string().uuid(),
  endsOn: z.string().optional(),
  startsOn: z.string().min(1),
});
