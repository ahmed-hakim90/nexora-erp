import type { PermissionKey } from "./permission-key";

export type PermissionSet = ReadonlySet<PermissionKey>;

export type PermissionRiskLevel = "low" | "standard" | "high" | "critical";

export type PermissionExperience =
  | "erp"
  | "portal"
  | "admin"
  | "marketplace"
  | "connector"
  | "automation"
  | "ai"
  | "sandbox"
  | "system";

export type PermissionDefinition = Readonly<{
  key: PermissionKey;
  label: string;
  description: string;
  moduleKey: string;
  resource: string;
  action: string;
  riskLevel: PermissionRiskLevel;
  experiences: readonly PermissionExperience[];
  viewsSensitiveData?: boolean;
  mutatesOfficialRecords?: boolean;
  requiresAudit?: boolean;
  supportsTemporaryElevation?: boolean;
}>;

export type RoleDefinition = Readonly<{
  key: string;
  label: string;
  description?: string;
  permissionKeys: readonly PermissionKey[];
  isSystemTemplate?: boolean;
}>;

export type AssignmentScope = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  employeeId?: string | null;
  appKey?: string | null;
  experience?: PermissionExperience | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}>;

export type EntitlementCheck = Readonly<{
  tenantId: string;
  appKey: string;
  companyId?: string | null;
  branchId?: string | null;
  requiredCapability?: string;
}>;

export type DataScope = Readonly<{
  tenantId: string;
  companyIds?: readonly string[];
  branchIds?: readonly string[];
  employeeIds?: readonly string[];
  canAccessCrossCompany?: boolean;
  canAccessCrossBranch?: boolean;
}>;

export type SegregationOfDutiesCheck = Readonly<{
  actorUserId: string;
  requestedByUserId?: string | null;
  action: PermissionKey;
  allowSelfApproval?: boolean;
  conflictingPermissions?: readonly PermissionKey[];
}>;

export function hasPermission(
  permissions: PermissionSet,
  permission: PermissionKey,
): boolean {
  return permissions.has(permission);
}

export function hasEveryPermission(
  permissions: PermissionSet,
  required: readonly PermissionKey[],
): boolean {
  return required.every((permission) => permissions.has(permission));
}

export function definePermissionDefinition<TDefinition extends PermissionDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function isAssignmentActive(
  scope: AssignmentScope,
  now = new Date().toISOString(),
): boolean {
  if (scope.effectiveFrom && scope.effectiveFrom > now) {
    return false;
  }

  if (scope.effectiveTo && scope.effectiveTo < now) {
    return false;
  }

  return true;
}

export function checkSegregationOfDuties(
  check: SegregationOfDutiesCheck,
  grantedPermissions: PermissionSet,
): boolean {
  if (
    check.allowSelfApproval !== true &&
    check.requestedByUserId &&
    check.actorUserId === check.requestedByUserId
  ) {
    return false;
  }

  return !(check.conflictingPermissions ?? []).some((permission) =>
    grantedPermissions.has(permission),
  );
}
