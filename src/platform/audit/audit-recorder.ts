import "server-only";

import { ApplicationError } from "@/core/errors";
import { logger } from "@/core/logger";
import { ok, type Result } from "@/core/result";
import { createRequestSupabaseClient } from "@/infrastructure/server";

import {
  createAuditEvent,
  type AuditCategory,
  type AuditEvent,
  type AuditEventDraft,
} from "./audit-event";

function readServerAccessToken(context: AuditEventDraft["context"]): string | null {
  if (!("accessToken" in context) || typeof context.accessToken !== "string") {
    return null;
  }

  return context.accessToken;
}

export async function recordAuditEvent(
  event: AuditEventDraft,
): Promise<Result<AuditEvent>> {
  const auditEvent = createAuditEvent(event);

  if (!auditEvent.tenantId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Tenant context is required to record audit events.",
      correlationId: event.context.correlationId,
    });
  }

  const accessToken = readServerAccessToken(event.context);

  if (!accessToken) {
    logger.info("Audit event captured without request-scoped database credentials.", {
      action: auditEvent.action,
      category: auditEvent.category,
      correlationId: auditEvent.correlationId,
      source: auditEvent.source,
      tenantId: auditEvent.tenantId,
    });

    return ok(auditEvent);
  }

  const supabase = createRequestSupabaseClient({
    accessToken,
  });

  const { error } = await supabase.from("audit_events").insert({
    action: auditEvent.action,
    actor_identity_id: auditEvent.actor.identityId,
    actor_principal_id: auditEvent.actor.principalId,
    actor_type: auditEvent.actor.type,
    actor_user_id: auditEvent.actor.userId,
    branch_id: auditEvent.branchId,
    category: auditEvent.category,
    company_id: auditEvent.companyId,
    correlation_id: auditEvent.correlationId,
    experience: auditEvent.experience,
    metadata: auditEvent.metadata,
    outcome: auditEvent.outcome,
    request_id: auditEvent.requestId,
    retention_policy_key: auditEvent.retentionPolicyKey,
    severity: auditEvent.severity,
    source_key: auditEvent.source,
    subject_display: auditEvent.subject.display,
    subject_id: auditEvent.subject.id,
    subject_type: auditEvent.subject.type,
    tenant_id: auditEvent.tenantId,
    occurred_at: auditEvent.timestamp,
  });

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Audit event could not be recorded.",
      correlationId: event.context.correlationId,
      cause: error,
    });
  }

  logger.info("Audit event recorded.", {
    action: auditEvent.action,
    category: auditEvent.category,
    correlationId: auditEvent.correlationId,
    source: auditEvent.source,
    tenantId: auditEvent.tenantId,
  });

  return ok(auditEvent);
}

function withCategory(
  category: AuditCategory,
  event: AuditEventDraft,
): AuditEventDraft {
  return {
    ...event,
    category,
  };
}

export function recordSecurityAudit(event: AuditEventDraft): Promise<Result<AuditEvent>> {
  return recordAuditEvent(withCategory("security", event));
}

export function recordSystemAudit(event: AuditEventDraft): Promise<Result<AuditEvent>> {
  return recordAuditEvent(withCategory("system", event));
}

export function recordDataAccessAudit(event: AuditEventDraft): Promise<Result<AuditEvent>> {
  return recordAuditEvent(withCategory("data-access", event));
}

export function recordPermissionAudit(event: AuditEventDraft): Promise<Result<AuditEvent>> {
  return recordAuditEvent(withCategory("permission", event));
}
