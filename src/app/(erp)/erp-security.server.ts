import "server-only";

import { ApplicationError } from "@/core/errors";
import {
  isAuthorizationError,
  resolveOperatorSafeSecurityMessage,
  sanitizeOperatorMessage,
} from "@/core/errors/operator-security-messages";
import { recordAuthorizationDenial } from "@/platform/audit/server";
import {
  resolveBranchRequestContext,
  type BranchRequestContext,
} from "@/platform/auth/server";
import type { PermissionKey } from "@/platform/permissions/public-api";
import { requirePermission } from "@/platform/permissions/server";

import { resolveErpRuntimeContext, type ErpRuntimeContext } from "./erp-shell-model";

export type ErpRouteAccess = Readonly<{
  context: BranchRequestContext;
  runtime: ErpRuntimeContext;
}>;

export type ErpRouteAccessRequirements = Readonly<{
  appKey?: string;
  permission?: PermissionKey;
  denialResource?: string;
  denialSource?: string;
}>;

export function resolveGrantedPermissionsFailClosed(
  checks: ReadonlyArray<{ permission: PermissionKey; allowed?: boolean; error?: unknown }>,
): readonly PermissionKey[] {
  if (checks.some((check) => check.error !== undefined)) {
    return [];
  }

  return checks.filter((check) => check.allowed === true).map((check) => check.permission);
}

export function resolveAllowedAppKeysFailClosed(
  acceptedAppKeys: readonly string[],
  rows: ReadonlyArray<{ app_key: string; is_enabled: boolean | null }> | null | undefined,
  error?: unknown,
): readonly string[] {
  if (error || !rows || rows.length === 0) {
    return [];
  }

  const allowed = new Set(
    rows
      .filter((row) => row.is_enabled !== false && typeof row.app_key === "string")
      .map((row) => row.app_key),
  );

  return acceptedAppKeys.filter((appKey) => allowed.has(appKey));
}

export async function requireErpRouteAccess(
  requirements: ErpRouteAccessRequirements = {},
): Promise<ErpRouteAccess> {
  const [context, runtime] = await Promise.all([
    resolveBranchRequestContext("erp"),
    resolveErpRuntimeContext(),
  ]);

  if (requirements.appKey && !runtime.allowedAppKeys.includes(requirements.appKey)) {
    await recordAuthorizationDenial({
      context,
      metadata: { appKey: requirements.appKey },
      reason: "app-not-enabled",
      requestedResource: requirements.denialResource ?? requirements.appKey,
      source: requirements.denialSource ?? "erp.route-access",
    });

    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      correlationId: context.correlationId,
      message: "This application is not available for your account.",
    });
  }

  if (requirements.permission) {
    await requirePermission({
      context,
      denialResource: requirements.denialResource,
      denialSource: requirements.denialSource ?? "erp.route-access",
      permission: requirements.permission,
    });
  }

  return { context, runtime };
}

export async function resolveErpShellRuntime(
  requirements: ErpRouteAccessRequirements,
): Promise<ErpRuntimeContext> {
  const { runtime } = await requireErpRouteAccess(requirements);
  return runtime;
}

export { isAuthorizationError as isErpAuthorizationError, resolveOperatorSafeSecurityMessage, sanitizeOperatorMessage };
