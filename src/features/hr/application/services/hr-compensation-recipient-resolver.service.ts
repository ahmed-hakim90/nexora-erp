import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrCompensationIssuanceSelectionMode } from "../constants/hr-compensation-issuance.constants";
import type {
  HrCompensationIssuanceRecipientPreview,
  HrCompensationIssuanceSelectionFilters,
} from "../schemas/hr-compensation-issuance-batch.schema";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";

type EmployeeRow = Readonly<{
  branch_id: string | null;
  employee_number: string;
  full_name: string;
  id: string;
  status: string;
}>;

function uniqueIds(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).filter(Boolean))];
}

function intersectSets(base: Set<string>, allowed: Set<string>): Set<string> {
  if (allowed.size === 0) return base;
  return new Set([...base].filter((id) => allowed.has(id)));
}

export class HrCompensationRecipientResolverService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async resolveRecipients(input: Readonly<{
    asOfDate: string;
    branchId?: string | null;
    selectionFilters: HrCompensationIssuanceSelectionFilters;
    selectionMode: HrCompensationIssuanceSelectionMode;
  }>): Promise<readonly HrCompensationIssuanceRecipientPreview[]> {
    const filters = input.selectionFilters;
    const employmentStatuses = filters.employmentStatuses?.length ? filters.employmentStatuses : ["active"];

    if (input.selectionMode === "import") {
      const importLines = filters.importLines ?? [];
      if (importLines.length === 0) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Import selection requires import lines." });
      }

      const employeeIds = [...new Set(importLines.map((line) => line.employeeId))];
      const { data, error } = await this.supabase
        .from("hr_employees")
        .select("id, full_name, employee_number, status, branch_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .in("id", employeeIds)
        .in("status", employmentStatuses)
        .is("deleted_at", null);

      if (error) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve imported compensation recipients.", cause: error });
      }

      return this.hydrateRecipientPreviews((data ?? []) as EmployeeRow[], input.asOfDate);
    }

    let employeeQuery = this.supabase
      .from("hr_employees")
      .select("id, full_name, employee_number, status, branch_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("status", employmentStatuses)
      .is("deleted_at", null);

    const branchFilter = uniqueIds(filters.branchIds);
    if (input.selectionMode === "by_branch" && branchFilter.length > 0) {
      employeeQuery = employeeQuery.in("branch_id", branchFilter);
    } else if (input.branchId) {
      employeeQuery = employeeQuery.eq("branch_id", input.branchId);
    } else if (this.context.branchId) {
      employeeQuery = employeeQuery.eq("branch_id", this.context.branchId);
    }

    const manualEmployeeIds = uniqueIds(filters.employeeIds);
    if (input.selectionMode === "manual") {
      if (manualEmployeeIds.length === 0) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Manual selection requires at least one employee." });
      }
      employeeQuery = employeeQuery.in("id", manualEmployeeIds);
    } else if (manualEmployeeIds.length > 0) {
      employeeQuery = employeeQuery.in("id", manualEmployeeIds);
    }

    const { data, error } = await employeeQuery;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve compensation recipients.", cause: error });
    }

    let employees = (data ?? []) as EmployeeRow[];
    let allowedIds = new Set(employees.map((row) => String(row.id)));

    allowedIds = await this.filterByDepartmentAssignments({
      allowedIds,
      asOfDate: input.asOfDate,
      departmentIds: uniqueIds(filters.departmentIds),
      required: input.selectionMode === "by_department",
    });

    allowedIds = await this.applyPositionFilter({
      allowedIds,
      asOfDate: input.asOfDate,
      positionIds: uniqueIds(filters.positionIds),
      required: input.selectionMode === "by_position",
    });

    allowedIds = await this.filterByAssignmentType({
      allowedIds,
      asOfDate: input.asOfDate,
      assignmentType: "payroll_group",
      referenceIds: uniqueIds(filters.payrollGroupIds),
      required: false,
    });

    const excluded = new Set(uniqueIds(filters.excludeEmployeeIds));
    employees = employees.filter((row) => allowedIds.has(String(row.id)) && !excluded.has(String(row.id)));

    if (employees.length === 0) {
      return [];
    }

    return this.hydrateRecipientPreviews(employees, input.asOfDate);
  }

  private async hydrateRecipientPreviews(
    employees: readonly EmployeeRow[],
    asOfDate: string,
  ): Promise<readonly HrCompensationIssuanceRecipientPreview[]> {
    if (employees.length === 0) return [];

    const assignmentResolver = new HrAssignmentResolverService(this.supabase, this.context);
    const snapshots = await assignmentResolver.resolveManyEmployeeAssignments(
      employees.map((row) => String(row.id)),
      asOfDate,
    );

    return employees
      .map((row) => {
        const snapshot = snapshots.get(String(row.id));
        const position = snapshot?.position ?? null;
        return {
          branchId: row.branch_id ? String(row.branch_id) : null,
          employeeId: String(row.id),
          employeeLabel: `${row.full_name} (${row.employee_number})`,
          positionId: position?.referenceEntityId ?? null,
          positionLabel: position?.label ?? null,
        } satisfies HrCompensationIssuanceRecipientPreview;
      })
      .sort((left, right) => left.employeeLabel.localeCompare(right.employeeLabel));
  }

  private async filterByAssignmentType(input: Readonly<{
    allowedIds: Set<string>;
    asOfDate: string;
    assignmentType: string;
    referenceIds: string[];
    required: boolean;
  }>): Promise<Set<string>> {
    if (input.referenceIds.length === 0) {
      return input.required ? new Set() : input.allowedIds;
    }

    const { data, error } = await this.supabase
      .from("hr_assignments")
      .select("employee_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("assignment_type", input.assignmentType)
      .in("reference_entity_id", input.referenceIds)
      .in("assignment_status", ["active", "planned"])
      .lte("effective_from", input.asOfDate)
      .or(`effective_to.is.null,effective_to.gte.${input.asOfDate}`)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not filter recipients by ${input.assignmentType}.`,
        cause: error,
      });
    }

    const matched = new Set((data ?? []).map((row) => String(row.employee_id)));
    return intersectSets(input.allowedIds, matched);
  }

  private async applyPositionFilter(input: Readonly<{
    allowedIds: Set<string>;
    asOfDate: string;
    positionIds: string[];
    required: boolean;
  }>): Promise<Set<string>> {
    if (input.positionIds.length === 0) {
      return input.required ? new Set() : input.allowedIds;
    }

    const { data, error } = await this.supabase
      .from("hr_assignments")
      .select("employee_id, reference_entity_id, assignment_scope, assignment_status, effective_from, effective_to, priority")
      .eq("tenant_id", this.context.tenantId)
      .eq("assignment_type", "position")
      .in("reference_entity_id", input.positionIds)
      .in("assignment_status", ["active", "planned"])
      .lte("effective_from", input.asOfDate)
      .or(`effective_to.is.null,effective_to.gte.${input.asOfDate}`)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not filter recipients by position.", cause: error });
    }

    const matched = new Set((data ?? []).map((row) => String(row.employee_id)));
    return intersectSets(input.allowedIds, matched);
  }

  async filterByDepartmentAssignments(input: Readonly<{
    allowedIds: Set<string>;
    asOfDate: string;
    departmentIds: string[];
    required: boolean;
  }>): Promise<Set<string>> {
    return this.filterByAssignmentType({
      allowedIds: input.allowedIds,
      asOfDate: input.asOfDate,
      assignmentType: "department",
      referenceIds: input.departmentIds,
      required: input.required,
    });
  }
}
