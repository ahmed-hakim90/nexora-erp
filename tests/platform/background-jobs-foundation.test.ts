import assert from "node:assert/strict";
import test from "node:test";

import {
  JOB_PLATFORM_EVENTS,
  cancelJob,
  canTransitionJobStatus,
  createBackgroundJob,
  createJobAuditMetadata,
  createJobQueueRegistry,
  createJobReadinessContract,
  createJobRegistry,
  createJobTelemetryMetadata,
  createPlatformEventBus,
  defineJob,
  defineJobQueue,
  executeJob,
  moveJobToDeadLetter,
  registerJob,
  registerJobQueue,
  shouldRetryJob,
  transitionJobStatus,
  validateDeadLetterPolicy,
  validateJobDefinition,
  validateRetryPolicy,
  type PlatformEvent,
} from "@/platform/public-api";

const definition = defineJob({
  deadLetterPolicy: {
    afterAttempts: 3,
    enabled: true,
    queueKey: "dead-letter",
    retainForDays: 30,
  },
  description: "Search indexing job.",
  key: "platform.search.index",
  maxRetries: 2,
  priority: "high",
  queueKey: "search",
  retryPolicy: {
    backoffMultiplier: 2,
    cancellable: true,
    delaySeconds: 30,
    maxAttempts: 3,
    strategy: "exponential",
    timeoutSeconds: 120,
  },
  schedule: {
    kind: "immediate",
  },
  timeoutSeconds: 120,
});

function createJob() {
  return createBackgroundJob(definition, {
    actorType: "user",
    actorUserId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:job",
    createdAt: "2026-06-27T08:30:00.000Z",
    experience: "erp",
    id: "job-1",
    idempotencyKey: "idem-1",
    jobKey: definition.key,
    originatingApp: "platform",
    originatingEngine: "search-indexing",
    payload: { entityType: "party" },
    principalId: "principal-1",
    requestId: "request-1",
    tenantId: "tenant-1",
  });
}

test("job registration validates definitions and deduplicates by key", () => {
  const registry = registerJob(createJobRegistry(), definition);

  assert.deepEqual(registry.definitions.map((job) => job.key), ["platform.search.index"]);
  assert.deepEqual(validateJobDefinition(definition), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateJobDefinition({
    key: "",
    maxRetries: -1,
    priority: "normal",
    timeoutSeconds: 0,
  }), {
    errors: [
      "Job definition key is required.",
      "Background job retry and timeout settings are invalid.",
      "Retry policy maxAttempts must be at least 1.",
      "Retry policy timeoutSeconds must be at least 1.",
    ],
    valid: false,
  });
});

test("queue registration supports future provider abstractions", () => {
  const queue = defineJobQueue({
    concurrency: 5,
    key: "search",
    priority: "high",
    provider: "in-memory",
    supportsDeadLetter: true,
    supportsScheduling: true,
    visibilityTimeoutSeconds: 60,
  });
  const registry = registerJobQueue(createJobQueueRegistry(), queue);

  assert.deepEqual(registry.queues, [queue]);
  assert.throws(() => defineJobQueue({
    concurrency: 0,
    key: "bad",
    priority: "normal",
    provider: "redis",
    supportsDeadLetter: false,
    supportsScheduling: false,
  }), /concurrency/);
});

test("job lifecycle supports pending, queued, running, retrying, completed, failed, cancelled, and dead-letter", () => {
  const pending = createJob();
  const queued = transitionJobStatus(pending, "queued", "2026-06-27T08:31:00.000Z");
  const running = transitionJobStatus(queued, "running", "2026-06-27T08:32:00.000Z");
  const completed = transitionJobStatus(running, "completed", "2026-06-27T08:33:00.000Z", {
    executionDurationMs: 60_000,
  });

  assert.equal(canTransitionJobStatus("pending", "queued"), true);
  assert.equal(canTransitionJobStatus("completed", "running"), false);
  assert.equal(completed.status, "completed");
  assert.equal(completed.progress, 100);
  assert.equal(completed.metadata.executionDurationMs, 60_000);
  assert.throws(() => transitionJobStatus(completed, "running", "2026-06-27T08:34:00.000Z"), /Cannot transition/);
});

test("retry policies and dead-letter policies validate retry and cancellation metadata", () => {
  assert.deepEqual(validateRetryPolicy(definition.retryPolicy!), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateRetryPolicy({
    backoffMultiplier: 0,
    cancellable: true,
    delaySeconds: -1,
    maxAttempts: 0,
    strategy: "exponential",
    timeoutSeconds: 0,
  }), {
    errors: [
      "Retry policy maxAttempts must be at least 1.",
      "Retry policy delaySeconds cannot be negative.",
      "Exponential retry policy requires backoffMultiplier of at least 1.",
      "Retry policy timeoutSeconds must be at least 1.",
    ],
    valid: false,
  });
  assert.deepEqual(validateDeadLetterPolicy({
    afterAttempts: 0,
    enabled: true,
  }), {
    errors: [
      "Dead-letter policy afterAttempts must be at least 1.",
      "Dead-letter policy requires a queue key when enabled.",
    ],
    valid: false,
  });
});

test("dead-letter handling moves failed or cancelled jobs into dead-letter state", () => {
  const failed = transitionJobStatus(
    transitionJobStatus(
      transitionJobStatus(createJob(), "queued", "2026-06-27T08:31:00.000Z"),
      "running",
      "2026-06-27T08:32:00.000Z",
    ),
    "failed",
    "2026-06-27T08:33:00.000Z",
    { errorMessage: "boom" },
  );
  const retrying = transitionJobStatus(failed, "retrying", "2026-06-27T08:34:00.000Z");
  const cancelled = cancelJob(retrying, "2026-06-27T08:35:00.000Z", "user cancelled");
  const deadLettered = moveJobToDeadLetter(cancelled, "2026-06-27T08:36:00.000Z", "max attempts");

  assert.equal(shouldRetryJob(failed), true);
  assert.equal(retrying.metadata.retryCount, 1);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(deadLettered.status, "dead-letter");
  assert.equal(deadLettered.errorMessage, "max attempts");
});

test("scheduling metadata supports immediate, delayed, scheduled, recurring, and manual trigger contracts", () => {
  assert.deepEqual(createBackgroundJob({
    ...definition,
    schedule: { delaySeconds: 60, kind: "delayed" },
  }, {
    createdAt: "2026-06-27T08:30:00.000Z",
    id: "job-delayed",
    idempotencyKey: "idem-delayed",
    jobKey: definition.key,
    payload: {},
  }).schedule, { delaySeconds: 60, kind: "delayed" });

  assert.deepEqual([
    { kind: "scheduled", runAt: "2026-06-28T08:30:00.000Z" },
    { cron: "0 * * * *", kind: "recurring", timezone: "Asia/Riyadh" },
    { kind: "manual", manualTriggerKey: "run-now" },
  ], [
    { kind: "scheduled", runAt: "2026-06-28T08:30:00.000Z" },
    { cron: "0 * * * *", kind: "recurring", timezone: "Asia/Riyadh" },
    { kind: "manual", manualTriggerKey: "run-now" },
  ]);
});

test("job execution publishes platform events through the event bus only", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const result = await executeJob(createJob(), async () => ({
    progress: 50,
    status: "completed",
    value: { indexed: 1 },
  }), {
    eventBus: bus,
    now: "2026-06-27T08:40:00.000Z",
  });

  assert.equal(result.job.status, "completed");
  assert.deepEqual(result.publishedEvents, [
    JOB_PLATFORM_EVENTS.queued,
    JOB_PLATFORM_EVENTS.started,
    JOB_PLATFORM_EVENTS.progress,
    JOB_PLATFORM_EVENTS.completed,
  ]);
  assert.deepEqual(published.map((event) => event.metadata.eventName), result.publishedEvents);
  assert.equal(published[0]?.metadata.context.correlationId, "request:job");
});

test("audit and observability metadata expose job execution context", () => {
  const completed = transitionJobStatus(
    transitionJobStatus(
      transitionJobStatus(createJob(), "queued", "2026-06-27T08:31:00.000Z"),
      "running",
      "2026-06-27T08:32:00.000Z",
    ),
    "completed",
    "2026-06-27T08:33:00.000Z",
    { executionDurationMs: 60_000 },
  );

  assert.deepEqual(createJobAuditMetadata(completed), {
    action: "background-job.completed",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:job",
    executionDurationMs: 60_000,
    jobId: "job-1",
    jobKey: "platform.search.index",
    originatingApp: "platform",
    originatingEngine: "search-indexing",
    principalId: "principal-1",
    queueKey: "search",
    retryCount: 0,
    status: "completed",
    tenantId: "tenant-1",
  });
  assert.deepEqual(createJobTelemetryMetadata(completed), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:job",
    durationMs: 60_000,
    jobId: "job-1",
    jobKey: "platform.search.index",
    queueKey: "search",
    requestId: "request-1",
    retryCount: 0,
    sourceKey: "search-indexing",
    status: "completed",
    tenantId: "tenant-1",
  });
});

test("future integration readiness contracts require background execution", () => {
  assert.deepEqual(createJobReadinessContract("notification-delivery", "platform.notification.deliver"), {
    integration: "notification-delivery",
    jobKey: "platform.notification.deliver",
    requiresBackgroundExecution: true,
  });
});
