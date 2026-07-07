import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayslipPublishingStatus =
  | "draft"
  | "generated"
  | "pending_publish"
  | "published"
  | "unpublished"
  | "archived";

export type HrPayslipPublicationScope = "single_employee" | "payroll_group" | "payroll_run";

export type HrPayslipPublicationAction = "publish" | "republish" | "unpublish" | "revoke";

export type HrPayslipSecureAccessMode = "portal_session" | "temporary_access" | "download_authorization";

export type HrEmployeePayrollAcknowledgementKind = "viewed" | "downloaded" | "acknowledged";

export type HrEmployeePayrollPortalSurface =
  | "my_payslips"
  | "payroll_history"
  | "payroll_details"
  | "payroll_components"
  | "payroll_summary";

export type HrPayslipPublishingScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayslipPublicationDefinition = HrPayslipPublishingScope & Readonly<{
  payslipId: string;
  payrollRunId?: string | null;
  payrollPeriodId?: string | null;
  employeeId: string;
  publicationScope: HrPayslipPublicationScope;
  publicationAction: HrPayslipPublicationAction;
  publishingStatus: HrPayslipPublishingStatus;
  correlationId: string;
  payrollApproved: boolean;
  validationPassed: boolean;
  blockingExceptionsCleared: boolean;
  payslipGenerated: boolean;
  employeeActive: boolean;
  publishedBy?: string | null;
  publishedAt?: string | null;
  revokedBy?: string | null;
  revokedAt?: string | null;
  viewedAt?: string | null;
  downloadedAt?: string | null;
  publishingRuntimeImplemented: false;
  pdfRenderingImplemented: false;
  emailDeliveryImplemented: false;
}>;

export type HrEmployeePayrollPortalPreferencesDefinition = HrPayslipPublishingScope & Readonly<{
  employeeId: string;
  userId?: string | null;
  portalEnabled: boolean;
  preferredLanguage?: string | null;
  notificationPreferences: Readonly<Record<string, unknown>>;
  consumesPublishedPayrollOnly: true;
  employeePortalUiImplemented: false;
}>;

export type HrPayslipSecureAccessContract = Readonly<{
  accessMode: HrPayslipSecureAccessMode;
  payslipId: string;
  employeeId: string;
  expiresAt?: string | null;
  revocable: true;
  authRuntimeImplemented: false;
  downloadAuthorizationImplemented: false;
}>;

export type HrEmployeePayrollPortalContract = Readonly<{
  surface: HrEmployeePayrollPortalSurface;
  requiredPermission: string;
  consumesPublishedPayrollOnly: true;
  exposesDraftPayroll: false;
  exposesUnapprovedPayroll: false;
  exposesUnpublishedPayroll: false;
  portalUiImplemented: false;
}>;

export type HrPayslipVisibilityRuleDefinition = Readonly<{
  employeeOwnsPayslip: boolean;
  payrollApproved: boolean;
  payslipPublished: boolean;
  employeeHasPermission: boolean;
  adminAccessRespectsSecurityEngine: true;
}>;

export type HrPayslipPublishingValidationInput = Readonly<{
  blockingExceptionsCleared: boolean;
  employeeActive: boolean;
  payrollApproved: boolean;
  payslipGenerated: boolean;
  validationPassed: boolean;
}>;

export type HrEmployeePayrollAcknowledgementReadinessContract = Readonly<{
  acknowledgementKind: HrEmployeePayrollAcknowledgementKind;
  runtimeTrackingImplemented: false;
  portalUiImplemented: false;
}>;

export type HrPayslipPublishingEngineBoundaryContract = Readonly<{
  key: string;
  calculationProducesPayrollResults: true;
  validationApprovesPayroll: true;
  publishingExposesPayrollToEmployees: true;
  employeePortalConsumesPublishedPayrollOnly: true;
  neverExposeDraftUnapprovedOrUnpublishedPayroll: true;
  publishingIndependentFromCalculation: true;
  publishingIndependentFromApprovalExecution: true;
  publishingFullyAuditable: true;
  pdfRenderingImplemented: false;
  emailDeliveryImplemented: false;
  smsDeliveryImplemented: false;
  whatsappDeliveryImplemented: false;
  mobileAppImplemented: false;
  employeePortalUiImplemented: false;
  localizationImplemented: false;
  digitalSignatureImplemented: false;
  publishingRuntimeImplemented: false;
  processingFlow: readonly [
    "validate_publishing_rules",
    "generate_payslip_readiness",
    "pending_publish",
    "publish_batch",
    "expose_to_portal",
    "audit_publication",
  ];
}>;

export type HrPayslipPublishingNotificationIntegrationContract = Readonly<{
  key: string;
  referencesPlatformNotificationContracts: true;
  directEngineCoupling: false;
  emailDeliveryImplemented: false;
  smsDeliveryImplemented: false;
  whatsappDeliveryImplemented: false;
  notificationRuntimeImplemented: false;
}>;

export function defineHrPayslipPublication<T extends HrPayslipPublicationDefinition>(definition: T): T {
  return definition;
}

export function defineHrEmployeePayrollPortalPreferences<T extends HrEmployeePayrollPortalPreferencesDefinition>(
  definition: T
): T {
  return definition;
}

export function createHrPayslipSecureAccessContract(input: Readonly<{
  accessMode: HrPayslipSecureAccessMode;
  employeeId: string;
  expiresAt?: string | null;
  payslipId: string;
}>): HrPayslipSecureAccessContract {
  return {
    ...input,
    authRuntimeImplemented: false,
    downloadAuthorizationImplemented: false,
    revocable: true,
  };
}

export function createHrPayslipVisibilityRule(input: HrPayslipVisibilityRuleDefinition): HrPayslipVisibilityRuleDefinition {
  return input;
}

export function payslipPublishingValidationPasses(input: HrPayslipPublishingValidationInput): boolean {
  return (
    input.payrollApproved
    && input.validationPassed
    && input.blockingExceptionsCleared
    && input.payslipGenerated
    && input.employeeActive
  );
}

export function payslipIsVisibleToEmployee(rule: HrPayslipVisibilityRuleDefinition): boolean {
  return (
    rule.employeeOwnsPayslip
    && rule.payrollApproved
    && rule.payslipPublished
    && rule.employeeHasPermission
  );
}

export function payslipPublishingStatusAllowsPublish(status: HrPayslipPublishingStatus): boolean {
  return status === "generated" || status === "pending_publish" || status === "unpublished";
}

export const HR_PAYSLIP_PUBLISHING_STATUSES = [
  "draft",
  "generated",
  "pending_publish",
  "published",
  "unpublished",
  "archived",
] as const satisfies readonly HrPayslipPublishingStatus[];

export const HR_PAYSLIP_PUBLICATION_SCOPES = [
  "single_employee",
  "payroll_group",
  "payroll_run",
] as const satisfies readonly HrPayslipPublicationScope[];

export const HR_PAYSLIP_PUBLICATION_ACTIONS = [
  "publish",
  "republish",
  "unpublish",
  "revoke",
] as const satisfies readonly HrPayslipPublicationAction[];

export const HR_PAYSLIP_SECURE_ACCESS_MODES = [
  "portal_session",
  "temporary_access",
  "download_authorization",
] as const satisfies readonly HrPayslipSecureAccessMode[];

export const HR_EMPLOYEE_PAYROLL_PORTAL_SURFACES = [
  "my_payslips",
  "payroll_history",
  "payroll_details",
  "payroll_components",
  "payroll_summary",
] as const satisfies readonly HrEmployeePayrollPortalSurface[];

export const HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_KINDS = [
  "viewed",
  "downloaded",
  "acknowledged",
] as const satisfies readonly HrEmployeePayrollAcknowledgementKind[];

export const HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS: readonly HrEmployeePayrollPortalContract[] = [
  {
    consumesPublishedPayrollOnly: true,
    exposesDraftPayroll: false,
    exposesUnapprovedPayroll: false,
    exposesUnpublishedPayroll: false,
    portalUiImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
    surface: "my_payslips",
  },
  {
    consumesPublishedPayrollOnly: true,
    exposesDraftPayroll: false,
    exposesUnapprovedPayroll: false,
    exposesUnpublishedPayroll: false,
    portalUiImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
    surface: "payroll_history",
  },
  {
    consumesPublishedPayrollOnly: true,
    exposesDraftPayroll: false,
    exposesUnapprovedPayroll: false,
    exposesUnpublishedPayroll: false,
    portalUiImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
    surface: "payroll_details",
  },
  {
    consumesPublishedPayrollOnly: true,
    exposesDraftPayroll: false,
    exposesUnapprovedPayroll: false,
    exposesUnpublishedPayroll: false,
    portalUiImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
    surface: "payroll_components",
  },
  {
    consumesPublishedPayrollOnly: true,
    exposesDraftPayroll: false,
    exposesUnapprovedPayroll: false,
    exposesUnpublishedPayroll: false,
    portalUiImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
    surface: "payroll_summary",
  },
];

export const HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_READINESS: readonly HrEmployeePayrollAcknowledgementReadinessContract[] =
  HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_KINDS.map((acknowledgementKind) => ({
    acknowledgementKind,
    portalUiImplemented: false,
    runtimeTrackingImplemented: false,
  }));

export const HR_PAYSLIP_PUBLISHING_ENGINE_BOUNDARY_CONTRACT: HrPayslipPublishingEngineBoundaryContract = {
  calculationProducesPayrollResults: true,
  digitalSignatureImplemented: false,
  emailDeliveryImplemented: false,
  employeePortalConsumesPublishedPayrollOnly: true,
  employeePortalUiImplemented: false,
  key: "hr.payslip.publishing.boundary",
  localizationImplemented: false,
  mobileAppImplemented: false,
  neverExposeDraftUnapprovedOrUnpublishedPayroll: true,
  pdfRenderingImplemented: false,
  processingFlow: [
    "validate_publishing_rules",
    "generate_payslip_readiness",
    "pending_publish",
    "publish_batch",
    "expose_to_portal",
    "audit_publication",
  ],
  publishingExposesPayrollToEmployees: true,
  publishingFullyAuditable: true,
  publishingIndependentFromApprovalExecution: true,
  publishingIndependentFromCalculation: true,
  publishingRuntimeImplemented: false,
  smsDeliveryImplemented: false,
  validationApprovesPayroll: true,
  whatsappDeliveryImplemented: false,
};

export const HR_PAYSLIP_PUBLISHING_NOTIFICATION_INTEGRATION_CONTRACT: HrPayslipPublishingNotificationIntegrationContract =
  {
    directEngineCoupling: false,
    emailDeliveryImplemented: false,
    key: "hr.payslip.publishing.notification-integration",
    notificationRuntimeImplemented: false,
    referencesPlatformNotificationContracts: true,
    smsDeliveryImplemented: false,
    whatsappDeliveryImplemented: false,
  };

export const HR_PAYSLIP_PUBLISHING_VALIDATION_RULES = [
  { key: "payroll_must_be_approved", message: "Publishing requires approved payroll.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "validation_must_pass", message: "Publishing requires passed validation.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "no_blocking_exceptions", message: "Publishing blocked while exceptions remain.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "payslip_must_be_generated", message: "Payslip must be generated before publishing.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "employee_active_where_applicable", message: "Employee must be active where applicable.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "no_visibility_before_publish", message: "No payslip may become visible before successful publishing.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "portal_consumes_published_only", message: "Employee portal must consume published payroll only.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "no_pdf_rendering_runtime", message: "PDF rendering is not implemented.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "no_email_delivery_runtime", message: "Email delivery is not implemented.", severity: "error" as const, publishingRuntimeImplemented: false as const },
  { key: "no_employee_portal_ui", message: "Employee portal UI is not implemented.", severity: "error" as const, publishingRuntimeImplemented: false as const },
];

export const HR_PAYSLIP_PUBLISHING_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payslip.publishing.platform-integration",
  notificationReadinessRegistered: true,
  observabilityReadinessRegistered: true,
  printReadinessRegistered: true,
  reportReadinessRegistered: true,
  searchRegistered: true,
  runtimePublishingImplemented: false,
} as const;

export const HR_PAYSLIP_PUBLISHING_REPORT_READINESS = {
  dashboardDatasets: ["published_payslips", "publishing_history", "employee_payroll_history"] as const,
  key: "hr.payslip.publishing.report-readiness",
  reportDatasets: ["payslip_publication_summary", "employee_payroll_history", "publishing_audit"] as const,
  runtimeReportGenerationImplemented: false,
} as const;

const hrPayslipPublishingImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: true,
  requiredDataScopes: ["tenant", "company", "branch", "employee-self"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_PAYSLIP_PUBLISHING_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "payslipId", label: "Payslip ID", required: true },
    { dataType: "text", key: "publicationScope", label: "Publication Scope", required: true },
    { dataType: "text", key: "publishingStatus", label: "Publishing Status", required: true },
  ],
  key: "hr.payslip.publishing.import",
  label: "HR Payslip Publishing Import",
  mappings: [
    { key: "payslip-id", sourceColumn: "Payslip ID", targetField: "payslipId" },
    { key: "publication-scope", sourceColumn: "Publication Scope", targetField: "publicationScope" },
    { key: "publishing-status", sourceColumn: "Publishing Status", targetField: "publishingStatus" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { publishingFoundationOnly: true, publishingRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayslipPublishingImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "payslipId", key: "payslip-id-required", message: "Payslip ID is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYSLIP_PUBLISHING_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "payslipId", label: "Payslip ID", order: 1, sourceField: "payslipId" },
    { dataType: "text", key: "publishingStatus", label: "Publishing Status", order: 2, sourceField: "publishingStatus" },
    { dataType: "text", key: "publishedAt", label: "Published At", order: 3, sourceField: "publishedAt" },
  ],
  key: "hr.payslip.publishing.export",
  label: "HR Payslip Publishing Export",
  mappings: [
    { key: "payslip-id", sourceField: "payslipId", targetColumn: "Payslip ID" },
    { key: "publishing-status", sourceField: "publishingStatus", targetColumn: "Publishing Status" },
    { key: "published-at", sourceField: "publishedAt", targetColumn: "Published At" },
  ],
  metadata: {
    fileNameTemplate: "hr-payslip-publishing-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayslipPublishingImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYSLIP_PUBLISHING_EVENT_DEFINITIONS = [
  "PayslipPublished",
  "PayslipRepublished",
  "PayslipRevoked",
  "PayslipUnpublished",
  "PayslipPublicationArchived",
  "EmployeePayrollPortalPreferencesUpdated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payslip Publishing & Employee Payroll Portal Foundation. No PDF, email, SMS, WhatsApp, or portal UI runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYSLIP_PUBLISHING_AUDIT_ACTIONS = {
  payslipPublicationArchived: defineAuditAction("hr.payslip.publishing.archived"),
  payslipPublished: defineAuditAction("hr.payslip.publishing.published"),
  payslipRepublished: defineAuditAction("hr.payslip.publishing.republished"),
  payslipRevoked: defineAuditAction("hr.payslip.publishing.revoked"),
  payslipUnpublished: defineAuditAction("hr.payslip.publishing.unpublished"),
  portalPreferencesUpdated: defineAuditAction("hr.payslip.portal.preferences.updated"),
} as const;

export const HR_PAYSLIP_PUBLISHING_FOUNDATION_TABLES = [
  "hr_payslip_publications",
  "hr_employee_payroll_portal_preferences",
] as const;

export const HR_PAYSLIP_PUBLISHING_RELATED_TABLES = ["hr_payslips", "hr_payslip_lines"] as const;

export const HR_PAYSLIP_PUBLISHING_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payslipsPublish, scope: "tenant-company-branch", entity: "payslip-publish" },
  { key: HR_PERMISSIONS.payslipsUnpublish, scope: "tenant-company-branch", entity: "payslip-unpublish" },
  { key: HR_PERMISSIONS.payslipsView, scope: "tenant-company-branch", entity: "payslip" },
  { key: HR_PERMISSIONS.payslipsViewSelf, scope: "employee-self", entity: "payslip-self" },
  { key: HR_PERMISSIONS.payslipsAuditView, scope: "tenant-company-branch", entity: "payslip-publishing-audit" },
] as const;

export const HR_PAYSLIP_PUBLISHING_OBSERVABILITY_CONTRACT = {
  correlationIdField: "correlation_id",
  downloadedAtField: "downloaded_at",
  employeeField: "employee_id",
  key: "hr.payslip.publishing.observability",
  payrollRunField: "payroll_run_id",
  payslipField: "payslip_id",
  publishedAtField: "published_at",
  publishedByField: "published_by",
  publishingStatusField: "publishing_status",
  revokedAtField: "revoked_at",
  revokedByField: "revoked_by",
  viewedAtField: "viewed_at",
} as const;

export const HR_PAYSLIP_PUBLISHING_VISIBILITY_MODEL = {
  adminAccessRespectsSecurityEngine: true,
  employeeOwnsPayslipRequired: true,
  employeePermissionRequired: true,
  key: "hr.payslip.publishing.visibility",
  payrollApprovedRequired: true,
  payslipPublishedRequired: true,
  visibilityRuntimeImplemented: false,
} as const;

export const HR_PAYSLIP_PUBLISHING_SECURITY_MODEL = {
  branchScopeEnforced: true,
  companyScopeEnforced: true,
  employeeSelfScopeEnforced: true,
  key: "hr.payslip.publishing.security",
  publishedPayrollOnlyForEmployees: true,
  rlsEnforced: true,
  securityEngineRespectedForAdminAccess: true,
  tenantScopeEnforced: true,
} as const;
