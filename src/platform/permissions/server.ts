import "server-only";

import { ApplicationError } from "@/core/errors";
import { createRequestSupabaseClient } from "@/infrastructure/server";
import type { TenantRequestContext } from "@/platform/auth/server";
import {
  resolvePermission,
  type DataScope,
  type FeatureFlagCheck,
  type PermissionResolverSource,
  type ProtectedResource,
} from "@/platform/security/public-api";

import type { PermissionKey } from "./permission-key";

export type ServerPermissionCheck = Readonly<{
  context: TenantRequestContext;
  permission: PermissionKey;
  entitlementKey?: string;
  featureFlags?: readonly FeatureFlagCheck[];
  requestedDataScope?: DataScope;
  resource?: ProtectedResource;
  resolverSource?: PermissionResolverSource;
}>;

async function hasLegacyServerPermission(params: {
  context: TenantRequestContext;
  permission: PermissionKey;
}): Promise<boolean> {
  const supabase = createRequestSupabaseClient({
    accessToken: params.context.accessToken,
  });

  const { data, error } = await supabase.rpc("has_permission", {
    permission_key: params.permission,
    check_tenant_id: params.context.tenantId,
  });

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Permission check failed.",
      correlationId: params.context.correlationId,
      cause: error,
    });
  }

  return data === true;
}

export async function hasServerPermission(params: ServerPermissionCheck): Promise<boolean> {
  if (!params.resolverSource) {
    return hasLegacyServerPermission(params);
  }

  const result = await resolvePermission(
    {
      entitlementKey: params.entitlementKey,
      experience: params.context.experience,
      featureFlags: params.featureFlags,
      identity: {
        identity: params.context.identity,
        identityId: params.context.identityId,
        principal: params.context.principal,
        principalId: params.context.principalId,
        userId: params.context.userId,
      },
      permission: params.permission,
      requestedDataScope: params.requestedDataScope,
      resource: params.resource,
      tenantId: params.context.tenantId,
    },
    params.resolverSource,
  );

  return result.allowed;
}

export async function requirePermission(params: ServerPermissionCheck): Promise<void> {
  const allowed = await hasServerPermission(params);

  if (!allowed) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Required permission is missing.",
      correlationId: params.context.correlationId,
    });
  }
}
