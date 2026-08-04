import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollRecalculationReadinessInput,
  defineHrPayrollAdjustment,
  defineHrPayrollInput,
  defineHrPayrollInputSourceRef,
  defineHrPayrollRuntimeException,
  defineHrPayrollRuntimeLock,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_ADJUSTMENT_KINDS,
  HR_PAYROLL_INPUT_KINDS,
  HR_PAYROLL_INPUT_SOURCES,
  HR_PAYROLL_INPUT_STATUSES,
  HR_PAYROLL_INPUTS_RUNTIME_AUDIT_ACTIONS,
  HR_PAYROLL_INPUTS_RUNTIME_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_INPUTS_RUNTIME_EVENT_DEFINITIONS,
  HR_PAYROLL_INPUTS_RUNTIME_EXPORT_CONTRACT,
  HR_PAYROLL_INPUTS_RUNTIME_FOUNDATION_TABLES,
  HR_PAYROLL_INPUTS_RUNTIME_IMPORT_CONTRACT,
  HR_PAYROLL_INPUTS_RUNTIME_PERMISSION_METADATA,
  HR_PAYROLL_INPUTS_RUNTIME_PLATFORM_INTEGRATION,
  HR_PAYROLL_INPUTS_RUNTIME_RELATED_TABLES,
  HR_PAYROLL_INPUTS_RUNTIME_VALIDATION_RULES,
  HR_PAYROLL_INPUTS_SOURCE_INTEGRATION_CONTRACT,
  HR_PAYROLL_INPUTS_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT,
  HR_PAYROLL_RECALCULATION_SCOPES,
  HR_PAYROLL_RUNTIME_EXCEPTION_TYPES,
  HR_PAYROLL_RUNTIME_LOCK_SCOPES,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  payrollInputAllowsMutation,
  resolveHrPayrollInputSourceEngineKey,
  hrAppManifest,
} from "@/features/hr/server-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260705120000_hr_payroll_inputs_adjustments_runtime_foundation.sql");

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("HR Payroll Inputs Runtime exposes input kinds, sources, and validation rules", () => {
  assert.equal(HR_PAYROLL_INPUT_KINDS.length, 14);
  assert.equal(HR_PAYROLL_INPUT_SOURCES.length, 10);
  assert.equal(HR_PAYROLL_INPUT_STATUSES.length, 7);
  assert.equal(HR_PAYROLL_ADJUSTMENT_KINDS.length, 5);
  assert.equal(HR_PAYROLL_RUNTIME_EXCEPTION_TYPES.length, 13);
  assert.equal(HR_PAYROLL_RUNTIME_LOCK_SCOPES.length, 8);
  assert.equal(HR_PAYROLL_RECALCULATION_SCOPES.length, 3);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_VALIDATION_RULES.length, 10);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_ENGINE_BOUNDARY_CONTRACT.payrollCalculationConsumesInputsOnly, true);
});

test("payroll input contract captures source, period, approval, and audit metadata", () => {
  const input = defineHrPayrollInput({
    amount: 1500,
    approvalStatus: "pending_approval",
    auditMetadata: { submittedBy: "user-1" },
    branchId: null,
    companyId: "company-1",
    currency: "USD",
    duplicatesSourceData: false,
    effectiveDate: "2026-02-01",
    employeeId: "employee-1",
    inputKind: "bonus",
    notes: "Q1 performance bonus",
    payrollCalculationImplemented: false,
    payrollPeriodId: "period-1",
    quantity: null,
    source: "manual_entry",
    status: "submitted",
    tenantId: "tenant-1",
  });

  assert.equal(input.inputKind, "bonus");
  assert.equal(input.duplicatesSourceData, false);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_ENGINE_BOUNDARY_CONTRACT.readsOperationalModulesDirectlyDuringCalculation, false);
});

test("input source refs reference engines without duplicating source data", () => {
  const sourceRef = defineHrPayrollInputSourceRef({
    branchId: null,
    companyId: "company-1",
    duplicatesSourceData: false,
    effectiveDateUsed: "2026-02-01",
    payloadRef: { recordType: "attendance_summary" },
    payrollInputId: "input-1",
    referencesSourceOnly: true,
    source: "attendance_engine",
    sourceEngineKey: resolveHrPayrollInputSourceEngineKey("attendance_engine"),
    sourceRecordId: "attendance-day-1",
    tenantId: "tenant-1",
  });

  assert.equal(sourceRef.referencesSourceOnly, true);
  assert.equal(sourceRef.sourceEngineKey, "hr.attendance-engine");
  assert.equal(HR_PAYROLL_INPUTS_SOURCE_INTEGRATION_CONTRACT.duplicatesSourceData, false);
});

test("payroll adjustments and mutation guards remain contract-only", () => {
  const adjustment = defineHrPayrollAdjustment({
    adjustmentKind: "one_time",
    adjustmentRuntimeImplemented: false,
    amount: -500,
    approvalStatus: "not_required",
    branchId: null,
    companyId: "company-1",
    currency: "USD",
    effectiveDate: "2026-02-01",
    employeeId: "employee-1",
    payrollInputId: "input-1",
    payrollPeriodId: "period-1",
    status: "draft",
    tenantId: "tenant-1",
  });

  assert.equal(adjustment.adjustmentRuntimeImplemented, false);
  assert.equal(payrollInputAllowsMutation("draft", "not_required"), true);
  assert.equal(payrollInputAllowsMutation("locked", "approved"), false);
});

test("runtime exceptions and locks have no automatic resolution", () => {
  const exception = defineHrPayrollRuntimeException({
    automaticResolutionImplemented: false,
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    exceptionType: "missing_attendance",
    payrollInputId: "input-1",
    payrollPeriodId: "period-1",
    severity: "high",
    status: "open",
    tenantId: "tenant-1",
  });
  const lock = defineHrPayrollRuntimeLock({
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    lockRuntimeImplemented: false,
    lockScope: "input",
    payrollInputId: "input-1",
    preventsModificationAfterApproval: true,
    tenantId: "tenant-1",
  });

  assert.equal(exception.automaticResolutionImplemented, false);
  assert.equal(lock.preventsModificationAfterApproval, true);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_ENGINE_BOUNDARY_CONTRACT.automaticExceptionResolutionImplemented, false);
});

test("recalculation readiness remains contract-only", () => {
  const recalc = createHrPayrollRecalculationReadinessInput({
    payrollRunId: "run-1",
    scope: "payroll_run",
  });

  assert.equal(recalc.recalculationEngineImplemented, false);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_VALIDATION_RULES.some((rule) => rule.key === "recalculation_contract_only"), true);
});

test("workflow approval integration uses platform contracts only", () => {
  assert.equal(HR_PAYROLL_INPUTS_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.directEngineCoupling, false);
  assert.equal(HR_PAYROLL_INPUTS_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.approvalRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_INPUTS_SOURCE_INTEGRATION_CONTRACT.runtimeImplemented, false);
});

test("search registration, permissions, and foundation contracts include payroll inputs runtime", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_input"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_adjustment"), true);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_PERMISSION_METADATA.length, 5);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollInputsView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollLocksManageRuntime), true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollInputsRuntimeFoundation, true);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollInputsRuntimeTables, HR_PAYROLL_INPUTS_RUNTIME_FOUNDATION_TABLES);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollInputsRuntimeRelatedTables, HR_PAYROLL_INPUTS_RUNTIME_RELATED_TABLES);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_IMPORT_CONTRACT.key, "hr.payroll.inputs.runtime.import");
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_EXPORT_CONTRACT.key, "hr.payroll.inputs.runtime.export");
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_PLATFORM_INTEGRATION.searchRegistered, true);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_EVENT_DEFINITIONS.length, 9);
  assert.equal(HR_PAYROLL_INPUTS_RUNTIME_AUDIT_ACTIONS.payrollInputCreated, "hr.payroll.inputs.input.created");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-inputs-runtime-foundation"), true);
});

test("payroll inputs migration defines tables, RLS, locks, and out-of-scope guards", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_INPUTS_RUNTIME_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /alter table public\.hr_payroll_exceptions/i);
  assert.match(migration, /payroll_input_id/);

  assert.match(migration, /prevent_hr_payroll_input_mutation_after_lock/);
  assert.match(migration, /hr\.payroll\.inputs\.view/);
  assert.match(migration, /hr\.payroll\.locks\.manage/);
  assert.match(migration, /missing_payroll_group/);
  assert.doesNotMatch(migration, /create table public\.hr_tax/i);
  assert.doesNotMatch(migration, /calculate_payroll/i);
  assert.doesNotMatch(migration, /journal_entry/i);
});
