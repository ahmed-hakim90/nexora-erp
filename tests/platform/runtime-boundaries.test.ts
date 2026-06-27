import assert from "node:assert/strict";
import test from "node:test";

import {
  CORRELATION_ID_HEADER,
  PlatformError,
  createCorrelationHeaders,
  createCorrelationId,
  createCorrelationMetadata,
  createCorrelationPropagationStrategy,
  createLogContextFromRequest,
  fail,
  isCorrelationId,
  isPlatformFailure,
  isPlatformSuccess,
  normalizeCorrelationId,
  ok,
  platformFail,
  platformOk,
  toSafePlatformError,
  type RequestContext,
} from "@/platform/public-api";
import {
  assertServerRuntime,
  resolveRequestContext,
  toSafeServerError,
} from "@/platform/server";

test("resolveRequestContext reads supported request headers", async () => {
  const correlationId = "trace-1234";
  const context = await resolveRequestContext(
    "erp",
    () =>
      new Headers({
        [CORRELATION_ID_HEADER]: correlationId,
        "x-nexora-actor-type": "service",
        "x-nexora-direction": "ltr",
        "x-nexora-experience": "portal",
        "x-nexora-locale": "ar",
        "x-nexora-runtime-source": "api",
        "x-nexora-service-key": "billing-sync",
        "x-nexora-timezone": "Asia/Riyadh",
      }),
  );

  assert.equal(context.actorType, "service");
  assert.equal(context.correlationId, correlationId);
  assert.equal(context.direction, "rtl");
  assert.equal(context.experience, "portal");
  assert.equal(context.locale, "ar");
  assert.equal(context.serviceKey, "billing-sync");
  assert.equal(context.source, "api");
  assert.equal(context.timezone, "Asia/Riyadh");
});

test("resolveRequestContext falls back for unsupported or empty headers", async () => {
  const context = await resolveRequestContext(
    "erp",
    () =>
      new Headers({
        [CORRELATION_ID_HEADER]: "bad",
        "x-nexora-actor-type": "guest",
        "x-nexora-experience": "unknown",
        "x-nexora-runtime-source": "desktop",
      }),
  );

  assert.equal(context.actorType, "user");
  assert.equal(context.experience, "erp");
  assert.equal(context.locale, "en");
  assert.equal(context.source, "web");
  assert.ok(isCorrelationId(context.correlationId));
});

test("correlation IDs are created, recognized, normalized, and propagated", () => {
  const created = createCorrelationId();
  const existing = "request:123456";

  assert.ok(isCorrelationId(created));
  assert.equal(normalizeCorrelationId(existing), existing);
  assert.ok(isCorrelationId(normalizeCorrelationId("bad")));
  assert.deepEqual(createCorrelationHeaders(existing), {
    [CORRELATION_ID_HEADER]: existing,
  });
  assert.deepEqual(createCorrelationMetadata(existing), {
    correlationId: existing,
  });
  assert.deepEqual(createCorrelationPropagationStrategy(existing), {
    auditLog: { correlationId: existing },
    backgroundJob: { correlationId: existing },
    externalCallHeaders: { [CORRELATION_ID_HEADER]: existing },
    outboxEvent: { correlationId: existing },
    responseHeaders: { [CORRELATION_ID_HEADER]: existing },
  });
});

test("safe platform error normalization strips unsafe details", () => {
  const error = new PlatformError({
    code: "OPERATIONAL_ERROR",
    correlationId: "request:123456",
    details: { sql: "select secret" },
    message: "Unable to complete operation.",
    retryable: true,
    severity: "critical",
    source: "test",
  });

  assert.deepEqual(toSafePlatformError(error), {
    code: "OPERATIONAL_ERROR",
    correlationId: "request:123456",
    message: "Unable to complete operation.",
    retryable: true,
  });
});

test("safe server errors preserve platform errors and hide unknown errors", () => {
  const platformError = new PlatformError({
    code: "CONFLICT",
    message: "Duplicate operation.",
  });

  assert.deepEqual(toSafeServerError(platformError, "request:123456"), {
    code: "CONFLICT",
    correlationId: "request:123456",
    message: "Duplicate operation.",
    retryable: false,
  });

  const originalError = console.error;
  console.error = () => {};

  try {
    assert.deepEqual(toSafeServerError(new Error("database password"), "request:123456"), {
      code: "UNEXPECTED_ERROR",
      correlationId: "request:123456",
      message: "Unexpected server error.",
    });
  } finally {
    console.error = originalError;
  }
});

test("platform result helpers create discriminated success and failure values", () => {
  const result = ok({ id: "1" });
  const failure = fail(new Error("nope"));
  const platformSuccess = platformOk({ saved: true }, { correlationId: "request:123456" });
  const platformFailure = platformFail("invalid", { source: "test" });

  assert.deepEqual(result, { ok: true, value: { id: "1" } });
  assert.equal(failure.ok, false);
  assert.ok(isPlatformSuccess(platformSuccess));
  assert.ok(isPlatformFailure(platformFailure));
  assert.deepEqual(platformSuccess.meta, { correlationId: "request:123456" });
  assert.deepEqual(platformFailure.meta, { source: "test" });
});

test("logger context creation preserves request context and removes undefined fields", () => {
  const requestContext: RequestContext = {
    actorType: "user",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:123456" as RequestContext["correlationId"],
    direction: "ltr",
    experience: "erp",
    locale: "en",
    source: "web",
    tenantId: "tenant-1",
    timezone: "UTC",
  };

  const logContext = createLogContextFromRequest(requestContext, {
    action: "read",
    module: "runtime",
    userId: undefined,
  });

  assert.deepEqual(logContext, {
    action: "read",
    actorType: "user",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:123456",
    experience: "erp",
    module: "runtime",
    source: "web",
    tenantId: "tenant-1",
  });
});

test("server-only boundary assertion rejects browser runtimes", () => {
  assert.doesNotThrow(() => assertServerRuntime());

  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });

  try {
    assert.throws(
      () => assertServerRuntime(),
      /restricted to the server runtime/,
    );
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});
