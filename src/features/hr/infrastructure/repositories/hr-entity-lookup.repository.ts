import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import {
  encodeLookupCursor,
  type OxLookupCursor,
  type OxLookupPage,
} from "@/platform/operator-experience/lookup-runtime";
import { normalizeOxLookupOption, type OxLookupOption } from "@/platform/operator-experience/public-api";

type LookupRow = Readonly<Record<string, unknown>>;

function assertNoError(result: { error: unknown | null }, message: string): asserts result is { data: LookupRow[] | null; error: null } {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function readOffset(cursor: OxLookupCursor | null): number {
  if (!cursor || cursor.sortKey !== "offset") return 0;
  const parsed = Number.parseInt(cursor.id, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toOffsetPage(options: readonly OxLookupOption[], pageSize: number, offset: number): OxLookupPage {
  const normalized = options
    .map((option) => normalizeOxLookupOption(option))
    .filter((option): option is OxLookupOption => option !== null);
  const hasMore = normalized.length > pageSize;
  const page = normalized.slice(0, pageSize);
  return {
    minSearchLength: 0,
    nextCursor: hasMore ? encodeLookupCursor({ id: String(offset + pageSize), sortKey: "offset" }) : null,
    options: page,
    pageSize,
    rejectedRawIdentifier: false,
  };
}

export class SupabaseHrEntityLookupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async searchEmployees(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("hr_employees")
      .select("id, employee_number, attendance_code, full_name, national_id, contact_info")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(
        `employee_number.ilike.%${term}%,full_name.ilike.%${term}%,national_id.ilike.%${term}%,attendance_code.ilike.%${term}%`,
      );
    }

    const result = await query;
    assertNoError(result, "Could not search employees.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.employee_number as string,
        businessName: row.full_name as string,
        entityType: "employee",
        id: row.id as string,
        subtitle: row.attendance_code
          ? String(row.attendance_code)
          : row.national_id
            ? String(row.national_id)
            : undefined,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateEmployees(ids: readonly string[]) {
    if (ids.length === 0) return [] as readonly OxLookupOption[];
    const result = await this.supabase
      .from("hr_employees")
      .select("id, employee_number, attendance_code, full_name, national_id")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not hydrate employees.");
    return (result.data ?? [])
      .map((row) =>
        normalizeOxLookupOption({
          businessCode: row.employee_number as string,
          businessName: row.full_name as string,
          entityType: "employee",
          id: row.id as string,
          subtitle: row.attendance_code
            ? String(row.attendance_code)
            : row.national_id
              ? String(row.national_id)
              : undefined,
        }),
      )
      .filter((option): option is OxLookupOption => option !== null);
  }

  async searchPositions(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("hr_positions")
      .select("id, position_key, name, vacancy_status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`position_key.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search positions.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.position_key as string,
        businessName: row.name as string,
        entityType: "position",
        id: row.id as string,
        subtitle: row.vacancy_status ? String(row.vacancy_status) : undefined,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydratePositions(ids: readonly string[]) {
    if (ids.length === 0) return [] as readonly OxLookupOption[];
    const result = await this.supabase
      .from("hr_positions")
      .select("id, position_key, name")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not hydrate positions.");
    return (result.data ?? [])
      .map((row) =>
        normalizeOxLookupOption({
          businessCode: row.position_key as string,
          businessName: row.name as string,
          entityType: "position",
          id: row.id as string,
        }),
      )
      .filter((option): option is OxLookupOption => option !== null);
  }

  async searchOrgUnits(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("hr_org_units")
      .select("id, org_unit_key, name, kind")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`org_unit_key.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search organization units.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.org_unit_key as string,
        businessName: row.name as string,
        entityType: "org-unit",
        id: row.id as string,
        subtitle: row.kind ? String(row.kind) : undefined,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateOrgUnits(ids: readonly string[]) {
    if (ids.length === 0) return [] as readonly OxLookupOption[];
    const result = await this.supabase
      .from("hr_org_units")
      .select("id, org_unit_key, name, kind")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, "Could not hydrate organization units.");
    return (result.data ?? [])
      .map((row) =>
        normalizeOxLookupOption({
          businessCode: row.org_unit_key as string,
          businessName: row.name as string,
          entityType: "org-unit",
          id: row.id as string,
          subtitle: row.kind ? String(row.kind) : undefined,
        }),
      )
      .filter((option): option is OxLookupOption => option !== null);
  }

  private async searchKeyNameTable(
    table: string,
    keyColumn: string,
    nameColumn: string,
    entityType: string,
    input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>,
    searchColumns?: readonly string[],
  ) {
    const offset = readOffset(input.cursor);
    const dynamicFrom = this.supabase.from.bind(this.supabase) as (tableName: string) => ReturnType<SupabaseClient["from"]>;
    let query = dynamicFrom(table)
      .select(`id, ${keyColumn}, ${nameColumn}`)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order(nameColumn, { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      const columns = searchColumns ?? [keyColumn, nameColumn];
      query = query.or(columns.map((column) => `${column}.ilike.%${term}%`).join(","));
    }

    const result = await query;
    assertNoError(result, `Could not search ${table}.`);
    const rows = (result.data ?? []) as LookupRow[];
    return toOffsetPage(
      rows.map((row) => ({
        businessCode: String(row[keyColumn] ?? ""),
        businessName: String(row[nameColumn] ?? ""),
        entityType,
        id: String(row.id ?? ""),
      })),
      input.pageSize,
      offset,
    );
  }

  private async hydrateKeyNameTable(table: string, keyColumn: string, nameColumn: string, entityType: string, ids: readonly string[]) {
    if (ids.length === 0) return [] as readonly OxLookupOption[];
    const dynamicFrom = this.supabase.from.bind(this.supabase) as (tableName: string) => ReturnType<SupabaseClient["from"]>;
    const result = await dynamicFrom(table)
      .select(`id, ${keyColumn}, ${nameColumn}`)
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids]);
    assertNoError(result, `Could not hydrate ${table}.`);
    const rows = (result.data ?? []) as LookupRow[];
    return rows
      .map((row) =>
        normalizeOxLookupOption({
          businessCode: String(row[keyColumn] ?? ""),
          businessName: String(row[nameColumn] ?? ""),
          entityType,
          id: String(row.id ?? ""),
        }),
      )
      .filter((option): option is OxLookupOption => option !== null);
  }

  async searchWorkLocations(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_work_locations", "location_key", "name", "work-location", input);
  }

  async hydrateWorkLocations(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_work_locations", "location_key", "name", "work-location", ids);
  }

  async searchJobFamilies(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_job_families", "family_code", "name", "job-family", input);
  }

  async hydrateJobFamilies(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_job_families", "family_code", "name", "job-family", ids);
  }

  async searchJobFunctions(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_job_functions", "function_code", "name", "job-function", input);
  }

  async hydrateJobFunctions(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_job_functions", "function_code", "name", "job-function", ids);
  }

  async searchJobLevels(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_job_levels", "level_code", "name", "job-level", input);
  }

  async hydrateJobLevels(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_job_levels", "level_code", "name", "job-level", ids);
  }

  async searchJobs(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_jobs", "job_code", "job_title", "job", input, ["job_code", "job_title"]);
  }

  async hydrateJobs(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_jobs", "job_code", "job_title", "job", ids);
  }

  async searchGrades(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_grades", "grade_key", "name", "grade", input);
  }

  async hydrateGrades(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_grades", "grade_key", "name", "grade", ids);
  }

  async searchSkillCategories(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_skill_categories", "category_key", "name", "skill-category", input);
  }

  async hydrateSkillCategories(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_skill_categories", "category_key", "name", "skill-category", ids);
  }

  async searchSkills(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_skills", "skill_code", "name", "skill", input);
  }

  async hydrateSkills(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_skills", "skill_code", "name", "skill", ids);
  }

  async searchCompetencyCategories(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_competency_categories", "category_key", "name", "competency-category", input);
  }

  async hydrateCompetencyCategories(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_competency_categories", "category_key", "name", "competency-category", ids);
  }

  async searchCompetencies(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    return this.searchKeyNameTable("hr_competencies", "competency_code", "name", "competency", input);
  }

  async hydrateCompetencies(ids: readonly string[]) {
    return this.hydrateKeyNameTable("hr_competencies", "competency_code", "name", "competency", ids);
  }
}
