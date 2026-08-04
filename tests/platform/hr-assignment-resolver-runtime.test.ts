import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT,
  HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT,
  HR_ASSIGNMENT_RESOLUTION_RULES,
  HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT,
  HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION,
  HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL,
  HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT,
  HR_ASSIGNMENT_TYPES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
} from "@/features/hr/server-api";

const root = process.cwd();
const cacheServicePath = path.join(root, "src/features/hr/application/services/hr-assignment-cache.service.ts");
const migrationPath = path.join(root, "supabase/migrations/20260710120500_hr_assignment_resolver_runtime.sql");

test("HR assignment resolver runtime exposes cache service and admin rebuild action", async () => {
  const cacheModule = await import("@/features/hr/server-api");
  assert.equal(typeof cacheModule.HrAssignmentCacheService, "function");

  const employeeActions = await import("@/features/hr/routes/actions/hr-employees.actions");
  assert.equal(typeof employeeActions.createHrAssignmentAction, "function");
  assert.equal(typeof employeeActions.updateHrAssignmentAction, "function");
  assert.equal(typeof employeeActions.endHrAssignmentAction, "function");

  const operationalActions = await import("@/features/hr/routes/actions/hr-operational.actions");
  assert.equal(typeof operationalActions.rebuildAllEmployeeCachesAction, "function");
});

test("HR operational boundary enables assignment engine runtime", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrAssignmentEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrAssignmentEngineRuntime, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.boundary.implementsHrAssignmentEngineRuntime, true);
});

test("assignment resolver runtime contracts mark resolution as implemented", () => {
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.assignmentRuntimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.directEmploymentProfileMutation, false);
  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.runtimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.runtimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.runtimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.runtimeImplemented, true);

  for (const rule of HR_ASSIGNMENT_RESOLUTION_RULES) {
    assert.equal(rule.resolutionRuntimeImplemented, true, `Expected ${rule.key} runtime to be implemented`);
  }

  for (const rule of HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL) {
    assert.equal(rule.resolutionRuntimeImplemented, true, `Expected ${rule.scope} precedence runtime to be implemented`);
  }
});

test("assignment cache service resolves refs for every assignment type", () => {
  const source = fs.readFileSync(cacheServicePath, "utf8");

  assert.match(source, /HrAssignmentResolverService/);
  assert.match(source, /rebuildEmploymentProfileCache/);
  assert.match(source, /hr_employment_profiles/);
  assert.match(source, /hr_assignment_resolution_refs/);
  assert.match(source, /hr_employee_timeline_events/);
  assert.match(source, /resolution_runtime_implemented:\s*true/);
  assert.match(source, /department_id/);
  assert.match(source, /section_id/);
  assert.match(source, /team_id/);
  assert.match(source, /position_id/);
  assert.match(source, /reporting_manager_employee_id/);
  assert.equal(HR_ASSIGNMENT_TYPES.length, 17);
  assert.match(source, /HR_ASSIGNMENT_TYPES\.map/);
});

test("assignment resolver runtime migration allows cache rebuild on active profiles", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /prevent_hr_employment_profile_history_rewrite/);
  assert.match(sql, /assignment_cache_rebuild/);
  assert.match(sql, /Assignment cache rebuild cannot mutate employment profile anchor fields/);
});

test("employee assignment actions invoke cache rebuild after mutations", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/routes/actions/hr-employees.actions.ts"), "utf8");

  assert.equal((source.match(/rebuildEmploymentProfileCache/g) ?? []).length, 3);
  assert.match(source, /createHrAssignmentAction[\s\S]*rebuildEmploymentProfileCache/);
  assert.match(source, /updateHrAssignmentAction[\s\S]*rebuildEmploymentProfileCache/);
  assert.match(source, /endHrAssignmentAction[\s\S]*rebuildEmploymentProfileCache/);
});

test("resolver service exposes assignment ids for resolution refs", async () => {
  const resolverModule = await import("@/features/hr/server-api");
  const source = fs.readFileSync(
    path.join(root, "src/features/hr/application/services/hr-assignment-resolver.service.ts"),
    "utf8",
  );

  assert.equal(typeof resolverModule.HrAssignmentResolverService, "function");
  assert.match(source, /assignmentId:\s*String\(selected\.id\)/);
});
