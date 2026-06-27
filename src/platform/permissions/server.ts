import "server-only";

import { ApplicationError } from "@/core/errors";
import { createRequestSupabaseClient } from "@/infrastructure/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { PermissionKey } from "./permission-key";

export async function hasServerPermission(params: {
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

export async function requirePermission(params: {
  context: TenantRequestContext;
  permission: PermissionKey;
}): Promise<void> {
  const allowed = await hasServerPermission(params);

  if (!allowed) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Required permission is missing.",
      correlationId: params.context.correlationId,
    });
  }
}
