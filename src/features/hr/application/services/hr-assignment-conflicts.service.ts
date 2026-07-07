import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrAssignmentConflict } from "../../application/types/hr-ui.types";
import type { HrAssignmentCreateInput } from "../../application/schemas/hr-assignments.schema";

type AssignmentRow = Readonly<Record<string, unknown>>;

function rangesOverlap(
  leftFrom: string,
  leftTo: string | null | undefined,
  rightFrom: string,
  rightTo: string | null | undefined,
): boolean {
  const leftEnd = leftTo ?? "9999-12-31";
  const rightEnd = rightTo ?? "9999-12-31";
  return leftFrom <= rightEnd && rightFrom <= leftEnd;
}

export class HrAssignmentConflictService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async detectConflicts(input: HrAssignmentCreateInput): Promise<readonly HrAssignmentConflict[]> {
    const conflicts: HrAssignmentConflict[] = [];

    const { data: existing, error } = await this.supabase
      .from("hr_assignments")
      .select("id, assignment_type, assignment_scope, effective_from, effective_to, reference_entity_id, reference_entity_type, company_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("assignment_type", input.assignmentType)
      .in("assignment_status", ["active", "planned"])
      .is("deleted_at", null);

    if (error) return [{ code: "lookup_failed", message: "Could not validate assignment conflicts.", severity: "error" }];

    const overlapping = ((existing ?? []) as AssignmentRow[]).filter((row) =>
      rangesOverlap(String(row.effective_from), row.effective_to ? String(row.effective_to) : null, input.effectiveFrom, input.effectiveTo),
    );

    if (input.assignmentScope === "primary" && input.assignmentType === "position") {
      const primaryPosition = overlapping.find((row) => String(row.assignment_scope) === "primary");
      if (primaryPosition) {
        conflicts.push({
          code: "primary_position_exists",
          message: "Employee already has an active primary position in this period.",
          severity: "error",
        });
      }
    }

    if (overlapping.some((row) => String(row.assignment_scope) === input.assignmentScope)) {
      conflicts.push({
        code: "scope_overlap",
        message: "A future or active assignment with the same scope overlaps this period.",
        severity: "warning",
      });
    }

    const targetCompanyMismatch = await this.validateTargetCompany(input);
    if (targetCompanyMismatch) conflicts.push(targetCompanyMismatch);

    const invalidRelationship = await this.validateDepartmentPositionRelationship(input);
    if (invalidRelationship) conflicts.push(invalidRelationship);

    return conflicts;
  }

  private async validateTargetCompany(input: HrAssignmentCreateInput): Promise<HrAssignmentConflict | null> {
    const tableByType: Record<string, string> = {
      department: "hr_org_units",
      manager: "hr_employees",
      organization_unit: "hr_org_units",
      position: "hr_positions",
      section: "hr_org_units",
      team: "hr_org_units",
      work_location: "hr_work_locations",
    };
    const table = tableByType[input.assignmentType];
    if (!table) return null;

    const { data, error } = await this.supabase
      .from(table)
      .select("company_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.referenceEntityId)
      .maybeSingle();

    if (error || !data) return null;
    if (String(data.company_id) !== this.context.companyId) {
      return {
        code: "target_company_mismatch",
        message: "Target belongs to another company.",
        severity: "error",
      };
    }
    return null;
  }

  private async validateDepartmentPositionRelationship(input: HrAssignmentCreateInput): Promise<HrAssignmentConflict | null> {
    if (input.assignmentType !== "position" || input.referenceEntityType !== "hr_positions") return null;

    const { data: position, error } = await this.supabase
      .from("hr_positions")
      .select("department_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.referenceEntityId)
      .maybeSingle();

    if (error || !position?.department_id) return null;

    const { data: departmentAssignment } = await this.supabase
      .from("hr_assignments")
      .select("reference_entity_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("assignment_type", "department")
      .eq("assignment_scope", "primary")
      .in("assignment_status", ["active", "planned"])
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (!departmentAssignment?.reference_entity_id) return null;
    if (String(departmentAssignment.reference_entity_id) !== String(position.department_id)) {
      return {
        code: "invalid_department_position_relationship",
        message: "Selected position does not belong to the employee's current department assignment.",
        severity: "warning",
      };
    }

    return null;
  }
}
