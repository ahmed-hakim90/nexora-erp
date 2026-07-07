import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import {
  HR_ASSIGNMENT_RESOLUTION_RULES,
  HR_ASSIGNMENT_TYPES,
  type HrAssignmentScope,
  type HrAssignmentType,
} from "../../assignment-foundation";
import type { HrEmployeeAssignmentSnapshot, HrResolvedAssignment } from "../types/hr-ui.types";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";

type EmploymentProfileRow = Readonly<{
  branch_id: string | null;
  company_id: string;
  department_id: string;
  id: string;
  metadata: unknown;
}>;

const SNAPSHOT_FIELD_BY_ASSIGNMENT_TYPE: Partial<Record<HrAssignmentType, keyof HrEmployeeAssignmentSnapshot>> = {
  capability_pack: "grade",
  cost_center: "costCenter",
  department: "department",
  manager: "manager",
  payroll_group: "payrollGroup",
  position: "position",
  section: "section",
  shift_schedule: "shift",
  team: "team",
  work_location: "workLocation",
};

const SCOPE_TO_RULE_KEY: Record<HrAssignmentScope, string> = {
  acting: "acting_overrides_reporting_structure_only",
  delegated: "delegated_affects_delegated_capabilities_only",
  emergency: "emergency_highest_precedence_within_validity",
  primary: "primary_assignment_wins",
  project: "project_overrides_workforce_targets_within_validity",
  temporary: "temporary_overrides_within_validity",
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertNoError(result: { error: unknown | null }, message: string): asserts result is { data: unknown; error: null } {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

function resolveRuleKey(scope: HrAssignmentScope): string {
  return SCOPE_TO_RULE_KEY[scope] ?? HR_ASSIGNMENT_RESOLUTION_RULES[0]?.key ?? "primary_assignment_wins";
}

function resolvedForAssignmentType(
  snapshot: HrEmployeeAssignmentSnapshot,
  assignmentType: HrAssignmentType,
): HrResolvedAssignment | null {
  const field = SNAPSHOT_FIELD_BY_ASSIGNMENT_TYPE[assignmentType];
  if (!field) return null;
  const value = snapshot[field];
  return value && typeof value === "object" && "assignmentType" in value ? (value as HrResolvedAssignment) : null;
}

export class HrAssignmentCacheService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async rebuildEmploymentProfileCache(employeeId: string, asOfDate?: string): Promise<void> {
    const effectiveDate = asOfDate ?? todayIsoDate();
    const resolver = new HrAssignmentResolverService(this.supabase, this.context);
    const snapshot = await resolver.resolveEmployeeAssignments(employeeId, effectiveDate);
    const profile = await this.loadActiveEmploymentProfile(employeeId);

    const existingMetadata =
      typeof profile.metadata === "object" && profile.metadata && !Array.isArray(profile.metadata)
        ? { ...(profile.metadata as Record<string, unknown>) }
        : {};

    const cacheMetadata = {
      ...existingMetadata,
      assignment_cache_as_of_date: effectiveDate,
      assignment_cache_rebuild: true,
      assignment_cache_rebuilt_at: new Date().toISOString(),
      assignment_cache_source: "hr-assignment-resolver-runtime",
    };

    const profileUpdate = {
      department_id: snapshot.department?.referenceEntityId ?? profile.department_id,
      metadata: cacheMetadata,
      position_id: snapshot.position?.referenceEntityId ?? null,
      reporting_manager_employee_id: snapshot.manager?.referenceEntityId ?? null,
      section_id: snapshot.section?.referenceEntityId ?? null,
      team_id: snapshot.team?.referenceEntityId ?? null,
      updated_by: this.context.userId,
    };

    const { error: profileError } = await this.supabase
      .from("hr_employment_profiles")
      .update(profileUpdate)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", profile.id)
      .is("deleted_at", null);
    if (profileError) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not rebuild employment profile assignment cache.",
        cause: profileError,
      });
    }

    await this.persistResolutionRefs(employeeId, effectiveDate, snapshot, profile);
    await this.writeCacheRebuildTimelineEvent(employeeId, effectiveDate, snapshot);
  }

  private async loadActiveEmploymentProfile(employeeId: string): Promise<EmploymentProfileRow> {
    const result = await this.supabase
      .from("hr_employment_profiles")
      .select("id, company_id, branch_id, department_id, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error || !result.data) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Active employment profile was not found for assignment cache rebuild.",
        cause: result.error,
      });
    }
    return result.data as EmploymentProfileRow;
  }

  private async persistResolutionRefs(
    employeeId: string,
    effectiveDate: string,
    snapshot: HrEmployeeAssignmentSnapshot,
    profile: EmploymentProfileRow,
  ): Promise<void> {
    const softDeleteResult = await this.supabase
      .from("hr_assignment_resolution_refs")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: this.context.userId,
        is_active: false,
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("effective_date", effectiveDate)
      .is("deleted_at", null);
    assertNoError(softDeleteResult, "Could not clear prior assignment resolution references.");

    const rows = HR_ASSIGNMENT_TYPES.map((assignmentType) => {
      const resolved = resolvedForAssignmentType(snapshot, assignmentType);
      const assignmentScope = (resolved?.assignmentScope ?? "primary") as HrAssignmentScope;
      return {
        assignment_scope: assignmentScope,
        assignment_type: assignmentType,
        branch_id: profile.branch_id,
        company_id: profile.company_id,
        created_by: this.context.userId,
        effective_date: effectiveDate,
        employee_id: employeeId,
        metadata: {
          foundation_only: false,
          resolution_runtime_implemented: true,
          resolved_label: resolved?.label ?? null,
          resolved_reference_entity_id: resolved?.referenceEntityId ?? null,
        },
        resolution_rule_key: resolved ? resolveRuleKey(assignmentScope) : "primary_assignment_wins",
        resolved_assignment_id: resolved?.assignmentId ?? null,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      };
    });

    const insertResult = await this.supabase.from("hr_assignment_resolution_refs").insert(rows);
    assertNoError(insertResult, "Could not persist assignment resolution references.");
  }

  private async writeCacheRebuildTimelineEvent(
    employeeId: string,
    effectiveDate: string,
    snapshot: HrEmployeeAssignmentSnapshot,
  ): Promise<void> {
    const { error } = await this.supabase.from("hr_employee_timeline_events").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: employeeId,
      event_type: "lifecycle_changed",
      metadata: {
        assignment_cache_rebuild: true,
        as_of_date: effectiveDate,
        resolved_assignment_types: HR_ASSIGNMENT_TYPES.filter((type) => resolvedForAssignmentType(snapshot, type) !== null),
        resolution_runtime_implemented: true,
        source: "hr-assignment-resolver-runtime",
      },
      source_document_type: "hr_assignment_cache_rebuild",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not write assignment cache rebuild timeline event.",
        cause: error,
      });
    }
  }
}
