import type { AccessExperience, RequestContext } from "@/core/context";
import type { PlatformIdentity, PlatformPrincipal } from "@/platform/auth/public-api";

export type AuditAction = string & { readonly __brand: "AuditAction" };

export type AuditActorType =
  | "user"
  | "employee"
  | "customer"
  | "supplier"
  | "driver"
  | "technician"
  | "service"
  | "service-account"
  | "integration"
  | "automation"
  | "ai-agent"
  | "system";

export type AuditSeverity = "debug" | "info" | "notice" | "warning" | "error" | "critical";

export type AuditCategory =
  | "security"
  | "identity"
  | "session"
  | "permission"
  | "entitlement"
  | "data-access"
  | "app-lifecycle"
  | "workflow"
  | "approval"
  | "document"
  | "print"
  | "export"
  | "import"
  | "connector"
  | "automation"
  | "ai"
  | "system";

export type AuditOutcome = "success" | "failure" | "denied" | "error" | "pending";

export type AuditMetadata = Readonly<Record<string, unknown>>;

export type AuditActor = Readonly<{
  type: AuditActorType;
  identityId?: string | null;
  principalId?: string | null;
  userId?: string | null;
  serviceKey?: string | null;
  integrationKey?: string | null;
  automationKey?: string | null;
  aiActionKey?: string | null;
  identity?: PlatformIdentity;
  principal?: PlatformPrincipal;
}>;

export type AuditSubject = Readonly<{
  type: string;
  id?: string | null;
  display?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
}>;

export type AuditEvent = Readonly<{
  id?: string;
  action: AuditAction;
  actor: AuditActor;
  category: AuditCategory;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  subject: AuditSubject;
  metadata: AuditMetadata;
  correlationId: string;
  requestId?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience;
  source: string;
  timestamp: string;
  retentionPolicyKey?: string | null;
}>;

export type AuditEventDraft = Readonly<{
  context: RequestContext;
  module: string;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  actor?: AuditActor;
  subject?: AuditSubject;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  severity?: AuditSeverity;
  source?: string;
  retentionPolicyKey?: string | null;
  requestId?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  serverEvent?: string;
  fieldDiffs?: readonly AuditFieldDiff[];
  metadata?: Record<string, unknown>;
}>;

export type AuditFieldDiff = Readonly<{
  field: string;
  before: unknown;
  after: unknown;
}>;

export type AuditRetentionPolicy = Readonly<{
  key: string;
  retainForDays: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  appendOnly: true;
}>;

export function defineAuditAction(value: string): AuditAction {
  if (!value.includes(".")) {
    throw new Error("Audit actions must use dot notation.");
  }

  return value as AuditAction;
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeMetadataValue);
  }

  if (value && typeof value === "object") {
    return sanitizeAuditMetadata(value as Record<string, unknown>);
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return String(value);
  }

  return value;
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown> = {}): AuditMetadata {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !["password", "secret", "token", "accessToken", "refreshToken"].includes(key))
      .map(([key, value]) => [key, sanitizeMetadataValue(value)]),
  );
}

export function createAuditActor(context: RequestContext): AuditActor {
  const runtimeContext = context as RequestContext &
    Partial<{
      identity: PlatformIdentity;
      identityId: string;
      principal: PlatformPrincipal;
      principalId: string;
    }>;

  return {
    aiActionKey: context.aiActionKey,
    automationKey: context.automationKey,
    identity: runtimeContext.identity,
    identityId: runtimeContext.identityId,
    integrationKey: context.integrationKey,
    principal: runtimeContext.principal,
    principalId: runtimeContext.principalId,
    serviceKey: context.serviceKey,
    type: context.actorType as AuditActorType,
    userId: context.userId,
  };
}

export function createAuditEvent(draft: AuditEventDraft): AuditEvent {
  return {
    action: draft.action,
    actor: draft.actor ?? createAuditActor(draft.context),
    branchId: draft.context.branchId ?? null,
    category: draft.category ?? "system",
    companyId: draft.context.companyId ?? null,
    correlationId: draft.context.correlationId,
    experience: draft.context.experience,
    metadata: sanitizeAuditMetadata({
      ...(draft.metadata ?? {}),
      browser: draft.browser,
      device: draft.device,
      fieldDiffs: draft.fieldDiffs,
      ipAddress: draft.ipAddress,
      legacyModule: draft.module,
      requestId: draft.requestId,
      serverEvent: draft.serverEvent,
    }),
    outcome: draft.outcome ?? "success",
    requestId: draft.requestId ?? null,
    retentionPolicyKey: draft.retentionPolicyKey ?? null,
    severity: draft.severity ?? "info",
    source: draft.source ?? draft.module,
    subject: draft.subject ?? {
      id: draft.entityId,
      type: draft.entityType,
    },
    tenantId: draft.context.tenantId ?? null,
    timestamp: new Date().toISOString(),
  };
}
