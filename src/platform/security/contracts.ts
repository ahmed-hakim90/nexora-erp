import type { AccessExperience } from "@/core/context";
import type { PlatformIdentity, PlatformPrincipal } from "@/platform/auth/public-api";
import type { PermissionKey } from "@/platform/permissions/permission-key";

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "update",
  "edit",
  "delete",
  "approve",
  "archive",
  "restore",
  "print",
  "export",
  "import",
  "execute",
  "manage",
] as const;

export const RESOURCE_PERMISSION_ACTIONS = [
  "view",
  "edit",
  "delete",
  "archive",
  "restore",
  "export",
  "print",
  "approve",
  "execute",
] as const;

export const DATA_SCOPE_KINDS = [
  "tenant",
  "company",
  "branch",
  "department",
  "team",
  "employee",
  "self",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type ResourcePermissionAction = (typeof RESOURCE_PERMISSION_ACTIONS)[number];
export type PermissionRiskLevel = "low" | "standard" | "high" | "critical";
export type RoleType = "system" | "custom";
export type EntitlementStatus = "active" | "trial" | "suspended" | "expired" | "disabled";
export type DataScopeKind = (typeof DATA_SCOPE_KINDS)[number];
export type SecurityDecision = "allowed" | "denied";

export type SecurityMetadata = Readonly<{
  riskLevel: PermissionRiskLevel;
  auditRequired: boolean;
  sensitiveData: boolean;
  requiresApproval: boolean;
  requiresMfa?: boolean;
  temporaryElevationAllowed?: boolean;
  featureFlagKey?: string;
  dataScopeRequired?: boolean;
  tags?: readonly string[];
}>;

export type PermissionCategory = Readonly<{
  key: string;
  label: string;
  description?: string;
  sortOrder?: number;
}>;

export type PermissionGroup = Readonly<{
  key: string;
  categoryKey: string;
  label: string;
  description?: string;
  permissionKeys: readonly PermissionKey[];
  sortOrder?: number;
}>;

export type Permission = Readonly<{
  key: PermissionKey;
  label: string;
  description: string;
  ownerKey: string;
  resource: string;
  action: PermissionAction;
  categoryKey: string;
  groupKey: string;
  experiences: readonly AccessExperience[];
  metadata: SecurityMetadata;
}>;

export type Role = Readonly<{
  key: string;
  label: string;
  description?: string;
  type: RoleType;
  permissionKeys: readonly PermissionKey[];
  tenantId?: string | null;
  isAssignable: boolean;
  isSystemRole: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type Entitlement = Readonly<{
  key: string;
  tenantId: string;
  appKey: string;
  status: EntitlementStatus;
  capabilityKey?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DataScope = Readonly<{
  kind: DataScopeKind;
  tenantId: string;
  companyIds?: readonly string[];
  branchIds?: readonly string[];
  departmentIds?: readonly string[];
  teamIds?: readonly string[];
  employeeIds?: readonly string[];
  selfUserId?: string | null;
  unrestricted?: boolean;
}>;

export type RoleAssignment = Readonly<{
  role: Role;
  scope: DataScope;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}>;

export type ProtectedResource = Readonly<{
  key: string;
  ownerKey: string;
  supportedActions: readonly ResourcePermissionAction[];
  requiredEntitlementKey?: string;
  requiredDataScope?: DataScopeKind;
}>;

export type PermissionResolutionIdentity = Readonly<{
  userId: string;
  identityId: string;
  principalId: string;
  identity?: PlatformIdentity;
  principal?: PlatformPrincipal;
}>;

export type FeatureFlagCheck = Readonly<{
  key: string;
  enabled: boolean;
}>;

export type TemporaryElevationRequest = Readonly<{
  requestedPermission: PermissionKey;
  reason: string;
  expiresAt: string;
  approvedByUserId?: string | null;
  ticketReference?: string | null;
}>;

export type PermissionResolutionRequest = Readonly<{
  identity: PermissionResolutionIdentity;
  experience: AccessExperience;
  tenantId: string;
  permission: PermissionKey;
  entitlementKey?: string;
  resource?: ProtectedResource;
  requestedDataScope?: DataScope;
  featureFlags?: readonly FeatureFlagCheck[];
  temporaryElevation?: TemporaryElevationRequest;
  now?: string;
}>;

export type PermissionResolutionStage =
  | "identity"
  | "experience"
  | "entitlement"
  | "role"
  | "permission"
  | "data-scope"
  | "feature-flag"
  | "temporary-elevation";

export type PermissionResolutionReason = Readonly<{
  stage: PermissionResolutionStage;
  code: string;
  message: string;
}>;

export type PermissionResolutionResult = Readonly<{
  decision: SecurityDecision;
  allowed: boolean;
  permission: PermissionKey;
  tenantId: string;
  identity: PermissionResolutionIdentity;
  resolvedPermission?: Permission;
  matchedRoles: readonly Role[];
  effectiveDataScopes: readonly DataScope[];
  entitlement?: Entitlement;
  reasons: readonly PermissionResolutionReason[];
}>;

export type PermissionResolverSource = Readonly<{
  getPermission(permission: PermissionKey): Promise<Permission | undefined>;
  getRoleAssignments(request: PermissionResolutionRequest): Promise<readonly RoleAssignment[]>;
  getEntitlement(request: PermissionResolutionRequest): Promise<Entitlement | undefined>;
  getDataScopes(request: PermissionResolutionRequest): Promise<readonly DataScope[]>;
  isFeatureEnabled(request: PermissionResolutionRequest, flagKey: string): Promise<boolean>;
}>;

