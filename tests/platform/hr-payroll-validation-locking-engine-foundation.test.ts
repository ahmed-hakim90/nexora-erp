import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollValidationSummary,
  defineHrPayrollClosingHistory,
  defineHrPayrollReopenRequest,
  defineHrPayrollRuntimeException,
  defineHrPayrollRuntimeLock,
  defineHrPayrollValidationResult,
  defineHrPayrollValidationRule,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_APPROVAL_GATE_STATUSES,
  HR_PAYROLL_RUNTIME_EXCEPTION_TYPES,
  HR_PAYROLL_RUNTIME_LOCK_REASONS,
  HR_PAYROLL_RUNTIME_LOCK_SCOPES,
  HR_PAYROLL_VALIDATION_CATEGORIES,
  HR_PAYROLL_VALIDATION_LOCKING_AUDIT_ACTIONS,
  HR_PAYROLL_VALIDATION_LOCKING_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_VALIDATION_LOCKING_EVENT_DEFINITIONS,
  HR_PAYROLL_VALIDATION_LOCKING_EXPORT_CONTRACT,
  HR_PAYROLL_VALIDATION_LOCKING_FOUNDATION_TABLES,
  HR_PAYROLL_VALIDATION_LOCKING_IMPORT_CONTRACT,
  HR_PAYROLL_VALIDATION_LOCKING_OBSERVABILITY_CONTRACT,
  HR_PAYROLL_VALIDATION_LOCKING_PERMISSION_METADATA,
  HR_PAYROLL_VALIDATION_LOCKING_PLATFORM_INTEGRATION,
  HR_PAYROLL_VALIDATION_LOCKING_RELATED_TABLES,
  HR_PAYROLL_VALIDATION_LOCKING_REPORT_READINESS,
  HR_PAYROLL_VALIDATION_LOCKING_VALIDATION_RULES,
  HR_PAYROLL_VALIDATION_SEVERITIES,
  HR_PAYROLL_VALIDATION_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  payrollApprovalGateAllowsTransition,
  payrollValidationBlocksApproval,
  hrAppManifest,
} from "@/features/hr/public-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260707120000_hr_payroll_validation_locking_closing_engine_foundation.sql");

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

test("validation categories, severities, exception types, and lock scopes are registered", () => {
  assert.equal(HR_PAYROLL_VALIDATION_CATEGORIES.length, 8);
  assert.equal(HR_PAYROLL_VALIDATION_SEVERITIES.length, 4);
  assert.equal(HR_PAYROLL_RUNTIME_EXCEPTION_TYPES.length, 13);
  assert.equal(HR_PAYROLL_RUNTIME_LOCK_SCOPES.length, 8);
  assert.equal(HR_PAYROLL_RUNTIME_LOCK_REASONS.length, 5);
  assert.equal(HR_PAYROLL_APPROVAL_GATE_STATUSES.length, 6);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_VALIDATION_RULES.length, 10);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_ENGINE_BOUNDARY_CONTRACT.validationIndependentFromCalculation, true);
});

test("validation rule registry remains provider-neutral", () => {
  const rule = defineHrPayrollValidationRule({
    autoResolvable: false,
    automaticCorrectionImplemented: false,
    branchId: null,
    companyId: "company-1",
    condition: { requiresAssignment: true },
    countrySpecificRuleImplemented: false,
    recommendation: "Resolve assignment before approval.",
    ruleCategory: "employee",
    ruleCode: "EMP-ASSIGNMENT-REQUIRED",
    ruleName: "Employee assignment required",
    severity: "blocking",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(rule.countrySpecificRuleImplemented, false);
  assert.equal(rule.automaticCorrectionImplemented, false);
});

test("validation results and blocking gate remain independent from calculation", () => {
  const result = defineHrPayrollValidationResult({
    blocking: true,
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-validate-1",
    message: "Missing cost center on employee snapshot.",
    payrollRunId: "run-1",
    ruleCategory: "finance_readiness",
    severity: "blocking",
    status: "open",
    tenantId: "tenant-1",
    validationRuntimeImplemented: false,
  });

  assert.equal(result.validationRuntimeImplemented, false);
  assert.equal(payrollValidationBlocksApproval([result]), true);
  assert.equal(payrollValidationBlocksApproval([{ blocking: false, severity: "warning" }]), false);
});

test("exception lifecycle contracts support resolution metadata without auto-correction", () => {
  const exception = defineHrPayrollRuntimeException({
    assignedTo: "user-2",
    automaticResolutionImplemented: false,
    branchId: null,
    companyId: "company-1",
    employeeId: "employee-1",
    exceptionType: "missing_cost_center",
    payrollRunId: "run-1",
    resolutionDate: "2026-02-28T12:00:00.000Z",
    resolutionNotes: "Cost center assigned manually.",
    resolutionType: "resolved",
    severity: "high",
    status: "resolved",
    tenantId: "tenant-1",
  });

  assert.equal(exception.automaticResolutionImplemented, false);
  assert.equal(exception.resolutionType, "resolved");
});

test("runtime locks, closing, and reopen contracts enforce immutability boundaries", () => {
  const lock = defineHrPayrollRuntimeLock({
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-lock-1",
    lockReason: "validation",
    lockRuntimeImplemented: false,
    lockScope: "payroll_run",
    payrollRunId: "run-1",
    preventsModificationAfterApproval: true,
    tenantId: "tenant-1",
  });
  const closing = defineHrPayrollClosingHistory({
    actorId: "user-1",
    branchId: null,
    closeTarget: "payroll_run",
    closingRuntimeImplemented: false,
    companyId: "company-1",
    correlationId: "corr-close-1",
    freezeInputs: true,
    freezePayslips: true,
    freezeResults: true,
    freezeSnapshots: true,
    irreversibleWithoutReopen: true,
    newState: "closed",
    payrollRunId: "run-1",
    previousState: "approved",
    reason: "Period close",
    tenantId: "tenant-1",
  });
  const reopen = defineHrPayrollReopenRequest({
    approvalGateStatus: "submitted",
    approvalStatus: "pending_approval",
    approvedBy: null,
    auditTrail: [{ action: "requested", actorId: "user-1" }],
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-reopen-1",
    fullyAuditable: true,
    impactSummary: { lockedRecords: 12 },
    payrollRunId: "run-1",
    reason: "Correction required before publish",
    reopenRuntimeImplemented: false,
    reopenTarget: "payroll_run",
    requestedBy: "user-1",
    tenantId: "tenant-1",
  });

  assert.equal(lock.lockRuntimeImplemented, false);
  assert.equal(closing.irreversibleWithoutReopen, true);
  assert.equal(reopen.fullyAuditable, true);
  assert.equal(payrollApprovalGateAllowsTransition("ready_for_approval", "submitted"), true);
  assert.equal(payrollApprovalGateAllowsTransition("approved", "submitted"), false);
});

test("validation summary and workflow integration remain contract-only", () => {
  const summary = createHrPayrollValidationSummary({
    blockingIssues: 2,
    employeesReady: 48,
    employeesWithErrors: 2,
    lockedRecords: 5,
    pendingApprovals: 1,
    warnings: 3,
  });

  assert.equal(summary.summaryRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_VALIDATION_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.directEngineCoupling, false);
  assert.equal(HR_PAYROLL_VALIDATION_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.referencesPlatformWorkflowDefinitions, true);
  assert.equal(HR_PAYROLL_VALIDATION_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT.approvalRuntimeImplemented, false);
});

test("search registration, permissions, and foundation contracts include payroll validation locking", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_validation_rule"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_validation_result"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_closing_history"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_reopen_request"), true);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_PERMISSION_METADATA.length, 6);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollValidate), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollExceptionManage), true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollValidationLockingEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollValidationLockingTables, HR_PAYROLL_VALIDATION_LOCKING_FOUNDATION_TABLES);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollValidationLockingRelatedTables, HR_PAYROLL_VALIDATION_LOCKING_RELATED_TABLES);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_IMPORT_CONTRACT.key, "hr.payroll.validation-locking.import");
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_EXPORT_CONTRACT.key, "hr.payroll.validation-locking.export");
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_PLATFORM_INTEGRATION.observabilityReadinessRegistered, true);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_REPORT_READINESS.dashboardDatasets.length, 5);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_EVENT_DEFINITIONS.length, 10);
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_AUDIT_ACTIONS.payrollValidationStarted, "hr.payroll.validation.started");
  assert.equal(HR_PAYROLL_VALIDATION_LOCKING_OBSERVABILITY_CONTRACT.correlationIdField, "correlation_id");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-validation-foundation"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-closing-foundation"), true);
});

test("payroll validation locking migration defines tables, extends shared entities, and guards out-of-scope runtime", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_VALIDATION_LOCKING_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /hr\.payroll\.validate/);
  assert.match(migration, /hr\.payroll\.lock/);
  assert.match(migration, /hr\.payroll\.unlock/);
  assert.match(migration, /hr\.payroll\.close/);
  assert.match(migration, /hr\.payroll\.reopen/);
  assert.match(migration, /hr\.payroll\.exception\.manage/);
  assert.match(migration, /alter table public\.hr_payroll_exceptions/i);
  assert.match(migration, /alter table public\.hr_payroll_runtime_locks/i);
  assert.match(migration, /country_specific_rule_implemented', false/);
  assert.match(migration, /automatic_correction_implemented', false/);
  assert.doesNotMatch(migration, /create table public\.hr_payroll_runtime_exceptions/i);
  assert.doesNotMatch(migration, /create table public\.hr_gosi/i);
  assert.doesNotMatch(migration, /journal_entry/i);
  assert.doesNotMatch(migration, /bank_transfer/i);
});

test("validation locking public contracts do not implement localization, posting, or payroll UI runtime", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payroll-validation-locking-foundation.ts"), "utf8");

  for (const forbidden of [
    "executePayrollValidation",
    "postAccountingEntries",
    "generateBankTransferFile",
    "renderPayslipPdf",
    "executeAutomaticExceptionCorrection",
    "resolveExceptionAutomatically",
    "countrySpecificValidationRule(",
    "gosiValidation",
    "taxValidation",
  ]) {
    assert.equal(source.includes(forbidden), false, `Validation locking foundation must not include ${forbidden}`);
  }
});
