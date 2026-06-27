import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuditActor,
  createAuditEvent,
  createSlowOperationEvent,
  createTelemetryEvent,
  defineAuditAction,
  definePerformanceBudget,
  sanitizeAuditMetadata,
  type RequestContext,
} from "@/platform/public-api";
import { recordSecurityAudit } from "@/platform/server";

type AuditedRequestContext = RequestContext &
  Readonly<{
    identityId: string;
    principalId: string;
  }>;

const context: AuditedRequestContext = {
  actorType: "ai-agent",
  aiActionKey: "ai.reconcile.suggest",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:123456" as RequestContext["correlationId"],
  direction: "ltr",
  experience: "ai",
  identityId: "identity-1",
  locale: "en",
  principalId: "principal-1",
  source: "ai-action",
  tenantId: "tenant-1",
  timezone: "UTC",
};

test("audit event creation preserves actor, subject, category, and correlation", () => {
  const action = defineAuditAction("ai.suggestion.created");
  const event = createAuditEvent({
    action,
    category: "ai",
    context,
    entityId: "suggestion-1",
    entityType: "ai_suggestion",
    metadata: {
      password: "hidden",
      promptTokens: 128,
    },
    module: "ai",
    outcome: "success",
    requestId: "request-1",
    severity: "notice",
  });

  assert.equal(event.action, action);
  assert.equal(event.actor.type, "ai-agent");
  assert.equal(event.actor.principalId, "principal-1");
  assert.equal(event.category, "ai");
  assert.equal(event.correlationId, "request:123456");
  assert.equal(event.requestId, "request-1");
  assert.equal(event.subject.type, "ai_suggestion");
  assert.equal(event.subject.id, "suggestion-1");
  assert.equal(event.metadata.promptTokens, 128);
  assert.equal("password" in event.metadata, false);
});

test("audit metadata sanitizes unsafe values and error objects", () => {
  const metadata = sanitizeAuditMetadata({
    accessToken: "secret",
    error: new Error("database failed"),
    nested: {
      refreshToken: "secret",
      value: "kept",
    },
    token: "secret",
  });

  assert.equal("accessToken" in metadata, false);
  assert.equal("token" in metadata, false);
  assert.deepEqual(metadata.error, {
    message: "database failed",
    name: "Error",
  });
  assert.deepEqual(metadata.nested, {
    value: "kept",
  });
});

test("audit actor supports service, integration, automation, and AI sources", () => {
  assert.equal(createAuditActor({
    ...context,
    actorType: "service",
    serviceKey: "billing-sync",
  }).serviceKey, "billing-sync");
  assert.equal(createAuditActor({
    ...context,
    actorType: "integration",
    integrationKey: "shopify",
  }).integrationKey, "shopify");
  assert.equal(createAuditActor({
    ...context,
    actorType: "automation",
    automationKey: "approval-reminder",
  }).automationKey, "approval-reminder");
  assert.equal(createAuditActor(context).aiActionKey, "ai.reconcile.suggest");
});

test("recordSecurityAudit returns a platform result without direct table access from apps", async () => {
  const originalLog = console.log;
  console.log = () => {};

  try {
    const result = await recordSecurityAudit({
      action: defineAuditAction("security.session.checked"),
      context,
      entityType: "session",
      metadata: { accessToken: "hidden" },
      module: "security",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.category, "security");
      assert.equal("accessToken" in result.value.metadata, false);
    }
  } finally {
    console.log = originalLog;
  }
});

test("telemetry event contracts preserve metrics, spans, source, and correlation", () => {
  const event = createTelemetryEvent({
    correlationId: "request:123456",
    metadata: {
      accessToken: "hidden",
      route: "/api/import",
    },
    metrics: [
      {
        name: "duration",
        unit: "ms",
        value: 550,
      },
    ],
    name: "api.import.completed",
    outcome: "success",
    severity: "info",
    source: "api",
    span: {
      durationMs: 550,
      name: "import",
      spanId: "span-1",
      startedAt: "2026-06-27T00:00:00.000Z",
      traceId: "trace-1",
    },
  });

  assert.equal(event.correlationId, "request:123456");
  assert.equal(event.metrics?.[0]?.value, 550);
  assert.equal(event.source, "api");
  assert.equal(event.span?.traceId, "trace-1");
  assert.equal("accessToken" in (event.metadata ?? {}), false);
});

test("slow operation helper maps performance budget to telemetry event", () => {
  const budget = definePerformanceBudget({
    key: "query.customer-search",
    maxDurationMs: 200,
    severity: "warning",
    source: "query",
  });
  const event = createSlowOperationEvent({
    budget,
    correlationId: "request:123456",
    durationMs: 400,
    operationKey: "query.customer-search",
    source: "query",
  });

  assert.equal(event.name, "query.customer-search");
  assert.equal(event.severity, "warning");
  assert.equal(event.metrics?.[0]?.unit, "ms");
  assert.equal(event.metrics?.[0]?.value, 400);
});

test("audit observability migration declares append-only platform tables", async () => {
  const migration = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      new URL("../../supabase/migrations/20260627120000_audit_observability_foundation.sql", import.meta.url),
      "utf8",
    ),
  );

  assert.match(migration, /create table if not exists public\.audit_events/);
  assert.match(migration, /create table if not exists public\.telemetry_events/);
  assert.match(migration, /create table if not exists public\.observability_logs/);
  assert.match(migration, /prevent_platform_event_mutation/);
  assert.match(migration, /before update on public\.audit_events/);
  assert.match(migration, /before delete on public\.audit_events/);
  assert.match(migration, /alter table public\.audit_events force row level security/);
});
