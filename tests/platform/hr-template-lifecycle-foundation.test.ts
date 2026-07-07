import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrCapabilityPack,
  defineHrCapabilityPackComponent,
  defineHrChecklistItem,
  defineHrChecklistTemplate,
  defineHrLifecycleTemplate,
  defineHrRequiredCustodySet,
  defineHrRequiredDocumentSet,
  defineHrRequiredTrainingSet,
  defineHrTemplate,
  defineHrTemplateComponent,
  defineHrTemplateEffect,
  defineHrTemplateVersion,
  HR_CAPABILITY_PACK_COMPONENT_KINDS,
  HR_CAPABILITY_PACK_EXAMPLES,
  HR_CAPABILITY_PACK_PRECEDENCE_RULES,
  HR_CHECKLIST_COMPLETION_RULES,
  HR_CHECKLIST_OWNER_ROLES,
  HR_CLEARANCE_CHECKLIST_ITEMS,
  HR_LIFECYCLE_TEMPLATE_KINDS,
  HR_OFFBOARDING_CHECKLIST_ITEMS,
  HR_ONBOARDING_CHECKLIST_ITEMS,
  HR_PROBATION_CHECKLIST_ITEMS,
  HR_REQUIRED_CUSTODY_ITEM_KINDS,
  HR_REQUIRED_DOCUMENT_KINDS,
  HR_REQUIRED_TRAINING_CATEGORIES,
  HR_TEMPLATE_COMPONENT_KINDS,
  HR_TEMPLATE_EFFECT_TARGETS,
  HR_TEMPLATE_LIFECYCLE_AUDIT_ACTIONS,
  HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT,
  HR_TEMPLATE_LIFECYCLE_EVENT_DEFINITIONS,
  HR_TEMPLATE_LIFECYCLE_FOUNDATION_TABLES,
  HR_TEMPLATE_LIFECYCLE_PLATFORM_INTEGRATION,
  HR_TEMPLATE_STATUSES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630184000_hr_template_lifecycle_foundation.sql");

test("HR Template & Lifecycle exposes statuses, component kinds, and lifecycle kinds", () => {
  assert.equal(HR_TEMPLATE_STATUSES.length, 4);
  assert.equal(HR_TEMPLATE_COMPONENT_KINDS.length, 26);
  assert.equal(HR_CAPABILITY_PACK_COMPONENT_KINDS.length, 13);
  assert.equal(HR_LIFECYCLE_TEMPLATE_KINDS.length, 14);
  assert.equal(HR_TEMPLATE_EFFECT_TARGETS.length, 7);
});

test("HR template contract is a reference bundle without copied operational data", () => {
  const template = defineHrTemplate({
    branchId: null,
    code: "FACTORY-OPS",
    companyId: "company-1",
    copiedOperationalData: false,
    currentVersion: 1,
    description: "Factory operations template.",
    effectiveFrom: "2026-01-01",
    executionRuntimeImplemented: false,
    name: "Factory Operations Template",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(template.referencesOnly, true);
  assert.equal(template.copiedOperationalData, false);
  assert.equal(template.executionRuntimeImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.templatesAreReferenceBundles, true);
});

test("template version retains assigned version for historical employees", () => {
  const version = defineHrTemplateVersion({
    assignedEmployeeRetainsVersion: true,
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    executionRuntimeImplemented: false,
    referencesOnly: true,
    status: "active",
    templateId: "template-1",
    tenantId: "tenant-1",
    version: 2,
  });

  assert.equal(version.assignedEmployeeRetainsVersion, true);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.historicalEmployeesRetainAssignedTemplateVersion, true);
});

test("template components and capability packs reference existing entities only", () => {
  const component = defineHrTemplateComponent({
    capabilityPackRef: "capability-pack-1",
    componentKind: "salary_package",
    copiedOperationalData: false,
    precedenceOrder: 120,
    referenceId: "salary-package-1",
    referencesOnly: true,
    sequence: 10,
    templateVersionId: "template-version-1",
  });

  const pack = defineHrCapabilityPack({
    branchId: null,
    code: "office-employee",
    companyId: "company-1",
    copiedOperationalData: false,
    name: "Office Employee Pack",
    precedenceOrder: 120,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  const packComponent = defineHrCapabilityPackComponent({
    capabilityPackId: "pack-1",
    componentKind: "attendance_policy",
    copiedOperationalData: false,
    referenceId: "attendance-policy-1",
    referencesOnly: true,
  });

  assert.equal(component.referencesOnly, true);
  assert.equal(pack.referencesOnly, true);
  assert.equal(packComponent.copiedOperationalData, false);
  assert.equal(HR_CAPABILITY_PACK_EXAMPLES.length, 7);
});

test("capability pack precedence resolves composition without duplicating entities", () => {
  assert.equal(HR_CAPABILITY_PACK_PRECEDENCE_RULES.length, 2);
  assert.equal(HR_CAPABILITY_PACK_PRECEDENCE_RULES[0]?.laterPackOverridesEarlierPack, true);
  assert.equal(HR_CAPABILITY_PACK_PRECEDENCE_RULES[0]?.resolveWithoutDuplicatingEntities, true);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.capabilityPackPrecedenceResolvesWithoutDuplication, true);
});

test("lifecycle and checklist templates avoid execution runtime", () => {
  const lifecycle = defineHrLifecycleTemplate({
    branchId: null,
    code: "onboarding-standard",
    companyId: "company-1",
    executionRuntimeImplemented: false,
    kind: "onboarding",
    name: "Standard Onboarding",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  const checklist = defineHrChecklistTemplate({
    branchId: null,
    code: "onboarding-checklist",
    companyId: "company-1",
    executionRuntimeImplemented: false,
    lifecycleKind: "onboarding",
    name: "Onboarding Checklist",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  const item = defineHrChecklistItem({
    checklistTemplateId: "checklist-1",
    completionRule: "document_uploaded",
    executionRuntimeImplemented: false,
    mandatory: true,
    ownerRole: "employee",
    sequence: 1,
    title: "Collect required documents",
  });

  assert.equal(lifecycle.executionRuntimeImplemented, false);
  assert.equal(checklist.executionRuntimeImplemented, false);
  assert.equal(item.executionRuntimeImplemented, false);
  assert.equal(HR_ONBOARDING_CHECKLIST_ITEMS.length, 14);
  assert.equal(HR_OFFBOARDING_CHECKLIST_ITEMS.length, 10);
  assert.equal(HR_PROBATION_CHECKLIST_ITEMS.length, 6);
  assert.equal(HR_CLEARANCE_CHECKLIST_ITEMS.length, 7);
});

test("required document, training, and custody sets are reference-only", () => {
  const documents = defineHrRequiredDocumentSet({
    branchId: null,
    code: "standard-hire-docs",
    companyId: "company-1",
    copiedOperationalData: false,
    documentKinds: ["national_id", "passport", "contract"],
    name: "Standard Hire Documents",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  const training = defineHrRequiredTrainingSet({
    branchId: null,
    category: "mandatory",
    code: "safety-training",
    companyId: "company-1",
    copiedOperationalData: false,
    name: "Safety Training",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
    trainingRefs: ["training-safety-101"],
  });

  const custody = defineHrRequiredCustodySet({
    branchId: null,
    code: "field-worker-custody",
    companyId: "company-1",
    copiedOperationalData: false,
    custodyItemKinds: ["uniform", "ppe", "access_card"],
    name: "Field Worker Custody",
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(documents.referencesOnly, true);
  assert.equal(training.copiedOperationalData, false);
  assert.equal(custody.copiedOperationalData, false);
  assert.equal(HR_REQUIRED_DOCUMENT_KINDS.length, 9);
  assert.equal(HR_REQUIRED_TRAINING_CATEGORIES.length, 4);
  assert.equal(HR_REQUIRED_CUSTODY_ITEM_KINDS.length, 10);
});

test("template effects declare readiness only without execution runtime", () => {
  const effect = defineHrTemplateEffect({
    effectOrder: 1,
    effectTarget: "employment_profile",
    executionRuntimeImplemented: false,
    readinessMetadata: { snapshotKind: "template_assignment" },
    templateVersionId: "template-version-1",
  });

  assert.equal(effect.executionRuntimeImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.onboardingExecutionImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.offboardingExecutionImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.checklistExecutionImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.applyRuntimeImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.workflowRuntimeImplemented, false);
});

test("HR template & lifecycle foundation keeps execution runtime disabled", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrTemplateLifecycleFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrTemplateLifecycleRuntime, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.directOperationalMutation, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT.referencesOnlyComposition, true);
  assert.equal(HR_TEMPLATE_LIFECYCLE_PLATFORM_INTEGRATION.executionRuntimeImplemented, false);
  assert.equal(HR_TEMPLATE_LIFECYCLE_PLATFORM_INTEGRATION.referencesHrCore, true);
  assert.equal(HR_TEMPLATE_LIFECYCLE_PLATFORM_INTEGRATION.referencesHrWorkflowApprovalBinding, true);
});

test("template permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.templates.view",
    "hr.templates.manage",
    "hr.capability_packs.view",
    "hr.capability_packs.manage",
    "hr.lifecycle_templates.view",
    "hr.lifecycle_templates.manage",
    "hr.checklists.view",
    "hr.checklists.manage",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_TEMPLATE_LIFECYCLE_EVENT_DEFINITIONS.length, 7);
  assert.equal(HR_TEMPLATE_LIFECYCLE_AUDIT_ACTIONS.templateCreated, "hr.template.created");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.template-lifecycle-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.templateLifecycleTables.length, 11);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.templates.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.search.searchableEntities.some((entity) => entity.entityType === "hr_template"), true);
  assert.equal(HR_CHECKLIST_OWNER_ROLES.length, 8);
  assert.equal(HR_CHECKLIST_COMPLETION_RULES.length, 6);
});

test("HR template & lifecycle migration adds foundation tables, precedence metadata, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_TEMPLATE_LIFECYCLE_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_template_status",
    "hr_template_component_kind",
    "hr_capability_pack_component_kind",
    "hr_lifecycle_template_kind",
    "hr_checklist_owner_role",
    "hr_checklist_completion_rule",
    "hr_required_document_kind",
    "hr_required_training_category",
    "hr_required_custody_item_kind",
    "hr_template_effect_target",
    "references public.hr_grades",
    "references public.hr_template_versions",
    "references public.hr_capability_packs",
    "references public.hr_checklist_templates",
    "hr_template_components_version_kind_ref_uq",
    "hr_capability_pack_components_pack_kind_ref_uq",
    "copied_operational_data', false",
    "references_only', true",
    "execution_runtime_implemented', false",
    "later_pack_overrides_earlier_pack', true",
    "resolve_without_duplicating_entities', true",
    "hr.templates.view",
    "hr.capability_packs.manage",
    "hr.lifecycle_templates.view",
    "hr.checklists.manage",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "onboarding_execution_runtime",
    "checklist_execution_runtime",
    "copy_employee_data",
    "mutate_employment_profile",
    "apply_engine_runtime",
    "workflow_execution_runtime",
    "self_service",
    "manager_portal",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Template migration must not include ${forbidden}`);
  }
});

test("template & lifecycle public contracts do not implement execution runtime", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/template-lifecycle-foundation.ts"), "utf8");

  for (const forbidden of [
    "executeOnboarding",
    "executeChecklist",
    "executeOffboarding",
    "copyEmployeeData",
    "mutateEmploymentProfile",
    "applyHrActionEffects",
    "executeTransition",
    "workflowRuntimeHandler",
    "checklistRuntimeHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Template contracts must not include ${forbidden}`);
  }
});
