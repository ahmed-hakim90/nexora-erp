import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrEmployeeAssignmentSnapshot, HrResolvedAssignment } from "../../application/types/hr-ui.types";
import { formatHrDisplayLabel } from "../../application/utils/hr-display";

type AssignmentRow = Readonly<Record<string, unknown>>;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickBestAssignment(rows: readonly AssignmentRow[]): AssignmentRow | null {
  if (rows.length === 0) return null;
  const scopeOrder = ["emergency", "project", "delegated", "acting", "temporary", "primary"];
  return [...rows].sort((left, right) => {
    const leftScope = scopeOrder.indexOf(String(left.assignment_scope));
    const rightScope = scopeOrder.indexOf(String(right.assignment_scope));
    if (leftScope !== rightScope) return leftScope - rightScope;
    const leftPriority = Number(left.priority ?? 100);
    const rightPriority = Number(right.priority ?? 100);
    return leftPriority - rightPriority;
  })[0] ?? null;
}

function assertNoError(result: { error: unknown | null }, message: string): asserts result is { data: unknown; error: null } {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

export class HrAssignmentResolverService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async resolveEmployeeAssignments(
    employeeId: string,
    asOfDate: string = todayIsoDate(),
  ): Promise<HrEmployeeAssignmentSnapshot> {
    const { data: assignments, error } = await this.supabase
      .from("hr_assignments")
      .select(
        "id, assignment_type, assignment_scope, assignment_status, reference_entity_id, reference_entity_type, effective_from, effective_to, priority",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .in("assignment_status", ["active", "planned"])
      .lte("effective_from", asOfDate)
      .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
      .is("deleted_at", null)
      .order("priority", { ascending: true });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve employee assignments.", cause: error });
    }

    const rows = (assignments ?? []) as AssignmentRow[];
    const byType = new Map<string, AssignmentRow[]>();
    for (const row of rows) {
      const type = String(row.assignment_type);
      const bucket = byType.get(type) ?? [];
      bucket.push(row);
      byType.set(type, bucket);
    }

    const labels = await this.hydrateAssignmentLabels(rows);

    const toResolved = (type: string): HrResolvedAssignment | null => {
      const selected = pickBestAssignment(byType.get(type) ?? []);
      if (!selected) return null;
      const id = String(selected.reference_entity_id);
      const hydrated = labels.get(id);
      return {
        assignmentId: String(selected.id),
        assignmentScope: String(selected.assignment_scope),
        assignmentStatus: String(selected.assignment_status),
        assignmentType: type,
        effectiveFrom: String(selected.effective_from),
        effectiveTo: selected.effective_to ? String(selected.effective_to) : null,
        label: hydrated?.label ?? "Assigned record",
        referenceEntityId: id,
        referenceEntityType: String(selected.reference_entity_type),
        subtitle: hydrated?.subtitle,
      };
    };

    const payrollGroup = toResolved("payroll_group");

    return {
      asOfDate,
      branchLabel: null,
      costCenter: toResolved("cost_center"),
      department: toResolved("department"),
      employeeId,
      grade: toResolved("capability_pack"),
      manager: toResolved("manager"),
      payrollGroup,
      payrollGroupLabel: payrollGroup?.label ?? null,
      position: toResolved("position"),
      section: toResolved("section"),
      shift: toResolved("shift_schedule"),
      team: toResolved("team"),
      workLocation: toResolved("work_location"),
    };
  }

  async resolveManyEmployeeAssignments(
    employeeIds: readonly string[],
    asOfDate: string = todayIsoDate(),
  ): Promise<ReadonlyMap<string, HrEmployeeAssignmentSnapshot>> {
    if (employeeIds.length === 0) return new Map();

    const { data: assignments, error } = await this.supabase
      .from("hr_assignments")
      .select(
        "id, employee_id, assignment_type, assignment_scope, assignment_status, reference_entity_id, reference_entity_type, effective_from, effective_to, priority",
      )
      .eq("tenant_id", this.context.tenantId)
      .in("employee_id", [...new Set(employeeIds)])
      .in("assignment_status", ["active", "planned"])
      .lte("effective_from", asOfDate)
      .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve employee assignments.", cause: error });
    }

    const labels = await this.hydrateAssignmentLabels((assignments ?? []) as AssignmentRow[]);
    const grouped = new Map<string, Map<string, AssignmentRow[]>>();

    for (const row of (assignments ?? []) as AssignmentRow[]) {
      const employeeId = String(row.employee_id);
      const type = String(row.assignment_type);
      const employeeBucket = grouped.get(employeeId) ?? new Map<string, AssignmentRow[]>();
      const typeBucket = employeeBucket.get(type) ?? [];
      typeBucket.push(row);
      employeeBucket.set(type, typeBucket);
      grouped.set(employeeId, employeeBucket);
    }

    const result = new Map<string, HrEmployeeAssignmentSnapshot>();
    for (const employeeId of employeeIds) {
      const byType = grouped.get(employeeId) ?? new Map();
      const toResolved = (type: string): HrResolvedAssignment | null => {
        const selected = pickBestAssignment(byType.get(type) ?? []);
        if (!selected) return null;
        const id = String(selected.reference_entity_id);
        const hydrated = labels.get(id);
        return {
          assignmentId: String(selected.id),
          assignmentScope: String(selected.assignment_scope),
          assignmentStatus: String(selected.assignment_status),
          assignmentType: type,
          effectiveFrom: String(selected.effective_from),
          effectiveTo: selected.effective_to ? String(selected.effective_to) : null,
          label: hydrated?.label ?? "Assigned record",
          referenceEntityId: id,
          referenceEntityType: String(selected.reference_entity_type),
          subtitle: hydrated?.subtitle,
        };
      };
      const payrollGroup = toResolved("payroll_group");
      result.set(employeeId, {
        asOfDate,
        branchLabel: null,
        costCenter: toResolved("cost_center"),
        department: toResolved("department"),
        employeeId,
        grade: toResolved("capability_pack"),
        manager: toResolved("manager"),
        payrollGroup,
        payrollGroupLabel: payrollGroup?.label ?? null,
        position: toResolved("position"),
        section: toResolved("section"),
        shift: toResolved("shift_schedule"),
        team: toResolved("team"),
        workLocation: toResolved("work_location"),
      });
    }

    return result;
  }

  private async hydrateAssignmentLabels(rows: readonly AssignmentRow[]) {
    const labels = new Map<string, { label: string; subtitle?: string }>();
    const positionIds = new Set<string>();
    const orgUnitIds = new Set<string>();
    const employeeIds = new Set<string>();
    const locationIds = new Set<string>();

    for (const row of rows) {
      const id = String(row.reference_entity_id);
      const type = String(row.reference_entity_type);
      if (type === "hr_positions") positionIds.add(id);
      else if (type === "hr_org_units") orgUnitIds.add(id);
      else if (type === "hr_employees") employeeIds.add(id);
      else if (type === "hr_work_locations") locationIds.add(id);
    }

    await Promise.all([
      this.loadPositionLabels(positionIds, labels),
      this.loadOrgUnitLabels(orgUnitIds, labels),
      this.loadEmployeeLabels(employeeIds, labels),
      this.loadWorkLocationLabels(locationIds, labels),
    ]);

    return labels;
  }

  private async loadPositionLabels(ids: Set<string>, labels: Map<string, { label: string; subtitle?: string }>) {
    if (ids.size === 0) return;
    const result = await this.supabase
      .from("hr_positions")
      .select("id, name, position_key")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not load position labels.");
    for (const row of (result.data ?? []) as AssignmentRow[]) {
      labels.set(String(row.id), {
        label: formatHrDisplayLabel(row.name, "Position"),
        subtitle: formatHrDisplayLabel(row.position_key, undefined),
      });
    }
  }

  private async loadOrgUnitLabels(ids: Set<string>, labels: Map<string, { label: string; subtitle?: string }>) {
    if (ids.size === 0) return;
    const result = await this.supabase
      .from("hr_org_units")
      .select("id, name, org_unit_key, kind")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not load organization unit labels.");
    for (const row of (result.data ?? []) as AssignmentRow[]) {
      labels.set(String(row.id), {
        label: formatHrDisplayLabel(row.name, "Organization unit"),
        subtitle: formatHrDisplayLabel(row.kind, undefined),
      });
    }
  }

  private async loadEmployeeLabels(ids: Set<string>, labels: Map<string, { label: string; subtitle?: string }>) {
    if (ids.size === 0) return;
    const result = await this.supabase
      .from("hr_employees")
      .select("id, full_name, employee_number")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not load employee labels.");
    for (const row of (result.data ?? []) as AssignmentRow[]) {
      labels.set(String(row.id), {
        label: formatHrDisplayLabel(row.full_name, "Employee"),
        subtitle: formatHrDisplayLabel(row.employee_number, undefined),
      });
    }
  }

  private async loadWorkLocationLabels(ids: Set<string>, labels: Map<string, { label: string; subtitle?: string }>) {
    if (ids.size === 0) return;
    const result = await this.supabase
      .from("hr_work_locations")
      .select("id, name, location_key")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not load work location labels.");
    for (const row of (result.data ?? []) as AssignmentRow[]) {
      labels.set(String(row.id), {
        label: formatHrDisplayLabel(row.name, "Work location"),
        subtitle: formatHrDisplayLabel(row.location_key, undefined),
      });
    }
  }
}
