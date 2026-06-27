import type { ActorType, RequestContext } from "@/core/context";

export type IntegrationEventKind = "domain" | "integration";
export type EventHandlerMode = "sync" | "async";
export type EventDeliveryStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed"
  | "dead_lettered";
export type EventOutboxStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead_letter"
  | "cancelled";

export type EventName = string & { readonly __brand: "EventName" };

export type EventMetadata = Readonly<{
  eventId: string;
  eventName: EventName;
  eventKind: IntegrationEventKind;
  eventVersion: number;
  aggregateId: string;
  aggregateType: string;
  occurredAt: string;
  sourceModule: string;
  correlationId: string;
  requestId?: string;
  causationId?: string;
  idempotencyKey?: string;
  tenantId: string;
  companyId?: string;
  branchId?: string;
  actor: Readonly<{
    type: ActorType;
    userId?: string;
  }>;
  schemaVersion: string;
  tags?: readonly string[];
  extensions?: Record<string, unknown>;
}>;

export type DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  Readonly<{
    metadata: EventMetadata;
    payload: TPayload;
  }>;

export type EventDefinition = Readonly<{
  name: EventName;
  kind: IntegrationEventKind;
  version: number;
  moduleKey: string;
  description: string;
  payloadSchemaKey?: string;
  deprecatedBy?: EventName;
}>;

export type ModuleEventRegistration = Readonly<{
  moduleKey: string;
  events: readonly EventDefinition[];
}>;

export type IntegrationDirection = "inbound" | "outbound" | "bidirectional";
export type IntegrationChannel =
  | "api"
  | "webhook"
  | "mobile"
  | "ai"
  | "background";

export type IntegrationDefinition = Readonly<{
  key: string;
  moduleKey: string;
  name: string;
  channel: IntegrationChannel;
  direction: IntegrationDirection;
  apiVersions: readonly string[];
  eventNames: readonly EventName[];
  requiresCredentials: boolean;
}>;

export type ModuleIntegrationRegistration = Readonly<{
  moduleKey: string;
  integrations: readonly IntegrationDefinition[];
}>;

export type ApiVersionStatus = "draft" | "active" | "deprecated" | "retired";

export type ApiVersionDefinition = Readonly<{
  version: "v1" | "v2" | (string & {});
  status: ApiVersionStatus;
  introducedAt: string;
  sunsetAt?: string;
  notes?: string;
}>;

export type WebhookSignatureAlgorithm = "hmac-sha256";
export type WebhookDeliveryAttemptStatus = "pending" | "success" | "failed";
export type WebhookDeliveryPersistenceStatus = EventOutboxStatus;

export type OutgoingWebhookDefinition = Readonly<{
  key: string;
  tenantId: string;
  targetUrl: string;
  subscribedEvents: readonly EventName[];
  secretReference: string;
  signatureAlgorithm: WebhookSignatureAlgorithm;
  maxRetries: number;
  isActive: boolean;
}>;

export type WebhookDeliveryLog = Readonly<{
  deliveryId: string;
  webhookKey: string;
  eventId: string;
  idempotencyKey: string;
  attempt: number;
  status: WebhookDeliveryAttemptStatus;
  responseStatusCode?: number;
  nextRetryAt?: string;
  signature?: string;
  errorMessage?: string;
}>;

export type EventOutboxRecord = Readonly<{
  id: string;
  tenantId: string;
  eventId: string;
  eventName: EventName;
  eventVersion: number;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: EventOutboxStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  processedAt?: string | null;
  errorMessage?: string | null;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type EnqueueEventOutboxInput = Readonly<{
  event: DomainEvent;
  idempotencyKey?: string;
  maxRetries?: number;
  nextRetryAt?: string | null;
}>;

export type ClaimEventOutboxInput = Readonly<{
  lockedBy: string;
  limit?: number;
  now?: string;
}>;

export type MarkEventFailedInput = Readonly<{
  eventOutboxId: string;
  lockedBy: string;
  errorMessage: string;
  nextRetryAt?: string | null;
}>;

export type MoveEventToDeadLetterInput = Readonly<{
  eventOutboxId: string;
  lockedBy: string;
  reason: string;
  handlerKey?: string;
}>;

export type QueueMessage = Readonly<{
  messageId: string;
  tenantId: string;
  eventId: string;
  eventName: EventName;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
  correlationId: string;
}>;

export type QueueClaimOptions = Readonly<{
  queueKey: string;
  lockedBy: string;
  limit: number;
}>;

export type QueueAdapter = Readonly<{
  enqueue(message: QueueMessage): Promise<void>;
  claim(options: QueueClaimOptions): Promise<readonly QueueMessage[]>;
  acknowledge(messageId: string): Promise<void>;
  fail(messageId: string, errorMessage: string): Promise<void>;
}>;

export type WebhookDeliveryPersistenceRecord = Readonly<{
  deliveryId: string;
  eventId: string;
  eventName: EventName;
  eventVersion: number;
  status: WebhookDeliveryPersistenceStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  signedPayloadHash: string;
  idempotencyKey: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}>;

export type ImportFormat = "excel" | "csv" | "json";
export type ImportValidationSeverity = "error" | "warning";

export type ImportValidationIssue = Readonly<{
  rowNumber?: number;
  fieldKey?: string;
  severity: ImportValidationSeverity;
  message: string;
}>;

export type ImportPreviewRow = Readonly<{
  rowNumber: number;
  values: Record<string, unknown>;
  issues: readonly ImportValidationIssue[];
}>;

export type ImportRequest = Readonly<{
  tenantId: string;
  moduleKey: string;
  importKey: string;
  format: ImportFormat;
  fileAttachmentId?: string;
  rawPayload?: unknown;
  idempotencyKey: string;
}>;

export type ImportPreview = Readonly<{
  importKey: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  rows: readonly ImportPreviewRow[];
  issues: readonly ImportValidationIssue[];
}>;

export type ImportRollbackPlaceholder = Readonly<{
  importKey: string;
  rollbackSupported: false;
  reason: string;
}>;

export type GenericExportFormat = "excel" | "csv" | "json";

export type GenericExportDefinition = Readonly<{
  key: string;
  moduleKey: string;
  supportedFormats: readonly GenericExportFormat[];
  description: string;
}>;

export type GenericExportRequest = Readonly<{
  tenantId: string;
  moduleKey: string;
  exportKey: string;
  format: GenericExportFormat;
  filters?: Record<string, unknown>;
  idempotencyKey: string;
}>;

export type EventBackgroundHandlerDefinition = Readonly<{
  key: string;
  eventName: EventName;
  queueKey: string;
  maxRetries: number;
  timeoutSeconds: number;
}>;

export type EventHandlerRunStatus = EventDeliveryStatus;

export type EventHandlerRunRecord = Readonly<{
  eventId: string;
  eventName: EventName;
  handlerKey: string;
  idempotencyKey: string;
  status: EventHandlerRunStatus;
  attempt: number;
  maxRetries: number;
  cancellationRequested: boolean;
  progress: Record<string, unknown>;
  logs: readonly Record<string, unknown>[];
}>;

export function defineEventName(value: string): EventName {
  if (!/^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error("Event names must use module.event dot notation.");
  }

  return value as EventName;
}

export function defineEventDefinition<TDefinition extends EventDefinition>(
  definition: TDefinition,
): TDefinition {
  if (definition.version < 1) {
    throw new Error("Event versions start at 1.");
  }

  if (definition.moduleKey !== definition.moduleKey.toLowerCase()) {
    throw new Error("Event module keys must be lowercase.");
  }

  return definition;
}

export function defineModuleEventRegistration<TRegistration extends ModuleEventRegistration>(
  registration: TRegistration,
): TRegistration {
  return registration;
}

export function defineModuleIntegrationRegistration<
  TRegistration extends ModuleIntegrationRegistration,
>(registration: TRegistration): TRegistration {
  return registration;
}

export function createEventMetadata(params: {
  eventName: EventName;
  eventKind: IntegrationEventKind;
  eventVersion: number;
  aggregateId: string;
  aggregateType: string;
  sourceModule: string;
  context: RequestContext;
  eventId: string;
  requestId?: string;
  causationId?: string;
  idempotencyKey?: string;
  occurredAt?: string;
  schemaVersion?: string;
  tags?: readonly string[];
  extensions?: Record<string, unknown>;
}): EventMetadata {
  if (!params.context.tenantId) {
    throw new Error("Published events require tenant context.");
  }

  if (!params.context.correlationId) {
    throw new Error("Published events require a correlation ID.");
  }

  if (!params.aggregateId || !params.aggregateType) {
    throw new Error("Published events require aggregate identity.");
  }

  return {
    actor: Object.freeze({
      type: params.context.actorType,
      userId: params.context.userId,
    }),
    aggregateId: params.aggregateId,
    aggregateType: params.aggregateType.toLowerCase(),
    branchId: params.context.branchId,
    causationId: params.causationId,
    companyId: params.context.companyId,
    correlationId: params.context.correlationId,
    eventId: params.eventId,
    eventKind: params.eventKind,
    eventName: params.eventName,
    eventVersion: params.eventVersion,
    extensions: params.extensions,
    idempotencyKey: params.idempotencyKey,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    requestId: params.requestId,
    schemaVersion: params.schemaVersion ?? `${params.eventName}.v${params.eventVersion}`,
    sourceModule: params.sourceModule,
    tags: params.tags,
    tenantId: params.context.tenantId,
  };
}

export function createDomainEvent<TPayload extends Record<string, unknown>>(params: {
  metadata: EventMetadata;
  payload: TPayload;
}): DomainEvent<Readonly<TPayload>> {
  return deepFreeze({
    metadata: params.metadata,
    payload: params.payload,
  });
}

function deepFreeze<TValue>(value: TValue): Readonly<TValue> {
  if (value && typeof value === "object") {
    Object.freeze(value);

    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }

  return value as Readonly<TValue>;
}
