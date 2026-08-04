import assert from "node:assert/strict";
import test from "node:test";

import {
  getHrFoundationEntity,
  HR_ORGANIZATION_RESOURCES,
  HR_POSITIONS_JOBS_RESOURCES,
  HR_SKILLS_RESOURCES,
  isHrFoundationResourceKey,
  isRawUuid,
  listHrFoundationResources,
} from "@/features/hr/server-api";
import { HR_FOUNDATION_LOOKUP_PROVIDER_KEYS, HR_FIELD_LOOKUP_PROVIDER_KEYS } from "@/platform/operator-experience/lookup-registry";

test("hr ui completion separates jobs and positions foundation resources", () => {
  assert.equal(isHrFoundationResourceKey("jobs"), true);
  assert.equal(isHrFoundationResourceKey("positions"), true);
  assert.notEqual(getHrFoundationEntity("jobs").table, getHrFoundationEntity("positions").table);
  assert.equal(getHrFoundationEntity("positions").fields.some((field) => field.name === "jobId"), true);
  assert.equal(HR_POSITIONS_JOBS_RESOURCES.includes("jobs"), true);
  assert.equal(HR_POSITIONS_JOBS_RESOURCES.includes("positions"), true);
});

test("hr ui completion keeps skills and competencies separate resources", () => {
  assert.equal(HR_SKILLS_RESOURCES.includes("skills"), true);
  assert.equal(HR_SKILLS_RESOURCES.includes("competencies"), true);
  assert.notEqual(getHrFoundationEntity("skills").table, getHrFoundationEntity("competencies").table);
  assert.equal(getHrFoundationEntity("certifications").table, "hr_certification_definitions");
});

test("hr ui completion exposes organization hierarchy resources", () => {
  assert.equal(HR_ORGANIZATION_RESOURCES.includes("departments"), true);
  assert.equal(HR_ORGANIZATION_RESOURCES.includes("work-locations"), true);
  assert.equal(listHrFoundationResources("organization").length, HR_ORGANIZATION_RESOURCES.length);
});

test("hr ui completion maps foundation lookup providers", () => {
  assert.equal(HR_FOUNDATION_LOOKUP_PROVIDER_KEYS.jobs, "hr.jobs.lookup");
  assert.equal(HR_FOUNDATION_LOOKUP_PROVIDER_KEYS.skills, "hr.skills.lookup");
  assert.equal(HR_FIELD_LOOKUP_PROVIDER_KEYS.employeeId, "hr.employees.lookup");
});

test("hr ui completion blocks raw uuid display", () => {
  assert.equal(isRawUuid("550e8400-e29b-41d4-a716-446655440000"), true);
});

test("hr ui completion exposes foundation and operational actions", async () => {
  const foundationActions = await import("@/features/hr/routes/actions/hr-foundation.actions");
  const operationalActions = await import("@/features/hr/routes/actions/hr-operational.actions");
  assert.equal(typeof foundationActions.createHrFoundationRecordAction, "function");
  assert.equal(typeof operationalActions.updateEmployeeQuickEditAction, "function");
  assert.equal(typeof operationalActions.createHrRequestAction, "function");
  assert.equal(typeof operationalActions.transitionHrContractAction, "function");
});

test("hr ui completion exposes operational loaders", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-operational.loader");
  assert.equal(typeof loader.loadHrDocumentsWorkspace, "function");
  assert.equal(typeof loader.loadHrRequestsWorkspace, "function");
  assert.equal(typeof loader.loadHrCustodyWorkspace, "function");
  assert.equal(typeof loader.getHrEmployeeForEdit, "function");
});

test("hr ui completion employee quick edit schema blocks assignment-owned fields", async () => {
  const schemaModule = await import("@/features/hr/server-api");
  const parsed = schemaModule.hrEmployeeQuickEditSchema.safeParse({
    employeeId: "550e8400-e29b-41d4-a716-446655440000",
    employeeNumber: "1001",
    fullName: "Ahmed Hassan",
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal("departmentId" in parsed.data, false);
  }
});

test("hr ui completion report launcher cards are defined", async () => {
  const constants = await import("@/features/hr/server-api");
  assert.equal(constants.HR_REPORT_CARDS.length >= 10, true);
  assert.equal(constants.HR_REPORT_CARDS.some((card) => card.label === "Employee Directory"), true);
});

test("hr ui completion arabic labels exist on foundation descriptors", () => {
  assert.equal(getHrFoundationEntity("departments").titleAr, "الأقسام");
  assert.equal(getHrFoundationEntity("jobs").titleAr, "الوظائف");
});
