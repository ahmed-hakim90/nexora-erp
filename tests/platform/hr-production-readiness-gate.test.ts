/**
 * HR Production Readiness Gate v1.0 Tests
 *
 * Validates all production readiness requirements for the HR module:
 * - Print templates (10 templates defined)
 * - Notification triggers (9 event types)
 * - Bulk operations (per-entity, permission-aware)
 * - Import/export column definitions
 * - Search entity providers
 * - Validation rules (employee, contract, assignment, payroll readiness)
 * - Report definitions
 * - Security scope rules
 * - Dashboard metric definitions
 * - Accessibility checklist
 * - Mobile/responsive checklist
 * - Contract lifecycle operations
 * - Compensation operations
 * - Employee lifecycle actions
 * - UI components and loaders
 * - Actions and permissions
 * - Navigation and shell
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  HR_ACCESSIBILITY_CHECKLIST,
  HR_ASSIGNMENT_PAYROLL_READINESS,
  HR_ASSIGNMENT_QUICK_ACTIONS,
  HR_ASSIGNMENT_RESOLUTION_RULES,
  HR_ASSIGNMENT_VALIDATION_RULES,
  HR_ATTENDANCE_EXPORT_CONTRACT,
  HR_ATTENDANCE_IMPORT_CONTRACT,
  HR_BULK_OPERATION_DEFINITIONS,
  HR_CERTIFICATION_EXAMPLES,
  HR_CLEARANCE_CHECKLIST_ITEMS,
  HR_COMPENSATION_OPERATIONS,
  HR_CONTRACT_LIFECYCLE_OPERATIONS,
  HR_CONTRACT_SEPARATION_CONTRACT,
  HR_CUSTODY_ASSET_TYPES,
  HR_DASHBOARD_METRIC_DEFINITIONS,
  HR_DOCUMENT_TYPES,
  HR_EFFECTIVE_DATING_CONTRACT,
  HR_EMPLOYEE_EXPORT_COLUMNS,
  HR_EMPLOYEE_IMPORT_COLUMNS,
  HR_EMPLOYEE_IMPORT_VALIDATION_RULES,
  HR_EMPLOYEE_LIFECYCLE_ACTIONS,
  HR_FOUNDATION_CONTRACTS,
  HR_LEAVE_ABSENCE_PERMISSION_METADATA,
  HR_LEAVE_ABSENCE_VALIDATION_RULES,
  HR_LICENSE_EXAMPLES,
  HR_NAV_ITEMS,
  HR_NOTIFICATION_EVENT_KEYS,
  HR_NOTIFICATION_TRIGGER_DEFINITIONS,
  HR_OFFBOARDING_CHECKLIST_ITEMS,
  HR_ONBOARDING_CHECKLIST_ITEMS,
  HR_ORGANIZATION_RESOURCES,
  HR_PERMISSIONS,
  HR_POSITIONS_JOBS_RESOURCES,
  HR_PRINT_TEMPLATE_DEFINITIONS,
  HR_PRINT_TEMPLATE_KEYS,
  HR_PRODUCTION_READINESS_GATE_V1,
  HR_PRODUCTION_REPORT_DEFINITIONS,
  HR_PRODUCTION_SECURITY_SCOPE_RULES,
  HR_PRODUCTION_VALIDATION_RULES,
  HR_REPORT_CARDS,
  HR_REQUEST_TYPES,
  HR_RESPONSIVE_CHECKLIST,
  HR_SEARCH_ENTITY_PROVIDERS,
  HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT,
  HR_SKILLS_RESOURCES,
  HR_VACANCY_REASONS,
  HR_WORKFORCE_FORECAST_TYPES,
  filterHrNavByPermissions,
  formatHrDisplayLabel,
  formatHrStatusLabel,
  getHrFoundationEntity,
  isRawUuid,
} from "@/features/hr/public-api";

// ─── Print Templates ──────────────────────────────────────────────────────────

test("hr production readiness: 10 print templates are defined", () => {
  assert.equal(HR_PRINT_TEMPLATE_DEFINITIONS.length, 10);
});

test("hr production readiness: employee profile print template is defined", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.employeeProfile);
  assert.ok(template, "Employee profile print template must be defined.");
  assert.equal(template.paperSize, "A4");
  assert.equal(template.sensitiveData, "restricted");
});

test("hr production readiness: contract print template is defined", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.contract);
  assert.ok(template, "Contract print template must be defined.");
  assert.equal(template.paperSize, "A4");
});

test("hr production readiness: salary letter print template is payroll-sensitive", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.salaryLetter);
  assert.ok(template, "Salary letter print template must be defined.");
  assert.equal(template.sensitiveData, "payroll");
});

test("hr production readiness: assignment letter print template is defined", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.assignmentLetter);
  assert.ok(template, "Assignment letter print template must be defined.");
});

test("hr production readiness: employee ID card print template uses custom paper size", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.employeeCard);
  assert.ok(template, "Employee card print template must be defined.");
  assert.equal(template.paperSize, "custom");
});

test("hr production readiness: org chart print template uses A3", () => {
  const template = HR_PRINT_TEMPLATE_DEFINITIONS.find((t) => t.key === HR_PRINT_TEMPLATE_KEYS.orgChart);
  assert.ok(template, "Org chart print template must be defined.");
  assert.equal(template.paperSize, "A3");
});

test("hr production readiness: all print template keys are unique", () => {
  const keys = HR_PRINT_TEMPLATE_DEFINITIONS.map((t) => t.key);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size);
});

test("hr production readiness: all print templates have a label and description", () => {
  for (const template of HR_PRINT_TEMPLATE_DEFINITIONS) {
    assert.ok(template.label.length > 0, `Template ${template.key} must have a label.`);
    assert.ok(template.description.length > 0, `Template ${template.key} must have a description.`);
  }
});

test("hr production readiness: print template key constants match definitions", () => {
  const keyValues = Object.values(HR_PRINT_TEMPLATE_KEYS);
  const definitionKeys = HR_PRINT_TEMPLATE_DEFINITIONS.map((t) => t.key);
  for (const key of keyValues) {
    assert.ok((definitionKeys as readonly string[]).includes(key), `Key ${key} must have a matching definition.`);
  }
});

// ─── Notification Triggers ────────────────────────────────────────────────────

test("hr production readiness: 9 notification triggers are defined", () => {
  assert.equal(HR_NOTIFICATION_TRIGGER_DEFINITIONS.length, 9);
});

test("hr production readiness: contract expiry notification is defined with correct threshold", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching,
  );
  assert.ok(trigger, "Contract expiry notification must be defined.");
  assert.equal(trigger.thresholdDays, 60);
  assert.equal(trigger.severity, "warning");
  assert.ok(trigger.recipients.includes("hr_manager"));
});

test("hr production readiness: document expiry notification is defined with 30-day threshold", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching,
  );
  assert.ok(trigger, "Document expiry notification must be defined.");
  assert.equal(trigger.thresholdDays, 30);
  assert.equal(trigger.severity, "warning");
});

test("hr production readiness: probation notification has 14-day threshold", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon,
  );
  assert.ok(trigger, "Probation ending notification must be defined.");
  assert.equal(trigger.thresholdDays, 14);
});

test("hr production readiness: payroll readiness blocked notification has error severity", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.payrollReadinessBlocked,
  );
  assert.ok(trigger, "Payroll readiness blocked notification must be defined.");
  assert.equal(trigger.severity, "error");
  assert.ok(trigger.recipients.includes("payroll_manager"));
});

test("hr production readiness: leave decision notification targets employee", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.leaveDecisionMade,
  );
  assert.ok(trigger, "Leave decision notification must be defined.");
  assert.ok(trigger.recipients.includes("employee"));
});

test("hr production readiness: birthday and anniversary notifications are defined", () => {
  const birthday = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.birthdayFired,
  );
  const anniversary = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.workAnniversary,
  );
  assert.ok(birthday, "Birthday notification must be defined.");
  assert.ok(anniversary, "Work anniversary notification must be defined.");
  assert.equal(birthday.thresholdDays, 0);
  assert.equal(anniversary.thresholdDays, 0);
});

test("hr production readiness: assignment changed notification is defined", () => {
  const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
    (t) => t.eventKey === HR_NOTIFICATION_EVENT_KEYS.assignmentChanged,
  );
  assert.ok(trigger, "Assignment changed notification must be defined.");
  assert.ok(trigger.recipients.includes("employee"));
  assert.ok(trigger.recipients.includes("hr_manager"));
});

test("hr production readiness: all notification event keys are unique", () => {
  const keys = HR_NOTIFICATION_TRIGGER_DEFINITIONS.map((t) => t.eventKey);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size);
});

// ─── Bulk Operations ─────────────────────────────────────────────────────────

test("hr production readiness: employee bulk operations include export and archive", () => {
  const ops = HR_BULK_OPERATION_DEFINITIONS.employees;
  assert.ok(ops.some((op) => op.value === "export_excel"));
  assert.ok(ops.some((op) => op.value === "archive"));
  assert.ok(ops.some((op) => op.value === "print_profiles"));
  assert.ok(ops.length >= 4);
});

test("hr production readiness: contract bulk operations include export and archive", () => {
  const ops = HR_BULK_OPERATION_DEFINITIONS.contracts;
  assert.ok(ops.some((op) => op.value === "export_excel"));
  assert.ok(ops.some((op) => op.value === "archive_expired"));
  assert.ok(ops.length >= 2);
});

test("hr production readiness: document bulk operations are defined", () => {
  const ops = HR_BULK_OPERATION_DEFINITIONS.documents;
  assert.ok(ops.some((op) => op.value === "export_excel"));
  assert.ok(ops.some((op) => op.value === "print_checklist"));
  assert.ok(ops.length >= 2);
});

test("hr production readiness: request bulk operations include approve and reject", () => {
  const ops = HR_BULK_OPERATION_DEFINITIONS.requests;
  assert.ok(ops.some((op) => op.value === "bulk_approve"));
  assert.ok(ops.some((op) => op.value === "bulk_reject"));
});

test("hr production readiness: all bulk operations have permissions", () => {
  for (const [, ops] of Object.entries(HR_BULK_OPERATION_DEFINITIONS)) {
    for (const op of ops) {
      assert.ok(op.permission.length > 0, `Bulk op ${op.value} must have a permission.`);
    }
  }
});

test("hr production readiness: employee bulk export requires import-export permission", () => {
  const exportOp = HR_BULK_OPERATION_DEFINITIONS.employees.find((op) => op.value === "export_excel");
  assert.ok(exportOp, "Excel export operation must be defined.");
  assert.equal(exportOp.permission, "hr.import-export.manage");
});

test("hr production readiness: employee bulk archive requires manage permission", () => {
  const archiveOp = HR_BULK_OPERATION_DEFINITIONS.employees.find((op) => op.value === "archive");
  assert.ok(archiveOp, "Archive operation must be defined.");
  assert.equal(archiveOp.permission, "hr.employees.manage");
});

// ─── Import/Export Columns ────────────────────────────────────────────────────

test("hr production readiness: employee export has 11 columns", () => {
  assert.equal(HR_EMPLOYEE_EXPORT_COLUMNS.length, 11);
  assert.equal(
    HR_EMPLOYEE_EXPORT_COLUMNS.some((column) => column.field === "attendanceCode"),
    false,
  );
});

test("hr production readiness: employee export columns include PII fields", () => {
  const piiColumns = HR_EMPLOYEE_EXPORT_COLUMNS.filter((col) => "pii" in col && col.pii === true);
  assert.ok(piiColumns.length >= 3, "At least fullName, nationalId, and email should be marked as PII.");
});

test("hr production readiness: employee export columns are ordered", () => {
  const orders = HR_EMPLOYEE_EXPORT_COLUMNS.map((col) => col.order);
  for (let i = 0; i < orders.length - 1; i++) {
    assert.ok((orders[i] as number) < (orders[i + 1] as number), "Export columns must be in ascending order.");
  }
});

test("hr production readiness: employee import columns include required fullName", () => {
  const fullNameCol = HR_EMPLOYEE_IMPORT_COLUMNS.find((col) => col.field === "fullName");
  assert.ok(fullNameCol, "fullName column must be in import spec.");
  assert.equal(fullNameCol.required, true);
});

test("hr production readiness: employee import columns include optional nationalId", () => {
  const nationalIdCol = HR_EMPLOYEE_IMPORT_COLUMNS.find((col) => col.field === "nationalId");
  assert.ok(nationalIdCol, "nationalId column must be in import spec.");
  assert.equal(nationalIdCol.required, false);
});

test("hr production readiness: employee import has validation rules", () => {
  assert.ok(HR_EMPLOYEE_IMPORT_VALIDATION_RULES.length >= 3);
  assert.ok(HR_EMPLOYEE_IMPORT_VALIDATION_RULES.some((rule) => rule.includes("National ID")));
  assert.ok(HR_EMPLOYEE_IMPORT_VALIDATION_RULES.some((rule) => rule.includes("Full name")));
});

// ─── Search Providers ─────────────────────────────────────────────────────────

test("hr production readiness: 9 search entity providers are defined", () => {
  assert.equal(HR_SEARCH_ENTITY_PROVIDERS.length, 9);
});

test("hr production readiness: employee search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_employee");
  assert.ok(provider, "Employee search provider must be defined.");
  assert.equal(provider.permission, "hr.employees.view");
  assert.ok(provider.fields.includes("fullName"));
  assert.ok(provider.fields.includes("nationalId"));
});

test("hr production readiness: contract search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_contract");
  assert.ok(provider, "Contract search provider must be defined.");
  assert.equal(provider.permission, "hr.contracts.view");
});

test("hr production readiness: assignment search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_assignment");
  assert.ok(provider, "Assignment search provider must be defined.");
});

test("hr production readiness: position search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_position");
  assert.ok(provider, "Position search provider must be defined.");
  assert.equal(provider.permission, "hr.positions.view");
});

test("hr production readiness: document search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_employee_document");
  assert.ok(provider, "Document search provider must be defined.");
});

test("hr production readiness: request search provider is defined", () => {
  const provider = HR_SEARCH_ENTITY_PROVIDERS.find((p) => p.entityType === "hr_action_request");
  assert.ok(provider, "Request search provider must be defined.");
  assert.equal(provider.permission, "hr.actions.view");
});

test("hr production readiness: all search providers have unique keys", () => {
  const keys = HR_SEARCH_ENTITY_PROVIDERS.map((p) => p.key);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size);
});

// ─── Validation Rules ─────────────────────────────────────────────────────────

test("hr production readiness: employee validation rules cover duplicate national ID", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.employee.find((r) => r.code === "duplicate_national_id");
  assert.ok(rule, "Duplicate national ID validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: employee validation rules cover duplicate employee code", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.employee.find((r) => r.code === "duplicate_employee_code");
  assert.ok(rule, "Duplicate employee code validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: employee validation has underage warning", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.employee.find((r) => r.code === "underage_employee");
  assert.ok(rule, "Underage employee validation must be defined.");
  assert.equal(rule.severity, "warning");
});

test("hr production readiness: contract validation covers date overlap", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.contract.find((r) => r.code === "contract_date_overlap");
  assert.ok(rule, "Contract date overlap validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: contract validation covers ends-before-starts", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.contract.find((r) => r.code === "ends_before_starts");
  assert.ok(rule, "Ends before starts validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: assignment validation covers self-manager", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.assignment.find((r) => r.code === "self_manager");
  assert.ok(rule, "Self manager validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: assignment validation covers circular manager", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.assignment.find((r) => r.code === "circular_manager");
  assert.ok(rule, "Circular manager validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: assignment validation covers overlap", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.assignment.find((r) => r.code === "assignment_overlap");
  assert.ok(rule, "Assignment overlap validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: payroll readiness validation covers missing bank details", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.payrollReadiness.find((r) => r.code === "missing_bank_details");
  assert.ok(rule, "Missing bank details validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: payroll readiness validation covers missing compensation", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.payrollReadiness.find((r) => r.code === "missing_compensation");
  assert.ok(rule, "Missing compensation validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: payroll readiness validation covers basic salary source conflict", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.payrollReadiness.find((r) => r.code === "basic_salary_source_conflict");
  assert.ok(rule, "Basic salary source conflict validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: payroll readiness validation covers missing contract", () => {
  const rule = HR_PRODUCTION_VALIDATION_RULES.payrollReadiness.find((r) => r.code === "missing_contract");
  assert.ok(rule, "Missing contract validation must be defined.");
  assert.equal(rule.severity, "error");
});

test("hr production readiness: all validation messages are user-friendly (no technical codes)", () => {
  for (const [, rules] of Object.entries(HR_PRODUCTION_VALIDATION_RULES)) {
    for (const rule of rules) {
      assert.ok(
        rule.message.length > 10 && !rule.message.includes("_"),
        `Validation message for ${rule.code} must be user-friendly: "${rule.message}"`,
      );
    }
  }
});

// ─── Report Definitions ───────────────────────────────────────────────────────

test("hr production readiness: 7 report definitions are defined", () => {
  assert.equal(HR_PRODUCTION_REPORT_DEFINITIONS.length, 7);
});

test("hr production readiness: employee directory report is defined", () => {
  const report = HR_PRODUCTION_REPORT_DEFINITIONS.find((r) => r.key === "hr.report.employee_directory");
  assert.ok(report, "Employee directory report must be defined.");
  assert.ok(report.exportFormats.includes("xlsx"));
  assert.ok(report.exportFormats.includes("pdf"));
});

test("hr production readiness: contract expiry report is defined", () => {
  const report = HR_PRODUCTION_REPORT_DEFINITIONS.find((r) => r.key === "hr.report.contract_expiry");
  assert.ok(report, "Contract expiry report must be defined.");
  assert.ok(report.filters.includes("expiry_window_days"));
});

test("hr production readiness: payroll readiness exception report is defined", () => {
  const report = HR_PRODUCTION_REPORT_DEFINITIONS.find((r) => r.key === "hr.report.payroll_readiness");
  assert.ok(report, "Payroll readiness report must be defined.");
  assert.ok(report.filters.includes("severity"));
});

test("hr production readiness: headcount report is defined", () => {
  const report = HR_PRODUCTION_REPORT_DEFINITIONS.find((r) => r.key === "hr.report.headcount");
  assert.ok(report, "Headcount report must be defined.");
  assert.ok(report.filters.includes("as_of_date"));
});

test("hr production readiness: all reports require view permission", () => {
  for (const report of HR_PRODUCTION_REPORT_DEFINITIONS) {
    assert.equal(report.permission, "hr.reports.view", `Report ${report.key} must require hr.reports.view permission.`);
  }
});

test("hr production readiness: all report keys are unique", () => {
  const keys = HR_PRODUCTION_REPORT_DEFINITIONS.map((r) => r.key);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size);
});

// ─── Security Scope Rules ─────────────────────────────────────────────────────

test("hr production readiness: compensation visibility rules are defined", () => {
  assert.ok(HR_PRODUCTION_SECURITY_SCOPE_RULES.compensationVisibility.length >= 2);
  assert.ok(
    HR_PRODUCTION_SECURITY_SCOPE_RULES.compensationVisibility.some((rule) => rule.includes("hr.compensation.view")),
  );
});

test("hr production readiness: document access rules are defined", () => {
  assert.ok(HR_PRODUCTION_SECURITY_SCOPE_RULES.documentAccess.length >= 2);
  assert.ok(
    HR_PRODUCTION_SECURITY_SCOPE_RULES.documentAccess.some((rule) => rule.includes("RLS")),
  );
});

test("hr production readiness: employee data access rules mention RLS", () => {
  assert.ok(
    HR_PRODUCTION_SECURITY_SCOPE_RULES.employeeDataAccess.some((rule) => rule.includes("RLS")),
  );
});

test("hr production readiness: request approval rules mention workflow engine", () => {
  assert.ok(
    HR_PRODUCTION_SECURITY_SCOPE_RULES.requestApproval.some((rule) => rule.includes("workflow engine")),
  );
});

// ─── Dashboard Metric Definitions ─────────────────────────────────────────────

test("hr production readiness: 12 dashboard metrics are defined", () => {
  assert.equal(HR_DASHBOARD_METRIC_DEFINITIONS.length, 12);
});

test("hr production readiness: total and active employee metrics are defined", () => {
  assert.ok(HR_DASHBOARD_METRIC_DEFINITIONS.some((m) => m.key === "total_employees"));
  assert.ok(HR_DASHBOARD_METRIC_DEFINITIONS.some((m) => m.key === "active_employees"));
});

test("hr production readiness: payroll readiness issues metric is defined", () => {
  const metric = HR_DASHBOARD_METRIC_DEFINITIONS.find((m) => m.key === "payroll_readiness_issues");
  assert.ok(metric, "Payroll readiness issues metric must be defined.");
  assert.ok(metric.description.includes("payslip"));
});

test("hr production readiness: contracts expiring metric references 60 days", () => {
  const metric = HR_DASHBOARD_METRIC_DEFINITIONS.find((m) => m.key === "contracts_expiring_soon");
  assert.ok(metric, "Contracts expiring metric must be defined.");
  assert.ok(metric.label.includes("60 days"));
});

test("hr production readiness: all dashboard metrics have key, label, and description", () => {
  for (const metric of HR_DASHBOARD_METRIC_DEFINITIONS) {
    assert.ok(metric.key.length > 0, "Metric must have a key.");
    assert.ok(metric.label.length > 0, "Metric must have a label.");
    assert.ok(metric.description.length > 0, "Metric must have a description.");
  }
});

// ─── Accessibility Checklist ──────────────────────────────────────────────────

test("hr production readiness: 8 accessibility checklist items are defined", () => {
  assert.equal(HR_ACCESSIBILITY_CHECKLIST.length, 8);
});

test("hr production readiness: accessibility covers table headers", () => {
  const item = HR_ACCESSIBILITY_CHECKLIST.find((i) => i.item === "table_headers");
  assert.ok(item, "Table headers accessibility item must be defined.");
});

test("hr production readiness: accessibility covers modal focus trap", () => {
  const item = HR_ACCESSIBILITY_CHECKLIST.find((i) => i.item === "modal_focus");
  assert.ok(item, "Modal focus accessibility item must be defined.");
});

test("hr production readiness: accessibility covers keyboard navigation", () => {
  const item = HR_ACCESSIBILITY_CHECKLIST.find((i) => i.item === "keyboard_navigation");
  assert.ok(item, "Keyboard navigation accessibility item must be defined.");
});

// ─── Responsive Checklist ─────────────────────────────────────────────────────

test("hr production readiness: 6 responsive checklist items are defined", () => {
  assert.equal(HR_RESPONSIVE_CHECKLIST.length, 6);
});

test("hr production readiness: responsive covers employee list mobile", () => {
  const item = HR_RESPONSIVE_CHECKLIST.find((i) => i.item === "employee_list_mobile");
  assert.ok(item, "Employee list mobile responsiveness item must be defined.");
});

test("hr production readiness: responsive covers touch targets", () => {
  const item = HR_RESPONSIVE_CHECKLIST.find((i) => i.item === "touch_targets");
  assert.ok(item, "Touch targets item must be defined.");
  assert.ok(item.description.includes("44px"), "Touch targets must reference 44px minimum.");
});

test("hr production readiness: responsive covers table horizontal scroll", () => {
  const item = HR_RESPONSIVE_CHECKLIST.find((i) => i.item === "table_horizontal_scroll");
  assert.ok(item, "Table horizontal scroll item must be defined.");
});

// ─── Contract Lifecycle Operations ────────────────────────────────────────────

test("hr production readiness: 6 contract lifecycle operations are defined", () => {
  assert.equal(HR_CONTRACT_LIFECYCLE_OPERATIONS.length, 6);
});

test("hr production readiness: contract create operation is defined", () => {
  const op = HR_CONTRACT_LIFECYCLE_OPERATIONS.find((o) => o.transition === "create");
  assert.ok(op, "Contract create operation must be defined.");
  assert.equal(op.permission, "hr.contracts.manage");
});

test("hr production readiness: contract renew operation is defined", () => {
  const op = HR_CONTRACT_LIFECYCLE_OPERATIONS.find((o) => o.transition === "renew");
  assert.ok(op, "Contract renew operation must be defined.");
});

test("hr production readiness: contract terminate operation is defined", () => {
  const op = HR_CONTRACT_LIFECYCLE_OPERATIONS.find((o) => o.transition === "terminate");
  assert.ok(op, "Contract terminate operation must be defined.");
});

test("hr production readiness: contract suspend and resume operations are defined", () => {
  const suspend = HR_CONTRACT_LIFECYCLE_OPERATIONS.find((o) => o.transition === "suspend");
  const resume = HR_CONTRACT_LIFECYCLE_OPERATIONS.find((o) => o.transition === "resume");
  assert.ok(suspend, "Contract suspend operation must be defined.");
  assert.ok(resume, "Contract resume operation must be defined.");
});

test("hr production readiness: all contract operations require manage permission", () => {
  for (const op of HR_CONTRACT_LIFECYCLE_OPERATIONS) {
    assert.equal(op.permission, "hr.contracts.manage");
  }
});

// ─── Compensation Operations ──────────────────────────────────────────────────

test("hr production readiness: 3 compensation operations are defined", () => {
  assert.equal(HR_COMPENSATION_OPERATIONS.length, 3);
});

test("hr production readiness: compensation add, amend, and end operations are defined", () => {
  assert.ok(HR_COMPENSATION_OPERATIONS.some((o) => o.operation === "add"));
  assert.ok(HR_COMPENSATION_OPERATIONS.some((o) => o.operation === "amend"));
  assert.ok(HR_COMPENSATION_OPERATIONS.some((o) => o.operation === "end"));
});

test("hr production readiness: compensation amend mentions effective-dated version", () => {
  const amend = HR_COMPENSATION_OPERATIONS.find((o) => o.operation === "amend");
  assert.ok(amend, "Amend operation must be defined.");
  assert.ok(amend.description.includes("effective-dated"));
});

// ─── Employee Lifecycle Actions ───────────────────────────────────────────────

test("hr production readiness: 8 employee lifecycle actions are defined", () => {
  assert.equal(HR_EMPLOYEE_LIFECYCLE_ACTIONS.length, 8);
});

test("hr production readiness: employee create action is defined", () => {
  const action = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "create");
  assert.ok(action, "Create action must be defined.");
  assert.equal(action.permission, "hr.employees.manage");
});

test("hr production readiness: employee archive and restore actions are defined", () => {
  const archive = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "archive");
  const restore = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "restore");
  assert.ok(archive, "Archive action must be defined.");
  assert.ok(restore, "Restore action must be defined.");
});

test("hr production readiness: employee photo update action is defined", () => {
  const action = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "photo_update");
  assert.ok(action, "Photo update action must be defined.");
});

test("hr production readiness: employee export action requires import-export permission", () => {
  const action = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "export");
  assert.ok(action, "Export action must be defined.");
  assert.equal(action.permission, "hr.import-export.manage");
});

test("hr production readiness: print profile action only requires view permission", () => {
  const action = HR_EMPLOYEE_LIFECYCLE_ACTIONS.find((a) => a.action === "print_profile");
  assert.ok(action, "Print profile action must be defined.");
  assert.equal(action.permission, "hr.employees.view");
});

// ─── Gate Contract ────────────────────────────────────────────────────────────

test("hr production readiness gate contract is version 1.0.0", () => {
  assert.equal(HR_PRODUCTION_READINESS_GATE_V1.version, "1.0.0");
});

test("hr production readiness gate contains all required sections", () => {
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.printTemplates));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.notificationTriggers));
  assert.ok(typeof HR_PRODUCTION_READINESS_GATE_V1.bulkOperations === "object");
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.searchProviders));
  assert.ok(typeof HR_PRODUCTION_READINESS_GATE_V1.validationRules === "object");
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.reportDefinitions));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.dashboardMetrics));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.accessibilityChecklist));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.responsiveChecklist));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.contractLifecycle));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.compensationOperations));
  assert.ok(Array.isArray(HR_PRODUCTION_READINESS_GATE_V1.employeeLifecycleActions));
});

// ─── Existing Constants Still Valid ──────────────────────────────────────────

test("hr production readiness: report cards cover 10 areas", () => {
  assert.equal(HR_REPORT_CARDS.length, 10);
  assert.ok(HR_REPORT_CARDS.some((card) => card.label === "Employee Directory"));
  assert.ok(HR_REPORT_CARDS.some((card) => card.label === "Payroll Readiness"));
  assert.ok(HR_REPORT_CARDS.some((card) => card.label === "Custody Report"));
});

test("hr production readiness: document types cover standard HR document categories", () => {
  assert.ok(HR_DOCUMENT_TYPES.some((t) => t.value === "national_id"));
  assert.ok(HR_DOCUMENT_TYPES.some((t) => t.value === "passport"));
  assert.ok(HR_DOCUMENT_TYPES.some((t) => t.value === "work_permit"));
  assert.ok(HR_DOCUMENT_TYPES.some((t) => t.value === "contract_copy"));
  assert.ok(HR_DOCUMENT_TYPES.some((t) => t.value === "medical_certificate"));
});

test("hr production readiness: custody asset types cover common assets", () => {
  assert.ok(HR_CUSTODY_ASSET_TYPES.some((t) => t.value === "laptop"));
  assert.ok(HR_CUSTODY_ASSET_TYPES.some((t) => t.value === "mobile"));
  assert.ok(HR_CUSTODY_ASSET_TYPES.some((t) => t.value === "car"));
  assert.ok(HR_CUSTODY_ASSET_TYPES.some((t) => t.value === "uniform"));
});

test("hr production readiness: request types include leave, resignation, and transfer", () => {
  assert.ok(HR_REQUEST_TYPES.some((t) => t.actionType === "leave"));
  assert.ok(HR_REQUEST_TYPES.some((t) => t.actionType === "resignation"));
  assert.ok(HR_REQUEST_TYPES.some((t) => t.actionType === "transfer"));
  assert.ok(HR_REQUEST_TYPES.some((t) => t.actionType === "advance"));
  assert.ok(HR_REQUEST_TYPES.some((t) => t.actionType === "loan"));
});

test("hr production readiness: assignment quick actions cover all key assignment types", () => {
  assert.ok(HR_ASSIGNMENT_QUICK_ACTIONS.some((a) => a.assignmentType === "position"));
  assert.ok(HR_ASSIGNMENT_QUICK_ACTIONS.some((a) => a.assignmentType === "department"));
  assert.ok(HR_ASSIGNMENT_QUICK_ACTIONS.some((a) => a.assignmentType === "manager"));
  assert.ok(HR_ASSIGNMENT_QUICK_ACTIONS.some((a) => a.assignmentScope === "temporary"));
  assert.ok(HR_ASSIGNMENT_QUICK_ACTIONS.some((a) => a.assignmentScope === "acting"));
});

// ─── Permissions ──────────────────────────────────────────────────────────────

test("hr production readiness: all key permissions are defined", () => {
  assert.ok(HR_PERMISSIONS.employeesView);
  assert.ok(HR_PERMISSIONS.employeesManage);
  assert.ok(HR_PERMISSIONS.contractsView);
  assert.ok(HR_PERMISSIONS.contractsManage);
  assert.ok(HR_PERMISSIONS.compensationView);
  assert.ok(HR_PERMISSIONS.compensationManage);
  assert.ok(HR_PERMISSIONS.leaveView);
  assert.ok(HR_PERMISSIONS.leaveManage);
  assert.ok(HR_PERMISSIONS.leaveApprove);
  assert.ok(HR_PERMISSIONS.payrollView);
  assert.ok(HR_PERMISSIONS.payrollManage);
  assert.ok(HR_PERMISSIONS.reportsView);
  assert.ok(HR_PERMISSIONS.importExportManage);
  assert.ok(HR_PERMISSIONS.searchView);
  assert.ok(HR_PERMISSIONS.actionsView);
  assert.ok(HR_PERMISSIONS.actionsManage);
  assert.ok(HR_PERMISSIONS.actionsApprove);
  assert.ok(HR_PERMISSIONS.assignmentsView);
  assert.ok(HR_PERMISSIONS.assignmentsManage);
});

test("hr production readiness: payroll permissions are comprehensive", () => {
  assert.ok(HR_PERMISSIONS.payrollRun);
  assert.ok(HR_PERMISSIONS.payrollApprove);
  assert.ok(HR_PERMISSIONS.payrollPublish);
  assert.ok(HR_PERMISSIONS.payrollValidate);
  assert.ok(HR_PERMISSIONS.payrollLock);
  assert.ok(HR_PERMISSIONS.payrollUnlock);
  assert.ok(HR_PERMISSIONS.payrollClose);
  assert.ok(HR_PERMISSIONS.payslipsView);
  assert.ok(HR_PERMISSIONS.payslipsManage);
  assert.ok(HR_PERMISSIONS.payslipsViewSelf);
});

test("hr production readiness: all permissions use dot notation", () => {
  for (const [key, permission] of Object.entries(HR_PERMISSIONS)) {
    assert.ok(
      String(permission).includes("."),
      `Permission ${key} must use dot notation. Got: ${String(permission)}`,
    );
  }
});

// ─── Action and Loader Exports ────────────────────────────────────────────────

test("hr production readiness: employee action exports are available", async () => {
  const actions = await import("@/features/hr/routes/actions/hr-employees.actions");
  assert.equal(typeof actions.createEmployeeWizardAction, "function");
  assert.equal(typeof actions.createHrAssignmentAction, "function");
});

test("hr production readiness: operational action exports are available", async () => {
  const actions = await import("@/features/hr/routes/actions/hr-operational.actions");
  assert.equal(typeof actions.createHrEmployeeDocumentAction, "function");
  assert.equal(typeof actions.archiveHrEmployeeDocumentAction, "function");
  assert.equal(typeof actions.createHrRequestAction, "function");
  assert.equal(typeof actions.transitionHrRequestAction, "function");
  assert.equal(typeof actions.transitionHrCustodyAction, "function");
  assert.equal(typeof actions.createHrCustodyAssignmentAction, "function");
  assert.equal(typeof actions.updateEmployeeQuickEditAction, "function");
  assert.equal(typeof actions.archiveEmployeeAction, "function");
  assert.equal(typeof actions.restoreEmployeeAction, "function");
});

test("hr production readiness: foundation action exports are available", async () => {
  const actions = await import("@/features/hr/routes/actions/hr-foundation.actions");
  assert.equal(typeof actions.createHrFoundationRecordAction, "function");
});

test("hr production readiness: employee list loader is available", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-employees.loader");
  assert.equal(typeof loader.loadHrEmployeesWorkspace, "function");
});

test("hr production readiness: employee profile loader is available", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-employee-profile.loader");
  assert.equal(typeof loader.loadHrEmployeeProfile, "function");
});

test("hr production readiness: dashboard loader is available", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-dashboard.loader");
  assert.equal(typeof loader.loadHrDashboardWorkspace, "function");
});

test("hr production readiness: operational loader functions are available", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-operational.loader");
  assert.equal(typeof loader.loadHrDocumentsWorkspace, "function");
  assert.equal(typeof loader.loadHrRequestsWorkspace, "function");
  assert.equal(typeof loader.loadHrCustodyWorkspace, "function");
  assert.equal(typeof loader.getHrEmployeeForEdit, "function");
  assert.equal(typeof loader.listHrDocumentTypeOptions, "function");
});

test("hr production readiness: foundation loader is available", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-foundation.loader");
  assert.equal(typeof loader.loadHrFoundationWorkspace, "function");
});

// ─── Schema Validation ────────────────────────────────────────────────────────

test("hr production readiness: employee quick edit schema strips assignment-owned fields", async () => {
  const { hrEmployeeQuickEditSchema } = await import("@/features/hr/application/schemas/hr-employees.schema");
  const result = hrEmployeeQuickEditSchema.safeParse({
    employeeId: "550e8400-e29b-41d4-a716-446655440000",
    employeeNumber: "E-001",
    fullName: "Ahmed Hassan",
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal("departmentId" in result.data, false, "departmentId must be stripped by quick edit schema.");
  }
});

test("hr production readiness: employee wizard schema requires fullName and assignment fields", async () => {
  const { hrEmployeeWizardSchema } = await import("@/features/hr/application/schemas/hr-employees.schema");
  const invalid = hrEmployeeWizardSchema.safeParse({ fullName: "" });
  assert.equal(invalid.success, false, "Empty fullName must fail wizard schema.");
  const missingDept = hrEmployeeWizardSchema.safeParse({ fullName: "Jane Smith", effectiveFrom: "2026-01-01" });
  assert.equal(missingDept.success, false, "Missing departmentId must fail wizard schema.");
  const valid = hrEmployeeWizardSchema.safeParse({
    fullName: "Jane Smith",
    departmentId: "550e8400-e29b-41d4-a716-446655440001",
    effectiveFrom: "2026-01-01",
    employeeNumber: "E-001",
    employmentType: "full-time",
  });
  assert.equal(valid.success, true, "Valid wizard input must succeed.");
});

test("hr production readiness: assignment schema validates effective date", async () => {
  const { hrAssignmentCreateSchema } = await import("@/features/hr/application/schemas/hr-assignments.schema");
  const invalid = hrAssignmentCreateSchema.safeParse({
    employeeId: "550e8400-e29b-41d4-a716-446655440000",
    assignmentType: "position",
  });
  assert.equal(invalid.success, false, "Assignment without effective date must fail.");
});

test("hr production readiness: foundation schema builder creates validation for required name", async () => {
  const { buildHrFoundationMutationSchema } = await import("@/features/hr/application/schemas/hr-foundation.schema");
  const { getHrFoundationEntity } = await import("@/features/hr/application/foundation-entities");
  const descriptor = getHrFoundationEntity("departments");
  const schema = buildHrFoundationMutationSchema(descriptor);
  const invalid = schema.safeParse({ name: "" });
  assert.equal(invalid.success, false, "Empty name must fail foundation validation.");
});

// ─── Services ─────────────────────────────────────────────────────────────────

test("hr production readiness: assignment conflict service is available", async () => {
  const service = await import("@/features/hr/application/services/hr-assignment-conflicts.service");
  assert.equal(typeof service.HrAssignmentConflictService, "function");
});

test("hr production readiness: assignment resolver service is available", async () => {
  const service = await import("@/features/hr/application/services/hr-assignment-resolver.service");
  assert.equal(typeof service.HrAssignmentResolverService, "function");
});

test("hr production readiness: employee validation service is available", async () => {
  const service = await import("@/features/hr/application/services/hr-employee-validation.service");
  assert.equal(typeof service.validateEmployeeUniqueness, "function");
  assert.equal(typeof service.assertNoBlockingEmployeeValidationIssues, "function");
});

test("hr production readiness: entity lookup service is available", async () => {
  const service = await import("@/features/hr/application/services/hr-entity-lookup.service");
  assert.equal(typeof service.HrEntityLookupService, "function");
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test("hr production readiness: navigation items include all major sections", () => {
  const keys = HR_NAV_ITEMS.map((item) => item.key);
  assert.ok(keys.includes("dashboard"));
  assert.ok(keys.includes("employees"));
  assert.ok(keys.includes("contracts"));
  assert.ok(keys.includes("assignments"));
  assert.ok(keys.includes("attendance-leave"));
  assert.ok(keys.includes("compensation"));
  assert.ok(keys.includes("documents"));
  assert.ok(keys.includes("custody"));
  assert.ok(keys.includes("requests"));
  assert.ok(keys.includes("payroll-readiness"));
  assert.ok(keys.includes("reports"));
});

test("hr production readiness: navigation filter is fail-closed", () => {
  const noPermissions = filterHrNavByPermissions([]);
  const noSensitiveItems = noPermissions.filter((item) =>
    item.key === "payroll-readiness" || item.key === "compensation",
  );
  assert.equal(noSensitiveItems.length, 0, "Payroll and compensation items must be hidden without permissions.");
});

// ─── Foundation Entities ──────────────────────────────────────────────────────

test("hr production readiness: foundation entities cover organization hierarchy", () => {
  assert.ok(HR_ORGANIZATION_RESOURCES.includes("departments"));
  assert.ok(HR_ORGANIZATION_RESOURCES.includes("work-locations"));
  assert.ok(HR_ORGANIZATION_RESOURCES.length >= 3);
});

test("hr production readiness: foundation entities cover positions and jobs", () => {
  assert.ok(HR_POSITIONS_JOBS_RESOURCES.includes("positions"));
  assert.ok(HR_POSITIONS_JOBS_RESOURCES.includes("jobs"));
});

test("hr production readiness: foundation entities cover skills and competencies", () => {
  assert.ok(HR_SKILLS_RESOURCES.includes("skills"));
  assert.ok(HR_SKILLS_RESOURCES.includes("competencies"));
});

test("hr production readiness: departments entity has arabic title", () => {
  const dept = getHrFoundationEntity("departments");
  assert.equal(dept.titleAr, "الأقسام");
});

// ─── Display Utilities ────────────────────────────────────────────────────────

test("hr production readiness: formatHrDisplayLabel blocks raw UUIDs", () => {
  assert.equal(isRawUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(formatHrDisplayLabel("550e8400-e29b-41d4-a716-446655440000"), "—");
});

test("hr production readiness: formatHrDisplayLabel passes through safe labels", () => {
  assert.equal(formatHrDisplayLabel("EMP-001"), "EMP-001");
  assert.equal(formatHrDisplayLabel("Ahmed Hassan"), "Ahmed Hassan");
});

test("hr production readiness: formatHrStatusLabel formats snake_case statuses", () => {
  const result = formatHrStatusLabel("expiring_soon");
  assert.ok(result.length > 0, "Status label must not be empty.");
  assert.equal(result.includes("_"), false, "Formatted status label must not contain underscores.");
});

// ─── Payroll Foundation Integration ──────────────────────────────────────────

test("hr production readiness: payroll foundation tables are defined", () => {
  assert.ok(Array.isArray(HR_FOUNDATION_CONTRACTS.payrollTables));
  assert.ok(HR_FOUNDATION_CONTRACTS.payrollTables.length >= 3);
});

test("hr production readiness: payroll readiness gate is included in foundation contracts", () => {
  assert.ok(HR_FOUNDATION_CONTRACTS.productionReadinessGate, "Production readiness gate must be in foundation contracts.");
  assert.equal(HR_FOUNDATION_CONTRACTS.productionReadinessGate.version, "1.0.0");
});

test("hr production readiness: contract separation contract is defined", () => {
  assert.ok(HR_CONTRACT_SEPARATION_CONTRACT, "Contract separation contract must be defined.");
});

test("hr production readiness: effective dating contract is defined", () => {
  assert.ok(HR_EFFECTIVE_DATING_CONTRACT, "Effective dating contract must be defined.");
});

// ─── Leave and Attendance ─────────────────────────────────────────────────────

test("hr production readiness: leave absence validation rules are defined", () => {
  assert.ok(HR_LEAVE_ABSENCE_VALIDATION_RULES, "Leave absence validation rules must be defined.");
});

test("hr production readiness: leave absence permission metadata is defined", () => {
  assert.ok(HR_LEAVE_ABSENCE_PERMISSION_METADATA, "Leave absence permission metadata must be defined.");
});

test("hr production readiness: attendance import and export contracts are defined", () => {
  assert.ok(HR_ATTENDANCE_IMPORT_CONTRACT, "Attendance import contract must be defined.");
  assert.ok(HR_ATTENDANCE_EXPORT_CONTRACT, "Attendance export contract must be defined.");
});

// ─── Assignment Engine ────────────────────────────────────────────────────────

test("hr production readiness: assignment resolution rules are defined", () => {
  assert.ok(HR_ASSIGNMENT_RESOLUTION_RULES, "Assignment resolution rules must be defined.");
});

test("hr production readiness: assignment validation rules are defined", () => {
  assert.ok(HR_ASSIGNMENT_VALIDATION_RULES, "Assignment validation rules must be defined.");
});

test("hr production readiness: assignment payroll readiness integration is defined", () => {
  assert.ok(HR_ASSIGNMENT_PAYROLL_READINESS, "Assignment payroll readiness integration must be defined.");
});

// ─── Skills and Competencies ──────────────────────────────────────────────────

test("hr production readiness: skills competency boundary contract is defined", () => {
  assert.ok(HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT, "Skills competency boundary contract must be defined.");
});

test("hr production readiness: certification and license examples are defined", () => {
  assert.ok(Array.isArray(HR_CERTIFICATION_EXAMPLES) && HR_CERTIFICATION_EXAMPLES.length > 0);
  assert.ok(Array.isArray(HR_LICENSE_EXAMPLES) && HR_LICENSE_EXAMPLES.length > 0);
});

// ─── Template Lifecycle ───────────────────────────────────────────────────────

test("hr production readiness: onboarding and offboarding checklists are defined", () => {
  assert.ok(Array.isArray(HR_ONBOARDING_CHECKLIST_ITEMS) && HR_ONBOARDING_CHECKLIST_ITEMS.length > 0);
  assert.ok(Array.isArray(HR_OFFBOARDING_CHECKLIST_ITEMS) && HR_OFFBOARDING_CHECKLIST_ITEMS.length > 0);
});

test("hr production readiness: clearance checklist items are defined", () => {
  assert.ok(Array.isArray(HR_CLEARANCE_CHECKLIST_ITEMS) && HR_CLEARANCE_CHECKLIST_ITEMS.length > 0);
});

// ─── Workforce Planning ───────────────────────────────────────────────────────

test("hr production readiness: vacancy reasons are defined", () => {
  assert.ok(Array.isArray(HR_VACANCY_REASONS) && HR_VACANCY_REASONS.length > 0);
});

test("hr production readiness: workforce forecast types are defined", () => {
  assert.ok(Array.isArray(HR_WORKFORCE_FORECAST_TYPES) && HR_WORKFORCE_FORECAST_TYPES.length > 0);
});
