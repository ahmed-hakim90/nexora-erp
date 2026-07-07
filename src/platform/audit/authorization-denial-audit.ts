import "server-only";

import { logger } from "@/core/logger";
import type { RequestContext } from "@/core/context";
import type { TenantRequestContext } from "@/platform/auth/server";
import type { PermissionKey } from "@/platform/permissions/public-api";

import { defineAuditAction } from "./audit-event";
import { recordSecurityAudit } from "./audit-recorder";

export type AuthorizationDenialReason =
  | "missing-permission"
  | "app-not-enabled"
  | "missing-tenant-context"
  | "missing-company-context"
  | "missing-branch-context"
  | "cross-company-access"
  | "cross-branch-access"
  | "experience-mismatch";

export type AuthorizationDenialAuditInput = Readonly<{
  context: RequestContext | TenantRequestContext;
  permission?: PermissionKey;
  reason: AuthorizationDenialReason;
  requestedResource?: string;
  source: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

const AUTHORIZATION_DENIED_ACTION = defineAuditAction("platform.authorization.denied");

export async function recordAuthorizationDenial(input: AuthorizationDenialAuditInput): Promise<void> {
  try {
    await recordSecurityAudit({
      action: AUTHORIZATION_DENIED_ACTION,
      context: input.context,
      entityType: "authorization",
      metadata: {
        branchId: "branchId" in input.context ? input.context.branchId : null,
        companyId: "companyId" in input.context ? input.context.companyId : null,
        correlationId: input.context.correlationId,
        denialReason: input.reason,
        requestedResource: input.requestedResource ?? input.source,
        requiredPermission: input.permission ?? null,
        tenantId: "tenantId" in input.context ? input.context.tenantId : null,
        timestamp: new Date().toISOString(),
        ...(input.metadata ?? {}),
      },
      module: input.source,
      outcome: "denied",
      severity: "warning",
      subject: {
        display: input.requestedResource ?? input.source,
        id: input.requestedResource ?? null,
        type: "authorization",
      },
    });
  } catch (error) {
    logger.warn("Authorization denial audit could not be recorded.", {
      correlationId: input.context.correlationId,
      error,
      reason: input.reason,
      source: input.source,
    });
  }
}
