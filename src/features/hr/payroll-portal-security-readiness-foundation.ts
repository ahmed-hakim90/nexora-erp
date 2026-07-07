import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollPortalSecurityScopeKind =
  | "employee-self"
  | "manager-team"
  | "hr-admin"
  | "payroll-admin";

export type HrPayrollSensitiveFieldClassification =
  | "public_summary"
  | "employee_self"
  | "manager_redacted"
  | "payroll_admin_only"
  | "restricted_pii";

export type HrPayrollSecureAccessTokenKind =
  | "portal_session"
  | "temporary_access"
  | "download_authorization";

export type HrPayrollSecureAccessTokenStatus = "active" | "expired" | "revoked" | "consumed";

export type HrPayrollEssMssSurfaceKind = "ess" | "mss";

export type HrPayrollPortalSecurityScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollEmployeePayslipVisibilityRuleDefinition = Readonly<{
  employeeOwnsPayslip: boolean;
  payrollApproved: boolean;
  payslipPublished: boolean;
  employeeHasPermission: boolean;
  portalSecurityReadinessEnforced: true;
  adminAccessRespectsSecurityEngine: true;
  exposesDraftPayroll: false;
  exposesUnapprovedPayroll: false;
  exposesUnpublishedPayroll: false;
}>;

export type HrPayrollManagerScopeReadinessDefinition = Readonly<{
  scopeKind: "manager-team";
  managerEmployeeId: string;
  teamMemberEmployeeIds: readonly string[];
  canViewTeamPayrollSummary: false;
  canViewTeamPayslipDetails: false;
  mssRuntimeImplemented: false;
}>;

export type HrPayrollAdminScopeReadinessDefinition = Readonly<{
  scopeKind: "hr-admin" | "payroll-admin";
  requiredPermissions: readonly string[];
  respectsBranchScope: true;
  respectsCompanyScope: true;
  respectsTenantScope: true;
  bypassesPublicationGate: false;
  adminRuntimeImplemented: false;
}>;

export type HrPayrollSensitiveFieldClassificationDefinition = Readonly<{
  fieldKey: string;
  entity: "payslip" | "payroll_result" | "payroll_result_component";
  classification: HrPayrollSensitiveFieldClassification;
  visibleToEmployeeSelf: boolean;
  visibleToManager: boolean;
  visibleToPayrollAdmin: boolean;
  maskingRequired: boolean;
}>;

export type HrPayrollSecureAccessTokenContract = Readonly<{
  tokenKind: HrPayrollSecureAccessTokenKind;
  payslipId: string;
  employeeId: string;
  expiresAt?: string | null;
  status: HrPayrollSecureAccessTokenStatus;
  revocable: true;
  extendsSprint18SecureAccess: true;
  authRuntimeImplemented: false;
  downloadAuthorizationImplemented: false;
}>;

export type HrPayrollDownloadAuthorizationContract = Readonly<{
  payslipId: string;
  employeeId: string;
  authorizedBy?: string | null;
  expiresAt?: string | null;
  requiredPermission: string;
  downloadRuntimeImplemented: false;
}>;

export type HrPayrollAccessRevocationContract = Readonly<{
  payslipId: string;
  employeeId: string;
  revokedBy: string;
  revokedAt: string;
  revocationReason?: string | null;
  tokenRevocationImplemented: false;
  publicationRevocationUsesSprint18: true;
}>;

export type HrPayrollPortalNotificationReadinessContract = Readonly<{
  key: string;
  referencesPlatformNotificationContracts: true;
  directEngineCoupling: false;
  emailDeliveryImplemented: false;
  smsDeliveryImplemented: false;
  whatsappDeliveryImplemented: false;
  notificationRuntimeImplemented: false;
}>;

export type HrPayrollEssReadinessContract = Readonly<{
  surfaceKind: "ess";
  surfaces: readonly ["my_payslips", "payroll_history", "payroll_details", "payroll_components", "payroll_summary"];
  consumesPublishedPayrollOnly: true;
  requiredPermission: string;
  essUiImplemented: false;
}>;

export type HrPayrollMssReadinessContract = Readonly<{
  surfaceKind: "mss";
  surfaces: readonly ["team_payroll_summary", "team_attendance_payroll_impact"];
  managerScopeRequired: true;
  exposesIndividualPayslipNumbers: false;
  mssUiImplemented: false;
}>;

export type HrPayrollPortalSecurityReadinessBoundaryContract = Readonly<{
  key: string;
  buildsOnSprint18PayslipPublishing: true;
  employeeVisibilityRequiresPublication: true;
  neverExposeDraftUnapprovedOrUnpublishedPayroll: true;
  secureAccessTokensExtendSprint18: true;
  downloadAuthorizationContractOnly: true;
  revocationContractOnly: true;
  essUiImplemented: false;
  mssUiImplemented: false;
  authRewriteImplemented: false;
  emailDeliveryImplemented: false;
  smsDeliveryImplemented: false;
  whatsappDeliveryImplemented: false;
  processingFlow: readonly [
    "resolve_visibility_scope",
    "classify_sensitive_fields",
    "validate_secure_access_token",
    "authorize_download",
    "process_revocation",
    "notification_readiness",
    "ess_mss_contract_gate",
  ];
}>;

export function createHrPayrollEmployeePayslipVisibilityRule(
  input: HrPayrollEmployeePayslipVisibilityRuleDefinition,
): HrPayrollEmployeePayslipVisibilityRuleDefinition {
  return input;
}

export function createHrPayrollSecureAccessTokenContract(input: Readonly<{
  employeeId: string;
  expiresAt?: string | null;
  payslipId: string;
  status?: HrPayrollSecureAccessTokenStatus;
  tokenKind: HrPayrollSecureAccessTokenKind;
}>): HrPayrollSecureAccessTokenContract {
  return {
    ...input,
    authRuntimeImplemented: false,
    downloadAuthorizationImplemented: false,
    extendsSprint18SecureAccess: true,
    revocable: true,
    status: input.status ?? "active",
  };
}

export function createHrPayrollDownloadAuthorizationContract(input: Readonly<{
  employeeId: string;
  expiresAt?: string | null;
  payslipId: string;
}>): HrPayrollDownloadAuthorizationContract {
  return {
    ...input,
    authorizedBy: null,
    downloadRuntimeImplemented: false,
    requiredPermission: HR_PERMISSIONS.payslipsDownloadAuthorize,
  };
}

export function employeePayslipVisibilityPasses(rule: HrPayrollEmployeePayslipVisibilityRuleDefinition): boolean {
  return (
    rule.employeeOwnsPayslip
    && rule.payrollApproved
    && rule.payslipPublished
    && rule.employeeHasPermission
    && rule.exposesDraftPayroll === false
    && rule.exposesUnapprovedPayroll === false
    && rule.exposesUnpublishedPayroll === false
  );
}

export function secureAccessTokenAllowsRead(token: Pick<HrPayrollSecureAccessTokenContract, "status">): boolean {
  return token.status === "active";
}

export const HR_PAYROLL_PORTAL_SECURITY_SCOPE_KINDS = [
  "employee-self",
  "manager-team",
  "hr-admin",
  "payroll-admin",
] as const satisfies readonly HrPayrollPortalSecurityScopeKind[];

export const HR_PAYROLL_SENSITIVE_FIELD_CLASSIFICATIONS = [
  "public_summary",
  "employee_self",
  "manager_redacted",
  "payroll_admin_only",
  "restricted_pii",
] as const satisfies readonly HrPayrollSensitiveFieldClassification[];

export const HR_PAYROLL_SECURE_ACCESS_TOKEN_KINDS = [
  "portal_session",
  "temporary_access",
  "download_authorization",
] as const satisfies readonly HrPayrollSecureAccessTokenKind[];

export const HR_PAYROLL_SECURE_ACCESS_TOKEN_STATUSES = [
  "active",
  "expired",
  "revoked",
  "consumed",
] as const satisfies readonly HrPayrollSecureAccessTokenStatus[];

export const HR_PAYROLL_SENSITIVE_FIELD_REGISTRY: readonly HrPayrollSensitiveFieldClassificationDefinition[] = [
  { classification: "public_summary", entity: "payslip", fieldKey: "period_label", maskingRequired: false, visibleToEmployeeSelf: true, visibleToManager: true, visibleToPayrollAdmin: true },
  { classification: "employee_self", entity: "payroll_result", fieldKey: "net_pay", maskingRequired: false, visibleToEmployeeSelf: true, visibleToManager: false, visibleToPayrollAdmin: true },
  { classification: "manager_redacted", entity: "payroll_result", fieldKey: "gross_earnings", maskingRequired: true, visibleToEmployeeSelf: false, visibleToManager: true, visibleToPayrollAdmin: true },
  { classification: "payroll_admin_only", entity: "payroll_result_component", fieldKey: "employer_contribution", maskingRequired: false, visibleToEmployeeSelf: false, visibleToManager: false, visibleToPayrollAdmin: true },
  { classification: "restricted_pii", entity: "payslip", fieldKey: "bank_account_ref", maskingRequired: true, visibleToEmployeeSelf: true, visibleToManager: false, visibleToPayrollAdmin: true },
];

export const HR_PAYROLL_ESS_READINESS_CONTRACT: HrPayrollEssReadinessContract = {
  consumesPublishedPayrollOnly: true,
  essUiImplemented: false,
  requiredPermission: HR_PERMISSIONS.payslipsViewSelf,
  surfaceKind: "ess",
  surfaces: ["my_payslips", "payroll_history", "payroll_details", "payroll_components", "payroll_summary"],
};

export const HR_PAYROLL_MSS_READINESS_CONTRACT: HrPayrollMssReadinessContract = {
  exposesIndividualPayslipNumbers: false,
  managerScopeRequired: true,
  mssUiImplemented: false,
  surfaceKind: "mss",
  surfaces: ["team_payroll_summary", "team_attendance_payroll_impact"],
};

export const HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT: HrPayrollPortalSecurityReadinessBoundaryContract =
  {
    authRewriteImplemented: false,
    buildsOnSprint18PayslipPublishing: true,
    downloadAuthorizationContractOnly: true,
    emailDeliveryImplemented: false,
    employeeVisibilityRequiresPublication: true,
    essUiImplemented: false,
    key: "hr.payroll.portal-security-readiness.boundary",
    mssUiImplemented: false,
    neverExposeDraftUnapprovedOrUnpublishedPayroll: true,
    processingFlow: [
      "resolve_visibility_scope",
      "classify_sensitive_fields",
      "validate_secure_access_token",
      "authorize_download",
      "process_revocation",
      "notification_readiness",
      "ess_mss_contract_gate",
    ],
    revocationContractOnly: true,
    secureAccessTokensExtendSprint18: true,
    smsDeliveryImplemented: false,
    whatsappDeliveryImplemented: false,
  };

export const HR_PAYROLL_PORTAL_NOTIFICATION_READINESS_CONTRACT: HrPayrollPortalNotificationReadinessContract = {
  directEngineCoupling: false,
  emailDeliveryImplemented: false,
  key: "hr.payroll.portal.notification-readiness",
  notificationRuntimeImplemented: false,
  referencesPlatformNotificationContracts: true,
  smsDeliveryImplemented: false,
  whatsappDeliveryImplemented: false,
};

export const HR_PAYROLL_PORTAL_SECURITY_VALIDATION_RULES = [
  { key: "employee_visibility_requires_publication", message: "Employee payslip visibility requires published status.", runtimeImplemented: false },
  { key: "download_requires_authorization_permission", message: "Payslip download requires download authorization permission.", runtimeImplemented: false },
  { key: "revocation_extends_sprint18", message: "Access revocation extends Sprint 18 publication revocation.", runtimeImplemented: false },
  { key: "manager_scope_no_individual_payslip_numbers", message: "Manager scope must not expose individual payslip numbers in MSS foundation.", runtimeImplemented: false },
  { key: "sensitive_fields_classified", message: "Sensitive payroll fields must use classification registry.", runtimeImplemented: false },
  { key: "no_ess_mss_ui", message: "ESS/MSS UI is not implemented.", runtimeImplemented: false },
] as const;

export const HR_PAYROLL_PORTAL_SECURITY_EVENT_DEFINITIONS = [
  "PayrollSecureAccessTokenIssued",
  "PayrollSecureAccessTokenRevoked",
  "PayrollDownloadAuthorized",
  "PayrollDownloadRevoked",
  "PayrollPortalNotificationReadinessRegistered",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for Payroll Portal Security Readiness Foundation. No auth rewrite, email, SMS, WhatsApp, or ESS/MSS UI runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  }),
);

export const HR_PAYROLL_PORTAL_SECURITY_AUDIT_ACTIONS = {
  downloadAuthorized: defineAuditAction("hr.payroll.portal.download.authorized"),
  downloadRevoked: defineAuditAction("hr.payroll.portal.download.revoked"),
  secureAccessTokenIssued: defineAuditAction("hr.payroll.portal.secure-access-token.issued"),
  secureAccessTokenRevoked: defineAuditAction("hr.payroll.portal.secure-access-token.revoked"),
} as const;

export const HR_PAYROLL_PORTAL_SECURITY_FOUNDATION_TABLES = [
  "hr_payroll_secure_access_tokens",
  "hr_payroll_sensitive_field_registry",
] as const;

export const HR_PAYROLL_PORTAL_SECURITY_RELATED_TABLES = [
  "hr_payslip_publications",
  "hr_employee_payroll_portal_preferences",
] as const;

export const HR_PAYROLL_PORTAL_SECURITY_PERMISSION_METADATA = [
  { entity: "payroll-portal-security", key: HR_PERMISSIONS.payrollPortalSecurityView, scope: "tenant-company-branch" },
  { entity: "payroll-portal-security-manage", key: HR_PERMISSIONS.payrollPortalSecurityManage, scope: "tenant-company-branch" },
  { entity: "payslip-download-authorize", key: HR_PERMISSIONS.payslipsDownloadAuthorize, scope: "employee-self" },
  { entity: "payslip-access-revoke", key: HR_PERMISSIONS.payslipsAccessRevoke, scope: "tenant-company-branch" },
  { entity: "payroll-ess-readiness", key: HR_PERMISSIONS.payrollEssReadinessView, scope: "employee-self" },
  { entity: "payroll-mss-readiness", key: HR_PERMISSIONS.payrollMssReadinessView, scope: "manager-team" },
] as const;

export const HR_PAYROLL_PORTAL_SECURITY_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  buildsOnSprint18PayslipPublishing: true,
  essUiImplemented: false,
  eventBusRegistered: true,
  key: "hr.payroll.portal-security-readiness.platform-integration",
  mssUiImplemented: false,
  notificationReadinessRegistered: true,
  portalSecurityRuntimeImplemented: false,
} as const;
