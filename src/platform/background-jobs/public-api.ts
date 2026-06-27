import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import {
  createEventMetadata,
  createPlatformEvent,
  definePlatformEventName,
  type EventSource,
  type PlatformEventBus,
  type PlatformEventName,
} from "@/platform/events/public-api";
import type { TelemetryEvent } from "@/platform/observability/public-api";

export type BackgroundJobStatus =
  | "pending"
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled"
  | "dead-letter";

export type BackgroundJobPriority = "low" | "normal" | "high" | "critical";

export type JobStatus = BackgroundJobStatus;
export type JobPriority = BackgroundJobPriority;

export type QueueProviderKind =
  | "in-memory"
  | "redis"
  | "bullmq"
  | "qstash"
  | "rabbitmq"
  | "sqs"
  | "custom";

export type JobScheduleKind = "immediate" | "delayed" | "scheduled" | "recurring" | "manual";

export type JobSchedule = Readonly<{
  kind: JobScheduleKind;
  runAt?: string | null;
  delaySeconds?: number;
  cron?: string;
  timezone?: string;
  manualTriggerKey?: string;
}>;

export type RetryPolicy = Readonly<{
  strategy: "none" | "fixed" | "exponential";
  maxAttempts: number;
  delaySeconds?: number;
  backoffMultiplier?: number;
  timeoutSeconds?: number;
  cancellable: boolean;
}>;

export type DeadLetterPolicy = Readonly<{
  enabled: boolean;
  queueKey?: string;
  afterAttempts: number;
  retainForDays?: number;
  reason?: string;
}>;

export type JobMetadata = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  actorType?: ActorType | null;
  actorId?: string | null;
  principalId?: string | null;
  originatingApp?: string | null;
  originatingEngine: EventSource | JobReadinessIntegration | "background-job";
  idempotencyKey: string;
  retryCount: number;
  executionDurationMs?: number | null;
  sourceEventName?: PlatformEventName | null;
  sourceEventId?: string | null;
}>;

export type BackgroundJobDefinition = Readonly<{
  key: string;
  maxRetries: number;
  timeoutSeconds: number;
  priority: BackgroundJobPriority;
  isScheduled?: boolean;
  queueKey?: string;
  retryPolicy?: RetryPolicy;
  deadLetterPolicy?: DeadLetterPolicy;
  schedule?: JobSchedule;
  description?: string;
  tags?: readonly string[];
}>;

export type JobDefinition = BackgroundJobDefinition;

export type BackgroundJobRequest = Readonly<{
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  actorUserId?: string | null;
  actorType?: "user" | "service" | "integration" | "automation" | "ai-agent";
  jobKey: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId?: string;
  runAt?: string;
  requestId?: string | null;
  principalId?: string | null;
  experience?: AccessExperience | null;
  originatingApp?: string | null;
  originatingEngine?: EventSource | JobReadinessIntegration | "background-job";
  schedule?: JobSchedule;
}>;

export type BackgroundJobSnapshot = Readonly<{
  id: string;
  jobKey: string;
  status: BackgroundJobStatus;
  attempt: number;
  progress: number;
}>;

export type BackgroundJob<TPayload extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
  id: string;
  definitionKey: string;
  queueKey: string;
  status: JobStatus;
  priority: JobPriority;
  payload: Readonly<TPayload>;
  schedule: JobSchedule;
  retryPolicy: RetryPolicy;
  deadLetterPolicy: DeadLetterPolicy;
  metadata: JobMetadata;
  attempt: number;
  progress: number;
  createdAt: string;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  deadLetteredAt?: string | null;
  errorMessage?: string | null;
}>;

export type JobContext = Readonly<{
  job: BackgroundJob;
  eventBus?: PlatformEventBus;
  now?: string;
}>;

export type JobResult<TValue = unknown> = Readonly<{
  status: Extract<JobStatus, "completed" | "failed" | "cancelled" | "dead-letter">;
  value?: TValue;
  errorMessage?: string;
  progress?: number;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type JobHandler<TPayload extends Record<string, unknown> = Record<string, unknown>, TResult = unknown> = (
  context: JobContext & Readonly<{ job: BackgroundJob<TPayload> }>,
) => JobResult<TResult> | Promise<JobResult<TResult>>;

export type JobQueue = Readonly<{
  key: string;
  provider: QueueProviderKind;
  priority: JobPriority;
  concurrency?: number;
  visibilityTimeoutSeconds?: number;
  supportsScheduling: boolean;
  supportsDeadLetter: boolean;
}>;

export type JobRegistry = Readonly<{
  definitions: readonly JobDefinition[];
}>;

export type JobQueueRegistry = Readonly<{
  queues: readonly JobQueue[];
}>;

export type JobValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type JobExecutionResult = Readonly<{
  job: BackgroundJob;
  result?: JobResult;
  publishedEvents: readonly PlatformEventName[];
}>;

export type JobReadinessIntegration =
  | "search-indexing"
  | "notification-delivery"
  | "report-generation"
  | "print-generation"
  | "import-export"
  | "automation"
  | "ai-task"
  | "cost-recalculation";

export const JOB_PLATFORM_EVENTS = {
  cancelled: definePlatformEventName("JobCancelled"),
  completed: definePlatformEventName("JobCompleted"),
  deadLettered: definePlatformEventName("JobDeadLettered"),
  failed: definePlatformEventName("JobFailed"),
  progress: definePlatformEventName("JobProgress"),
  queued: definePlatformEventName("JobQueued"),
  started: definePlatformEventName("JobStarted"),
} as const;

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  cancellable: true,
  delaySeconds: 30,
  maxAttempts: 3,
  strategy: "fixed",
  timeoutSeconds: 300,
};

export const DEFAULT_DEAD_LETTER_POLICY: DeadLetterPolicy = {
  afterAttempts: 3,
  enabled: true,
  queueKey: "dead-letter",
  retainForDays: 30,
};

export function defineJob<TDefinition extends JobDefinition>(definition: TDefinition): TDefinition {
  const validation = validateJobDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validateJobDefinition(definition: JobDefinition): JobValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Job definition key is required.");
  }

  if (definition.maxRetries < 0 || definition.timeoutSeconds < 1) {
    errors.push("Background job retry and timeout settings are invalid.");
  }

  errors.push(...validateRetryPolicy(definition.retryPolicy ?? {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: definition.maxRetries + 1,
    timeoutSeconds: definition.timeoutSeconds,
  }).errors);

  if (definition.deadLetterPolicy) {
    errors.push(...validateDeadLetterPolicy(definition.deadLetterPolicy).errors);
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function validateRetryPolicy(policy: RetryPolicy): JobValidationResult {
  const errors: string[] = [];

  if (policy.maxAttempts < 1) {
    errors.push("Retry policy maxAttempts must be at least 1.");
  }

  if (policy.strategy !== "none" && (policy.delaySeconds ?? 0) < 0) {
    errors.push("Retry policy delaySeconds cannot be negative.");
  }

  if (policy.strategy === "exponential" && (policy.backoffMultiplier ?? 0) < 1) {
    errors.push("Exponential retry policy requires backoffMultiplier of at least 1.");
  }

  if ((policy.timeoutSeconds ?? 1) < 1) {
    errors.push("Retry policy timeoutSeconds must be at least 1.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function validateDeadLetterPolicy(policy: DeadLetterPolicy): JobValidationResult {
  const errors: string[] = [];

  if (policy.enabled && policy.afterAttempts < 1) {
    errors.push("Dead-letter policy afterAttempts must be at least 1.");
  }

  if (policy.enabled && !policy.queueKey) {
    errors.push("Dead-letter policy requires a queue key when enabled.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createJobRegistry(definitions: readonly JobDefinition[] = []): JobRegistry {
  return {
    definitions: dedupeByKey(definitions),
  };
}

export function registerJob(registry: JobRegistry, definition: JobDefinition): JobRegistry {
  defineJob(definition);

  return createJobRegistry([
    ...registry.definitions.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function defineJobQueue<TQueue extends JobQueue>(queue: TQueue): TQueue {
  if (!queue.key.trim()) {
    throw new Error("Job queue key is required.");
  }

  if ((queue.concurrency ?? 1) < 1) {
    throw new Error("Job queue concurrency must be at least 1.");
  }

  return queue;
}

export function createJobQueueRegistry(queues: readonly JobQueue[] = []): JobQueueRegistry {
  return {
    queues: dedupeByKey(queues),
  };
}

export function registerJobQueue(registry: JobQueueRegistry, queue: JobQueue): JobQueueRegistry {
  defineJobQueue(queue);

  return createJobQueueRegistry([
    ...registry.queues.filter((candidate) => candidate.key !== queue.key),
    queue,
  ]);
}

export function createBackgroundJob<TPayload extends Record<string, unknown>>(
  definition: JobDefinition,
  request: BackgroundJobRequest & Readonly<{ id: string; createdAt: string; payload: TPayload }>,
): BackgroundJob<TPayload> {
  const retryPolicy = definition.retryPolicy ?? {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: definition.maxRetries + 1,
    timeoutSeconds: definition.timeoutSeconds,
  };

  return {
    attempt: 0,
    createdAt: request.createdAt,
    deadLetterPolicy: definition.deadLetterPolicy ?? {
      ...DEFAULT_DEAD_LETTER_POLICY,
      afterAttempts: retryPolicy.maxAttempts,
    },
    definitionKey: definition.key,
    id: request.id,
    metadata: {
      actorId: request.actorUserId,
      actorType: request.actorType,
      branchId: request.branchId,
      companyId: request.companyId,
      correlationId: request.correlationId ?? request.idempotencyKey,
      experience: request.experience,
      idempotencyKey: request.idempotencyKey,
      originatingApp: request.originatingApp,
      originatingEngine: request.originatingEngine ?? "background-job",
      principalId: request.principalId,
      requestId: request.requestId,
      retryCount: 0,
      tenantId: request.tenantId,
    },
    payload: request.payload,
    priority: definition.priority,
    progress: 0,
    queueKey: definition.queueKey ?? "default",
    retryPolicy,
    schedule: request.schedule ?? definition.schedule ?? toSchedule(request.runAt),
    status: "pending",
  };
}

export function canTransitionJobStatus(from: JobStatus, to: JobStatus): boolean {
  const transitions: Record<JobStatus, readonly JobStatus[]> = {
    cancelled: ["dead-letter"],
    completed: [],
    "dead-letter": [],
    failed: ["retrying", "dead-letter"],
    pending: ["queued", "cancelled"],
    queued: ["running", "cancelled"],
    retrying: ["queued", "running", "cancelled", "dead-letter"],
    running: ["completed", "failed", "cancelled"],
  };

  return transitions[from].includes(to);
}

export function transitionJobStatus(
  job: BackgroundJob,
  status: JobStatus,
  at: string,
  options: Readonly<{
    progress?: number;
    errorMessage?: string | null;
    executionDurationMs?: number | null;
  }> = {},
): BackgroundJob {
  if (!canTransitionJobStatus(job.status, status)) {
    throw new Error(`Cannot transition job from ${job.status} to ${status}.`);
  }

  return {
    ...job,
    attempt: status === "running" ? job.attempt + 1 : job.attempt,
    cancelledAt: status === "cancelled" ? at : job.cancelledAt,
    completedAt: status === "completed" ? at : job.completedAt,
    deadLetteredAt: status === "dead-letter" ? at : job.deadLetteredAt,
    errorMessage: options.errorMessage ?? job.errorMessage,
    failedAt: status === "failed" ? at : job.failedAt,
    metadata: {
      ...job.metadata,
      executionDurationMs: options.executionDurationMs ?? job.metadata.executionDurationMs,
      retryCount: status === "retrying" ? job.metadata.retryCount + 1 : job.metadata.retryCount,
    },
    progress: options.progress ?? (status === "completed" ? 100 : job.progress),
    queuedAt: status === "queued" ? at : job.queuedAt,
    startedAt: status === "running" ? at : job.startedAt,
    status,
  };
}

export function shouldRetryJob(job: BackgroundJob): boolean {
  return job.status === "failed"
    && job.retryPolicy.strategy !== "none"
    && job.attempt < job.retryPolicy.maxAttempts;
}

export function moveJobToDeadLetter(job: BackgroundJob, at: string, reason: string): BackgroundJob {
  const failedOrCancelled = job.status === "failed" || job.status === "cancelled"
    ? job
    : {
      ...job,
      status: "failed" as const,
    };

  return transitionJobStatus(failedOrCancelled, "dead-letter", at, { errorMessage: reason });
}

export async function executeJob(
  job: BackgroundJob,
  handler: JobHandler,
  context: Omit<JobContext, "job"> = {},
): Promise<JobExecutionResult> {
  const publishedEvents: PlatformEventName[] = [];
  let currentJob = job.status === "pending"
    ? transitionJobStatus(job, "queued", context.now ?? new Date().toISOString())
    : job;

  await publishJobEvent(JOB_PLATFORM_EVENTS.queued, currentJob, context.eventBus, context.now);
  publishedEvents.push(JOB_PLATFORM_EVENTS.queued);

  currentJob = transitionJobStatus(currentJob, "running", context.now ?? new Date().toISOString());
  await publishJobEvent(JOB_PLATFORM_EVENTS.started, currentJob, context.eventBus, context.now);
  publishedEvents.push(JOB_PLATFORM_EVENTS.started);

  try {
    const result = await handler({ ...context, job: currentJob });

    if (result.progress !== undefined) {
      currentJob = {
        ...currentJob,
        progress: result.progress,
      };
      await publishJobEvent(JOB_PLATFORM_EVENTS.progress, currentJob, context.eventBus, context.now);
      publishedEvents.push(JOB_PLATFORM_EVENTS.progress);
    }

    currentJob = transitionJobStatus(currentJob, result.status, context.now ?? new Date().toISOString(), {
      errorMessage: result.errorMessage,
      progress: result.progress,
    });
    await publishJobEvent(jobEventForStatus(currentJob.status), currentJob, context.eventBus, context.now);
    publishedEvents.push(jobEventForStatus(currentJob.status));

    return {
      job: currentJob,
      publishedEvents,
      result,
    };
  } catch (error) {
    currentJob = transitionJobStatus(currentJob, "failed", context.now ?? new Date().toISOString(), {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    await publishJobEvent(JOB_PLATFORM_EVENTS.failed, currentJob, context.eventBus, context.now);
    publishedEvents.push(JOB_PLATFORM_EVENTS.failed);

    return {
      job: currentJob,
      publishedEvents,
      result: {
        errorMessage: currentJob.errorMessage ?? undefined,
        status: "failed",
      },
    };
  }
}

export function cancelJob(job: BackgroundJob, at: string, reason?: string): BackgroundJob {
  return transitionJobStatus(job, "cancelled", at, { errorMessage: reason });
}

export function createJobAuditMetadata(job: BackgroundJob): Readonly<{
  action: AuditAction;
  jobId: string;
  jobKey: string;
  queueKey: string;
  status: JobStatus;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  originatingApp?: string | null;
  originatingEngine: EventSource | JobReadinessIntegration | "background-job";
  executionDurationMs?: number | null;
  retryCount: number;
}> {
  return {
    action: `background-job.${job.status}` as AuditAction,
    actorId: job.metadata.actorId,
    branchId: job.metadata.branchId,
    companyId: job.metadata.companyId,
    correlationId: job.metadata.correlationId,
    executionDurationMs: job.metadata.executionDurationMs,
    jobId: job.id,
    jobKey: job.definitionKey,
    originatingApp: job.metadata.originatingApp,
    originatingEngine: job.metadata.originatingEngine,
    principalId: job.metadata.principalId,
    queueKey: job.queueKey,
    retryCount: job.metadata.retryCount,
    status: job.status,
    tenantId: job.metadata.tenantId,
  };
}

export function createJobTelemetryMetadata(job: BackgroundJob): Pick<
  TelemetryEvent,
  "correlationId" | "requestId" | "tenantId" | "companyId" | "branchId" | "sourceKey"
> & Readonly<{
  jobId: string;
  jobKey: string;
  queueKey: string;
  status: JobStatus;
  durationMs?: number | null;
  retryCount: number;
}> {
  return {
    branchId: job.metadata.branchId,
    companyId: job.metadata.companyId,
    correlationId: job.metadata.correlationId,
    durationMs: job.metadata.executionDurationMs,
    jobId: job.id,
    jobKey: job.definitionKey,
    queueKey: job.queueKey,
    requestId: job.metadata.requestId,
    retryCount: job.metadata.retryCount,
    sourceKey: job.metadata.originatingEngine,
    status: job.status,
    tenantId: job.metadata.tenantId,
  };
}

export function createJobReadinessContract(
  integration: JobReadinessIntegration,
  jobKey: string,
): Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  requiresBackgroundExecution: true;
}> {
  return {
    integration,
    jobKey,
    requiresBackgroundExecution: true,
  };
}

async function publishJobEvent(
  eventName: PlatformEventName,
  job: BackgroundJob,
  eventBus?: PlatformEventBus,
  timestamp?: string,
): Promise<void> {
  if (!eventBus) {
    return;
  }

  await eventBus.publish(createPlatformEvent({
    metadata: createEventMetadata({
      category: "background-job",
      context: {
        actorType: job.metadata.actorType,
        branchId: job.metadata.branchId,
        companyId: job.metadata.companyId,
        correlationId: job.metadata.correlationId,
        experience: job.metadata.experience,
        principalId: job.metadata.principalId,
        requestId: job.metadata.requestId,
        sourceApp: job.metadata.originatingApp,
        sourceEngine: "background-job",
        tenantId: job.metadata.tenantId,
      },
      eventId: crypto.randomUUID(),
      eventName,
      eventVersion: 1,
      kind: "domain",
      priority: job.priority,
      source: "background-job",
      sourceApp: job.metadata.originatingApp,
      timestamp,
    }),
    payload: {
      attempt: job.attempt,
      jobId: job.id,
      jobKey: job.definitionKey,
      progress: job.progress,
      queueKey: job.queueKey,
      retryCount: job.metadata.retryCount,
      status: job.status,
    },
  }));
}

function jobEventForStatus(status: JobStatus): PlatformEventName {
  switch (status) {
    case "completed":
      return JOB_PLATFORM_EVENTS.completed;
    case "failed":
      return JOB_PLATFORM_EVENTS.failed;
    case "cancelled":
      return JOB_PLATFORM_EVENTS.cancelled;
    case "dead-letter":
      return JOB_PLATFORM_EVENTS.deadLettered;
    case "pending":
    case "queued":
      return JOB_PLATFORM_EVENTS.queued;
    case "running":
      return JOB_PLATFORM_EVENTS.started;
    case "retrying":
      return JOB_PLATFORM_EVENTS.progress;
  }
}

function toSchedule(runAt?: string): JobSchedule {
  if (runAt) {
    return {
      kind: "scheduled",
      runAt,
    };
  }

  return {
    kind: "immediate",
  };
}

function dedupeByKey<TItem extends Readonly<{ key: string }>>(items: readonly TItem[]): readonly TItem[] {
  const byKey = new Map<string, TItem>();

  for (const item of items) {
    byKey.set(item.key, item);
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}
