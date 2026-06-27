import type {
  DataScope,
  Entitlement,
  Permission,
  PermissionCategory,
  PermissionGroup,
  PermissionResolutionReason,
  Role,
  SecurityMetadata,
} from "./contracts";

export const DEFAULT_SECURITY_METADATA: SecurityMetadata = {
  auditRequired: false,
  requiresApproval: false,
  riskLevel: "standard",
  sensitiveData: false,
  temporaryElevationAllowed: false,
};

export function defineSecurityMetadata(
  metadata: Partial<SecurityMetadata> = {},
): SecurityMetadata {
  return {
    ...DEFAULT_SECURITY_METADATA,
    ...metadata,
  };
}

export function definePermission<TPermission extends Permission>(
  permission: TPermission,
): TPermission {
  return permission;
}

export function definePermissionCategory<TCategory extends PermissionCategory>(
  category: TCategory,
): TCategory {
  return category;
}

export function definePermissionGroup<TGroup extends PermissionGroup>(
  group: TGroup,
): TGroup {
  return group;
}

export function defineSystemRole<TRole extends Role>(
  role: TRole & { type: "system"; isSystemRole: true },
): TRole {
  return role;
}

export function defineCustomRole<TRole extends Role>(
  role: TRole & { type: "custom"; isSystemRole: false },
): TRole {
  return role;
}

export function defineEntitlement<TEntitlement extends Entitlement>(
  entitlement: TEntitlement,
): TEntitlement {
  return entitlement;
}

export function defineDataScope<TScope extends DataScope>(scope: TScope): TScope {
  return scope;
}

export function deniedReason(
  stage: PermissionResolutionReason["stage"],
  code: string,
  message: string,
): PermissionResolutionReason {
  return { code, message, stage };
}

