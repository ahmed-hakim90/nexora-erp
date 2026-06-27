import type { PermissionKey } from "@/platform/permissions/permission-key";

import type {
  DataScope,
  Entitlement,
  Permission,
  PermissionResolutionRequest,
  PermissionResolutionResult,
  PermissionResolverSource,
  Role,
  RoleAssignment,
} from "./contracts";
import { deniedReason } from "./definitions";

const ACTIVE_ENTITLEMENT_STATUSES: readonly Entitlement["status"][] = ["active", "trial"];

function isActiveWindow(
  effectiveFrom: string | null | undefined,
  effectiveTo: string | null | undefined,
  now: string,
): boolean {
  if (effectiveFrom && effectiveFrom > now) {
    return false;
  }

  if (effectiveTo && effectiveTo <= now) {
    return false;
  }

  return true;
}

function roleGrantsPermission(assignment: RoleAssignment, permission: PermissionKey): boolean {
  return assignment.role.permissionKeys.includes(permission);
}

function dataScopeMatches(required: DataScope | undefined, granted: DataScope): boolean {
  if (!required) {
    return true;
  }

  if (granted.unrestricted || granted.kind === "tenant") {
    return granted.tenantId === required.tenantId;
  }

  if (granted.tenantId !== required.tenantId) {
    return false;
  }

  if (required.companyIds?.length) {
    const grantedCompanyIds = new Set(granted.companyIds ?? []);
    if (!required.companyIds.every((id) => grantedCompanyIds.has(id))) {
      return false;
    }
  }

  if (required.branchIds?.length) {
    const grantedBranchIds = new Set(granted.branchIds ?? []);
    if (!required.branchIds.every((id) => grantedBranchIds.has(id))) {
      return false;
    }
  }

  if (required.departmentIds?.length) {
    const grantedDepartmentIds = new Set(granted.departmentIds ?? []);
    if (!required.departmentIds.every((id) => grantedDepartmentIds.has(id))) {
      return false;
    }
  }

  if (required.teamIds?.length) {
    const grantedTeamIds = new Set(granted.teamIds ?? []);
    if (!required.teamIds.every((id) => grantedTeamIds.has(id))) {
      return false;
    }
  }

  if (required.employeeIds?.length) {
    const grantedEmployeeIds = new Set(granted.employeeIds ?? []);
    if (!required.employeeIds.every((id) => grantedEmployeeIds.has(id))) {
      return false;
    }
  }

  if (required.selfUserId) {
    return granted.selfUserId === required.selfUserId;
  }

  return true;
}

function allowedResult(params: {
  request: PermissionResolutionRequest;
  permission: Permission;
  entitlement?: Entitlement;
  roles: readonly Role[];
  scopes: readonly DataScope[];
}): PermissionResolutionResult {
  return {
    allowed: true,
    decision: "allowed",
    effectiveDataScopes: params.scopes,
    entitlement: params.entitlement,
    identity: params.request.identity,
    matchedRoles: params.roles,
    permission: params.request.permission,
    reasons: [],
    resolvedPermission: params.permission,
    tenantId: params.request.tenantId,
  };
}

function deniedResult(
  request: PermissionResolutionRequest,
  reasons: PermissionResolutionResult["reasons"],
  params: {
    permission?: Permission;
    entitlement?: Entitlement;
    roles?: readonly Role[];
    scopes?: readonly DataScope[];
  } = {},
): PermissionResolutionResult {
  return {
    allowed: false,
    decision: "denied",
    effectiveDataScopes: params.scopes ?? [],
    entitlement: params.entitlement,
    identity: request.identity,
    matchedRoles: params.roles ?? [],
    permission: request.permission,
    reasons,
    resolvedPermission: params.permission,
    tenantId: request.tenantId,
  };
}

export async function resolvePermission(
  request: PermissionResolutionRequest,
  source: PermissionResolverSource,
): Promise<PermissionResolutionResult> {
  const now = request.now ?? new Date().toISOString();

  if (!request.identity.userId || !request.identity.identityId || !request.identity.principalId) {
    return deniedResult(request, [
      deniedReason("identity", "identity.missing", "A resolved identity is required."),
    ]);
  }

  const permission = await source.getPermission(request.permission);

  if (!permission) {
    return deniedResult(request, [
      deniedReason("permission", "permission.unknown", "Permission is not registered."),
    ]);
  }

  if (!permission.experiences.includes(request.experience)) {
    return deniedResult(
      request,
      [
        deniedReason(
          "experience",
          "experience.unsupported",
          "Permission is not available in the requested experience.",
        ),
      ],
      { permission },
    );
  }

  const requiredEntitlementKey =
    request.entitlementKey ?? request.resource?.requiredEntitlementKey;
  const entitlement = await source.getEntitlement(request);

  if (requiredEntitlementKey) {
    if (!entitlement || entitlement.key !== requiredEntitlementKey) {
      return deniedResult(
        request,
        [
          deniedReason(
            "entitlement",
            "entitlement.missing",
            "Required tenant entitlement is missing.",
          ),
        ],
        { permission },
      );
    }

    if (!ACTIVE_ENTITLEMENT_STATUSES.includes(entitlement.status)) {
      return deniedResult(
        request,
        [
          deniedReason(
            "entitlement",
            "entitlement.inactive",
            "Required tenant entitlement is not active.",
          ),
        ],
        { entitlement, permission },
      );
    }

    if (!isActiveWindow(entitlement.startsAt, entitlement.endsAt, now)) {
      return deniedResult(
        request,
        [
          deniedReason(
            "entitlement",
            "entitlement.outside-window",
            "Required tenant entitlement is outside its active window.",
          ),
        ],
        { entitlement, permission },
      );
    }
  }

  const assignments = (await source.getRoleAssignments(request)).filter((assignment) =>
    isActiveWindow(assignment.effectiveFrom, assignment.effectiveTo, now),
  );
  const grantingAssignments = assignments.filter((assignment) =>
    roleGrantsPermission(assignment, request.permission),
  );
  const matchedRoles = grantingAssignments.map((assignment) => assignment.role);

  if (!grantingAssignments.length) {
    return deniedResult(
      request,
      [deniedReason("role", "role.permission-missing", "No active role grants permission.")],
      { entitlement, permission },
    );
  }

  if (permission.metadata.featureFlagKey) {
    const suppliedFlag = request.featureFlags?.find(
      (flag) => flag.key === permission.metadata.featureFlagKey,
    );
    const enabled =
      suppliedFlag?.enabled ??
      (await source.isFeatureEnabled(request, permission.metadata.featureFlagKey));

    if (!enabled) {
      return deniedResult(
        request,
        [
          deniedReason(
            "feature-flag",
            "feature-flag.disabled",
            "Required feature flag is disabled.",
          ),
        ],
        { entitlement, permission, roles: matchedRoles },
      );
    }
  }

  const resolvedScopes = await source.getDataScopes(request);
  const roleScopes = grantingAssignments.map((assignment) => assignment.scope);
  const effectiveScopes = resolvedScopes.length ? resolvedScopes : roleScopes;
  const requiredDataScope =
    request.requestedDataScope ??
    (permission.metadata.dataScopeRequired
      ? { kind: "tenant", tenantId: request.tenantId }
      : undefined);

  if (requiredDataScope && !effectiveScopes.some((scope) => dataScopeMatches(requiredDataScope, scope))) {
    return deniedResult(
      request,
      [
        deniedReason(
          "data-scope",
          "data-scope.insufficient",
          "Granted data scope does not cover the requested resource.",
        ),
      ],
      { entitlement, permission, roles: matchedRoles, scopes: effectiveScopes },
    );
  }

  if (
    request.temporaryElevation &&
    !permission.metadata.temporaryElevationAllowed
  ) {
    return deniedResult(
      request,
      [
        deniedReason(
          "temporary-elevation",
          "temporary-elevation.not-eligible",
          "Permission is not eligible for temporary elevation.",
        ),
      ],
      { entitlement, permission, roles: matchedRoles, scopes: effectiveScopes },
    );
  }

  return allowedResult({
    entitlement,
    permission,
    request,
    roles: matchedRoles,
    scopes: effectiveScopes,
  });
}

