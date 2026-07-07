import { z } from "zod";

const assignmentTypes = [
  "position",
  "department",
  "section",
  "team",
  "organization_unit",
  "manager",
  "cost_center",
  "work_location",
  "shift_schedule",
  "payroll_group",
  "holiday_calendar",
  "capability_pack",
  "template_version",
  "reporting_structure",
  "production_line",
  "machine_group",
  "project",
] as const;

const assignmentScopes = ["primary", "temporary", "acting", "delegated", "project", "emergency"] as const;

export const hrAssignmentListQuerySchema = z.object({
  assignmentScope: z.enum(assignmentScopes).optional(),
  assignmentType: z.enum(assignmentTypes).optional(),
  create: z.enum(["1"]).optional(),
  cursor: z.string().optional(),
  edit: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.string().optional(),
});

export const hrAssignmentCreateSchema = z.object({
  assignmentScope: z.enum(assignmentScopes).default("primary"),
  assignmentType: z.enum(assignmentTypes),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  employeeId: z.string().uuid(),
  employmentProfileId: z.string().uuid(),
  priority: z.coerce.number().int().min(0).default(100),
  reason: z.string().optional(),
  referenceEntityId: z.string().uuid(),
  referenceEntityType: z.string().min(1),
});

export const hrAssignmentUpdateSchema = z.object({
  assignmentId: z.string().uuid(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  priority: z.coerce.number().int().min(1).default(100),
  reason: z.string().optional(),
});

export const hrAssignmentEndSchema = z.object({
  assignmentId: z.string().uuid(),
  effectiveTo: z.string().min(1),
  reason: z.string().optional(),
});

export type HrAssignmentCreateInput = z.infer<typeof hrAssignmentCreateSchema>;
