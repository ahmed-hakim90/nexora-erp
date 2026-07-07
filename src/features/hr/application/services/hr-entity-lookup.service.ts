import "server-only";

import type { BranchRequestContext } from "@/platform/auth/server";
import { type OxLookupExecutor, type OxLookupSearchInput } from "@/platform/operator-experience/lookup-runtime";
import { requirePermission } from "@/platform/permissions/server";

import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { SupabaseHrEntityLookupRepository } from "../../infrastructure/repositories/hr-entity-lookup.repository";

type LookupBinding = Readonly<{
  hydrate: (ids: readonly string[]) => ReturnType<SupabaseHrEntityLookupRepository["hydrateEmployees"]>;
  permission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS];
  resource: string;
  search: (input: Readonly<{ term: string | null; pageSize: number; cursor: import("@/platform/operator-experience/lookup-runtime").OxLookupCursor | null }>) => ReturnType<SupabaseHrEntityLookupRepository["searchEmployees"]>;
}>;

export class HrEntityLookupService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly repository: SupabaseHrEntityLookupRepository,
  ) {}

  createExecutors(): Record<string, OxLookupExecutor> {
    const bindings: Record<string, LookupBinding> = {
      "hr.competencies.lookup": {
        hydrate: (ids) => this.repository.hydrateCompetencies(ids),
        permission: HR_PERMISSIONS.skillsView,
        resource: "hr.competencies.lookup",
        search: (input) => this.repository.searchCompetencies(input),
      },
      "hr.competency-categories.lookup": {
        hydrate: (ids) => this.repository.hydrateCompetencyCategories(ids),
        permission: HR_PERMISSIONS.skillsView,
        resource: "hr.competency-categories.lookup",
        search: (input) => this.repository.searchCompetencyCategories(input),
      },
      "hr.employees.lookup": {
        hydrate: (ids) => this.repository.hydrateEmployees(ids),
        permission: HR_PERMISSIONS.employeesView,
        resource: "hr.employees.lookup",
        search: (input) => this.repository.searchEmployees(input),
      },
      "hr.grades.lookup": {
        hydrate: (ids) => this.repository.hydrateGrades(ids),
        permission: HR_PERMISSIONS.jobsView,
        resource: "hr.grades.lookup",
        search: (input) => this.repository.searchGrades(input),
      },
      "hr.job-families.lookup": {
        hydrate: (ids) => this.repository.hydrateJobFamilies(ids),
        permission: HR_PERMISSIONS.jobsView,
        resource: "hr.job-families.lookup",
        search: (input) => this.repository.searchJobFamilies(input),
      },
      "hr.job-functions.lookup": {
        hydrate: (ids) => this.repository.hydrateJobFunctions(ids),
        permission: HR_PERMISSIONS.jobsView,
        resource: "hr.job-functions.lookup",
        search: (input) => this.repository.searchJobFunctions(input),
      },
      "hr.job-levels.lookup": {
        hydrate: (ids) => this.repository.hydrateJobLevels(ids),
        permission: HR_PERMISSIONS.jobsView,
        resource: "hr.job-levels.lookup",
        search: (input) => this.repository.searchJobLevels(input),
      },
      "hr.jobs.lookup": {
        hydrate: (ids) => this.repository.hydrateJobs(ids),
        permission: HR_PERMISSIONS.jobsView,
        resource: "hr.jobs.lookup",
        search: (input) => this.repository.searchJobs(input),
      },
      "hr.org-units.lookup": {
        hydrate: (ids) => this.repository.hydrateOrgUnits(ids),
        permission: HR_PERMISSIONS.positionsView,
        resource: "hr.org-units.lookup",
        search: (input) => this.repository.searchOrgUnits(input),
      },
      "hr.positions.lookup": {
        hydrate: (ids) => this.repository.hydratePositions(ids),
        permission: HR_PERMISSIONS.positionsView,
        resource: "hr.positions.lookup",
        search: (input) => this.repository.searchPositions(input),
      },
      "hr.skill-categories.lookup": {
        hydrate: (ids) => this.repository.hydrateSkillCategories(ids),
        permission: HR_PERMISSIONS.skillsView,
        resource: "hr.skill-categories.lookup",
        search: (input) => this.repository.searchSkillCategories(input),
      },
      "hr.skills.lookup": {
        hydrate: (ids) => this.repository.hydrateSkills(ids),
        permission: HR_PERMISSIONS.skillsView,
        resource: "hr.skills.lookup",
        search: (input) => this.repository.searchSkills(input),
      },
      "hr.work-locations.lookup": {
        hydrate: (ids) => this.repository.hydrateWorkLocations(ids),
        permission: HR_PERMISSIONS.view,
        resource: "hr.work-locations.lookup",
        search: (input) => this.repository.searchWorkLocations(input),
      },
    };

    const executors: Record<string, OxLookupExecutor> = {};
    for (const [key, binding] of Object.entries(bindings)) {
      executors[key] = {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: binding.resource,
            denialSource: `hr.entity-lookup.hydrate.${key}`,
            permission: binding.permission,
          });
          return binding.hydrate(ids);
        },
        search: async (input) => this.searchWithPermission(input, binding),
      };
    }
    return executors;
  }

  private async searchWithPermission(input: OxLookupSearchInput, binding: LookupBinding) {
    await requirePermission({
      context: this.context,
      denialResource: binding.resource,
      denialSource: `hr.entity-lookup.search.${binding.resource}`,
      permission: binding.permission,
    });
    const page = await binding.search({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }
}
