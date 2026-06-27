import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type {
  ApiVersionDefinition,
  ClaimEventOutboxInput,
  DomainEvent,
  EnqueueEventOutboxInput,
  EventBackgroundHandlerDefinition,
  EventDefinition,
  EventHandlerMode,
  EventName,
  EventOutboxRecord,
  GenericExportDefinition,
  GenericExportRequest,
  ImportPreview,
  ImportRequest,
  IntegrationDefinition,
  MarkEventFailedInput,
  ModuleEventRegistration,
  ModuleIntegrationRegistration,
  MoveEventToDeadLetterInput,
  OutgoingWebhookDefinition,
  WebhookDeliveryLog,
} from "./public-api";

export type EventAuditRecord = Readonly<{
  eventId: string;
  eventName: EventName;
  eventVersion: number;
  aggregateId: string;
  aggregateType: string;
  sourceModule: string;
  correlationId: string;
  requestId?: string;
  causationId?: string;
  actor: Record<string, unknown>;
  occurredAt: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}>;

export type EventAuditSink = Readonly<{
  recordPublishedEvent(event: DomainEvent): Promise<void> | void;
  recordDeadLetter(params: EventDeadLetter): Promise<void> | void;
}>;

export type EventDeadLetter = Readonly<{
  event: DomainEvent;
  handlerKey: string;
  failedAt: string;
  attempt: number;
  errorMessage: string;
}>;

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export type EventSubscription = Readonly<{
  key: string;
  eventName: EventName;
  mode: EventHandlerMode;
  maxRetries: number;
  handler: EventHandler;
  deadLetterHandler?: (deadLetter: EventDeadLetter) => Promise<void> | void;
}>;

export class EventRegistry {
  private readonly definitions = new Map<string, EventDefinition>();

  registerModule(registration: ModuleEventRegistration): void {
    for (const definition of registration.events) {
      const registryKey = this.createRegistryKey(definition.name, definition.version);

      if (this.definitions.has(registryKey)) {
        throw new ApplicationError({
          code: "CONFLICT",
          message: `Event ${definition.name} v${definition.version} is already registered.`,
        });
      }

      this.definitions.set(registryKey, definition);
    }
  }

  getDefinition(eventName: EventName, version: number): EventDefinition | undefined {
    return this.definitions.get(this.createRegistryKey(eventName, version));
  }

  listDefinitions(): readonly EventDefinition[] {
    return Array.from(this.definitions.values());
  }

  assertRegistered(event: DomainEvent): void {
    const definition = this.getDefinition(
      event.metadata.eventName,
      event.metadata.eventVersion,
    );

    if (!definition) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Event ${event.metadata.eventName} v${event.metadata.eventVersion} is not registered.`,
        correlationId: event.metadata.correlationId,
      });
    }
  }

  private createRegistryKey(eventName: EventName, version: number): string {
    return `${eventName}@${version}`;
  }
}

export class IntegrationRegistry {
  private readonly definitions = new Map<string, IntegrationDefinition>();

  registerModule(registration: ModuleIntegrationRegistration): void {
    for (const integration of registration.integrations) {
      if (this.definitions.has(integration.key)) {
        throw new ApplicationError({
          code: "CONFLICT",
          message: `Integration ${integration.key} is already registered.`,
        });
      }

      this.definitions.set(integration.key, integration);
    }
  }

  listDefinitions(): readonly IntegrationDefinition[] {
    return Array.from(this.definitions.values());
  }
}

export class ApiVersionRegistry {
  private readonly versions = new Map<string, ApiVersionDefinition>();

  register(version: ApiVersionDefinition): void {
    if (this.versions.has(version.version)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `API version ${version.version} is already registered.`,
      });
    }

    this.versions.set(version.version, version);
  }

  listVersions(): readonly ApiVersionDefinition[] {
    return Array.from(this.versions.values());
  }
}

export class EventBus {
  private readonly subscriptions = new Map<string, EventSubscription[]>();

  constructor(
    private readonly eventRegistry: EventRegistry,
    private readonly auditSink?: EventAuditSink,
  ) {}

  subscribe(subscription: EventSubscription): () => void {
    if (subscription.maxRetries < 0) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Event subscriptions cannot use negative retries.",
      });
    }

    const existing = this.subscriptions.get(subscription.eventName) ?? [];
    if (existing.some((item) => item.key === subscription.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Event subscription ${subscription.key} is already registered for ${subscription.eventName}.`,
      });
    }

    this.subscriptions.set(subscription.eventName, [...existing, subscription]);

    return () => {
      const current = this.subscriptions.get(subscription.eventName) ?? [];
      this.subscriptions.set(
        subscription.eventName,
        current.filter((item) => item.key !== subscription.key),
      );
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    this.validateEventEnvelope(event);
    const immutableEvent = deepFreezeClone(event);

    this.eventRegistry.assertRegistered(immutableEvent);
    await this.auditSink?.recordPublishedEvent(immutableEvent);

    const subscriptions = this.subscriptions.get(immutableEvent.metadata.eventName) ?? [];
    const syncHandlers = subscriptions.filter((subscription) => subscription.mode === "sync");
    const asyncHandlers = subscriptions.filter((subscription) => subscription.mode === "async");

    for (const subscription of syncHandlers) {
      await this.runWithRetry(subscription, immutableEvent);
    }

    await Promise.all(
      asyncHandlers.map((subscription) => this.runWithRetry(subscription, immutableEvent)),
    );
  }

  private validateEventEnvelope(event: DomainEvent): void {
    const { metadata } = event;
    const missingFields = [
      ["eventId", metadata.eventId],
      ["eventName", metadata.eventName],
      ["eventVersion", metadata.eventVersion],
      ["aggregateId", metadata.aggregateId],
      ["aggregateType", metadata.aggregateType],
      ["tenantId", metadata.tenantId],
      ["occurredAt", metadata.occurredAt],
      ["correlationId", metadata.correlationId],
      ["actor.type", metadata.actor?.type],
      ["metadata", metadata],
    ].filter(([, value]) => value === undefined || value === null || value === "");

    if (missingFields.length > 0) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Domain event envelope is missing required fields: ${missingFields.map(([field]) => field).join(", ")}.`,
        correlationId: metadata.correlationId,
      });
    }
  }

  private async runWithRetry(
    subscription: EventSubscription,
    event: DomainEvent,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= subscription.maxRetries + 1; attempt += 1) {
      try {
        await subscription.handler(event);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    const deadLetter: EventDeadLetter = {
      attempt: subscription.maxRetries + 1,
      errorMessage: readErrorMessage(lastError),
      event,
      failedAt: new Date().toISOString(),
      handlerKey: subscription.key,
    };

    await subscription.deadLetterHandler?.(deadLetter);
    await this.auditSink?.recordDeadLetter(deadLetter);
  }
}

const EVENT_OUTBOX_COLUMNS = [
  "id",
  "tenant_id",
  "event_id",
  "event_name",
  "event_version",
  "aggregate_id",
  "aggregate_type",
  "payload",
  "metadata",
  "status",
  "retry_count",
  "max_retries",
  "next_retry_at",
  "locked_at",
  "locked_by",
  "processed_at",
  "error_message",
  "idempotency_key",
  "correlation_id",
  "causation_id",
  "created_at",
  "updated_at",
].join(", ");

const DEFAULT_OUTBOX_HANDLER_KEY = "platform.outbox";

export class OutboxService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async enqueue(input: EnqueueEventOutboxInput): Promise<EventOutboxRecord> {
    this.assertTenantScoped(input.event);

    const idempotencyKey = input.idempotencyKey ?? input.event.metadata.idempotencyKey;
    if (!idempotencyKey) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Outbox events require an idempotency key.",
        correlationId: input.event.metadata.correlationId,
      });
    }

    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const { data, error } = await this.supabase
      .from("event_outbox")
      .insert({
        aggregate_id: input.event.metadata.aggregateId,
        aggregate_type: input.event.metadata.aggregateType,
        causation_id: input.event.metadata.causationId ?? null,
        correlation_id: input.event.metadata.correlationId,
        created_by: this.context.userId,
        event_id: input.event.metadata.eventId,
        event_name: input.event.metadata.eventName,
        event_version: input.event.metadata.eventVersion,
        idempotency_key: idempotencyKey,
        max_retries: input.maxRetries ?? 3,
        metadata: toJsonRecord(input.event.metadata),
        next_retry_at: input.nextRetryAt ?? null,
        payload: toJsonRecord(input.event.payload),
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select(EVENT_OUTBOX_COLUMNS)
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        const duplicated = await this.findByIdempotencyKey(idempotencyKey);
        if (duplicated) return duplicated;
      }

      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not enqueue durable event.",
        cause: error,
        correlationId: input.event.metadata.correlationId,
      });
    }

    return mapEventOutboxRow(data as unknown as Record<string, unknown>);
  }

  async claimPendingEvents(input: ClaimEventOutboxInput): Promise<readonly EventOutboxRecord[]> {
    const { data, error } = await this.supabase.rpc("claim_event_outbox", {
      input_limit: input.limit ?? 10,
      input_locked_by: input.lockedBy,
      input_now: input.now ?? new Date().toISOString(),
      input_tenant_id: this.context.tenantId,
    });

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not claim durable events.",
        cause: error,
        correlationId: this.context.correlationId,
      });
    }

    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapEventOutboxRow);
  }

  async markProcessing(eventOutboxId: string, lockedBy: string): Promise<EventOutboxRecord> {
    return this.updateOutboxRecord(eventOutboxId, {
      error_message: null,
      locked_at: new Date().toISOString(),
      locked_by: lockedBy,
      status: "processing",
    });
  }

  async markSucceeded(eventOutboxId: string, lockedBy: string): Promise<EventOutboxRecord> {
    await this.assertOutboxLockOwner(eventOutboxId, lockedBy);

    return this.updateOutboxRecord(eventOutboxId, {
      error_message: null,
      locked_at: null,
      locked_by: null,
      processed_at: new Date().toISOString(),
      status: "succeeded",
    });
  }

  async markFailed(input: MarkEventFailedInput): Promise<EventOutboxRecord> {
    const current = await this.requireOutboxRecord(input.eventOutboxId);
    this.assertLockedBy(current, input.lockedBy);
    const retryCount = current.retryCount + 1;

    if (retryCount > current.maxRetries) {
      return this.moveToDeadLetter({
        eventOutboxId: input.eventOutboxId,
        lockedBy: input.lockedBy,
        reason: input.errorMessage,
      });
    }

    const nextRetryAt = input.nextRetryAt ?? this.calculateNextRetryAt(retryCount);

    return this.updateOutboxRecord(input.eventOutboxId, {
      error_message: input.errorMessage,
      locked_at: null,
      locked_by: null,
      next_retry_at: nextRetryAt,
      retry_count: retryCount,
      status: "failed",
    });
  }

  async moveToDeadLetter(input: MoveEventToDeadLetterInput): Promise<EventOutboxRecord> {
    const current = await this.requireOutboxRecord(input.eventOutboxId);
    this.assertLockedBy(current, input.lockedBy);
    const now = new Date().toISOString();
    const handlerKey = input.handlerKey ?? DEFAULT_OUTBOX_HANDLER_KEY;

    const { error } = await this.supabase.from("event_dead_letters").insert({
      attempt: Math.max(current.retryCount, 1),
      created_by: this.context.userId,
      error_message: input.reason,
      event_id: current.eventId,
      event_name: current.eventName,
      failed_at: now,
      handler_key: handlerKey,
      metadata: {
        ...current.metadata,
        outbox_id: current.id,
      },
      payload: current.payload,
      payload_snapshot: current.payload,
      reason: input.reason,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not move durable event to dead letter.",
        cause: error,
        correlationId: current.correlationId,
      });
    }

    return this.updateOutboxRecord(input.eventOutboxId, {
      error_message: input.reason,
      locked_at: null,
      locked_by: null,
      processed_at: now,
      status: "dead_letter",
    });
  }

  private assertTenantScoped(event: DomainEvent): void {
    if (event.metadata.tenantId !== this.context.tenantId) {
      throw new ApplicationError({
        code: "AUTHORIZATION_ERROR",
        message: "Outbox writes must use the current tenant scope.",
        correlationId: event.metadata.correlationId,
      });
    }
  }

  private async findByIdempotencyKey(idempotencyKey: string): Promise<EventOutboxRecord | null> {
    const { data, error } = await this.supabase
      .from("event_outbox")
      .select(EVENT_OUTBOX_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("idempotency_key", idempotencyKey)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not read durable event idempotency record.",
        cause: error,
        correlationId: this.context.correlationId,
      });
    }

    return data ? mapEventOutboxRow(data as unknown as Record<string, unknown>) : null;
  }

  private async requireOutboxRecord(eventOutboxId: string): Promise<EventOutboxRecord> {
    const { data, error } = await this.supabase
      .from("event_outbox")
      .select(EVENT_OUTBOX_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", eventOutboxId)
      .is("deleted_at", null)
      .single();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not read durable event.",
        cause: error,
        correlationId: this.context.correlationId,
      });
    }

    return mapEventOutboxRow(data as unknown as Record<string, unknown>);
  }

  private async assertOutboxLockOwner(eventOutboxId: string, lockedBy: string): Promise<void> {
    const current = await this.requireOutboxRecord(eventOutboxId);
    this.assertLockedBy(current, lockedBy);
  }

  private assertLockedBy(record: EventOutboxRecord, lockedBy: string): void {
    if (record.status !== "processing" || !record.lockedBy || record.lockedBy !== lockedBy) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Durable event can only be completed by the worker that owns the processing lock.",
        correlationId: record.correlationId,
      });
    }
  }

  private calculateNextRetryAt(retryCount: number): string {
    const delaySeconds = Math.min(300, 2 ** Math.max(retryCount - 1, 0) * 30);
    return new Date(Date.now() + delaySeconds * 1000).toISOString();
  }

  private async updateOutboxRecord(
    eventOutboxId: string,
    patch: Record<string, unknown>,
  ): Promise<EventOutboxRecord> {
    const { data, error } = await this.supabase
      .from("event_outbox")
      .update({ ...patch, updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", eventOutboxId)
      .is("deleted_at", null)
      .select(EVENT_OUTBOX_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not update durable event.",
        cause: error,
        correlationId: this.context.correlationId,
      });
    }

    return mapEventOutboxRow(data as unknown as Record<string, unknown>);
  }
}

export class BackgroundEventHandlerRegistry {
  private readonly handlers = new Map<string, EventBackgroundHandlerDefinition>();

  register(handler: EventBackgroundHandlerDefinition): void {
    if (handler.maxRetries < 0 || handler.timeoutSeconds < 1) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Background event handlers require valid retry and timeout settings.",
      });
    }

    if (this.handlers.has(handler.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Background event handler ${handler.key} is already registered.`,
      });
    }

    this.handlers.set(handler.key, handler);
  }

  listHandlers(): readonly EventBackgroundHandlerDefinition[] {
    return Array.from(this.handlers.values());
  }
}

export class WebhookEngine {
  signPayload(params: {
    payload: string;
    secret: string;
    timestamp: string;
  }): string {
    return createHmac("sha256", params.secret)
      .update(`${params.timestamp}.${params.payload}`)
      .digest("hex");
  }

  createDeliveryLog(params: {
    webhook: OutgoingWebhookDefinition;
    event: DomainEvent;
    secret: string;
  }): WebhookDeliveryLog {
    const payload = JSON.stringify(params.event);
    const timestamp = new Date().toISOString();

    return {
      attempt: 1,
      deliveryId: randomUUID(),
      eventId: params.event.metadata.eventId,
      idempotencyKey: `${params.webhook.key}:${params.event.metadata.eventId}:1`,
      signature: this.signPayload({
        payload,
        secret: params.secret,
        timestamp,
      }),
      status: "pending",
      webhookKey: params.webhook.key,
    };
  }

  validateWebhook(webhook: OutgoingWebhookDefinition): void {
    if (webhook.maxRetries < 0 || !webhook.targetUrl.startsWith("https://")) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Outgoing webhooks require HTTPS targets and non-negative retries.",
      });
    }
  }
}

export class ImportEngine {
  validateRequest(request: ImportRequest): void {
    if (!request.idempotencyKey) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Import requests require an idempotency key.",
      });
    }
  }

  createRollbackPlaceholder(request: ImportRequest): { importKey: string; rollbackSupported: false; reason: string } {
    this.validateRequest(request);

    return {
      importKey: request.importKey,
      reason: "Rollback is a Sprint 8 placeholder. No business data mutation is performed by the generic import foundation.",
      rollbackSupported: false,
    };
  }

  createPreview(params: {
    request: ImportRequest;
    rows: readonly Record<string, unknown>[];
  }): ImportPreview {
    this.validateRequest(params.request);

    const previewRows = params.rows.map((values, index) => ({
      issues: [],
      rowNumber: index + 1,
      values,
    }));

    return {
      acceptedRows: previewRows.length,
      importKey: params.request.importKey,
      issues: [],
      rejectedRows: 0,
      rows: previewRows,
      totalRows: previewRows.length,
    };
  }
}

export class GenericExportRegistry {
  private readonly definitions = new Map<string, GenericExportDefinition>();

  register(definition: GenericExportDefinition): void {
    if (this.definitions.has(definition.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Export definition ${definition.key} is already registered.`,
      });
    }

    this.definitions.set(definition.key, definition);
  }

  validateRequest(request: GenericExportRequest): void {
    const definition = this.definitions.get(request.exportKey);

    if (!definition || !definition.supportedFormats.includes(request.format)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Export request does not match a registered generic export definition.",
      });
    }

    if (!request.idempotencyKey) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Export requests require an idempotency key.",
      });
    }
  }
}

function mapEventOutboxRow(row: Record<string, unknown>): EventOutboxRecord {
  return {
    aggregateId: row.aggregate_id as string,
    aggregateType: row.aggregate_type as string,
    causationId: row.causation_id as string | null,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as string,
    errorMessage: row.error_message as string | null,
    eventId: row.event_id as string,
    eventName: row.event_name as EventName,
    eventVersion: row.event_version as number,
    id: row.id as string,
    idempotencyKey: row.idempotency_key as string,
    lockedAt: row.locked_at as string | null,
    lockedBy: row.locked_by as string | null,
    maxRetries: row.max_retries as number,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    nextRetryAt: row.next_retry_at as string | null,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    processedAt: row.processed_at as string | null,
    retryCount: row.retry_count as number,
    status: row.status as EventOutboxRecord["status"],
    tenantId: row.tenant_id as string,
    updatedAt: row.updated_at as string,
  };
}

function toJsonRecord(value: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(value);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown event handler failure.";
}

function deepFreezeClone<TValue>(value: TValue): Readonly<TValue> {
  const clone = structuredClone(value);
  return deepFreeze(clone);
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
