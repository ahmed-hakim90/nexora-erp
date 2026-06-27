import type { PermissionKey } from "@/platform/permissions/permission-key";

import type {
  DataScope,
  Entitlement,
  Permission,
  PermissionResolutionRequest,
  PermissionResolverSource,
  RoleAssignment,
} from "./contracts";

export type InMemoryPermissionResolverState = Readonly<{
  permissions: readonly Permission[];
  roleAssignments: readonly RoleAssignment[];
  entitlements?: readonly Entitlement[];
  dataScopes?: readonly DataScope[];
  enabledFeatureFlags?: readonly string[];
}>;

export function createInMemoryPermissionResolverSource(
  state: InMemoryPermissionResolverState,
): PermissionResolverSource {
  const permissions = new Map<PermissionKey, Permission>(
    state.permissions.map((permission) => [permission.key, permission]),
  );
  const enabledFeatureFlags = new Set(state.enabledFeatureFlags ?? []);

  return {
    async getDataScopes(request) {
      return (state.dataScopes ?? []).filter((scope) => scope.tenantId === request.tenantId);
    },
    async getEntitlement(request: PermissionResolutionRequest) {
      const entitlementKey =
        request.entitlementKey ?? request.resource?.requiredEntitlementKey;

      if (!entitlementKey) {
        return undefined;
      }

      return (state.entitlements ?? []).find(
        (entitlement) =>
          entitlement.key === entitlementKey &&
          entitlement.tenantId === request.tenantId,
      );
    },
    async getPermission(permission) {
      return permissions.get(permission);
    },
    async getRoleAssignments(request) {
      return state.roleAssignments.filter(
        (assignment) => assignment.scope.tenantId === request.tenantId,
      );
    },
    async isFeatureEnabled(_request, flagKey) {
      return enabledFeatureFlags.has(flagKey);
    },
  };
}

