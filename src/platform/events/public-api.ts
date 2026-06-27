import type { AccessExperience, ActorType } from "@/core/context";

export type PlatformEventName = string & { readonly __brand: "PlatformEventName" };

export type EventPriority = "low" | "normal" | "high" | "critical";

export type EventCategory =
  | "document"
  | "workflow"
  | "approval"
  | "activity"
  | "assignment"
  | "comment"
  | "attachment"
  | "security"
  | "reporting"
  | "printing"
  | "export"
  | "import"
  | "background-job"
  | "automation"
  | "ai"
  | "system";

export type EventSource =
  | "document-engine"
  | "audit-engine"
  | "observability"
  | "workflow"
  | "approval"
  | "notification"
  | "automation"
  | "reporting"
  | "printing"
  | "import-export"
  | "background-job"
  | "auth"
  | "security"
  | "ai"
  | "business-app"
  | "system";

export type PlatformEventKind = "domain" | "integration" | "system";

export type EventContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  principalId?: string | null;
  actorType?: ActorType | null;
  sourceEngine: EventSource;
  sourceApp?: string | null;
}>;

export type EventRetryMetadata = Readonly<{
  attempt: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  deadLetterEligible: boolean;
}>;

export type EventMetadata = Readonly<{
  eventId: string;
  eventName: PlatformEventName;
  eventVersion: number;
  kind: PlatformEventKind;
  category: EventCategory;
  priority: EventPriority;
  timestamp: string;
  context: EventContext;
  source: EventSource;
  sourceApp?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  schemaVersion: string;
  retry?: EventRetryMetadata;
  tags?: readonly string[];
  deprecated?: boolean;
}>;

export type PlatformEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  Readonly<{
    metadata: EventMetadata;
    payload: Readonly<TPayload>;
  }>;

export type DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  PlatformEvent<TPayload> & Readonly<{ metadata: EventMetadata & { kind: "domain" } }>;

export type IntegrationEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  PlatformEvent<TPayload> & Readonly<{ metadata: EventMetadata & { kind: "integration" } }>;

export type SystemEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  PlatformEvent<TPayload> & Readonly<{ metadata: EventMetadata & { kind: "system" } }>;

export type PlatformEventDefinition = Readonly<{
  name: PlatformEventName;
  version: number;
  kind: PlatformEventKind;
  category: EventCategory;
  source: EventSource;
  description: string;
  payloadSchemaKey?: string;
  introducedAt?: string;
  deprecatedAt?: string | null;
  deprecatedBy?: PlatformEventName | null;
}>;

export type PlatformEventRegistry = Readonly<{
  events: readonly PlatformEventDefinition[];
}>;

export type EventRegistryValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type EventHandlerMode = "sync" | "async";

export type PlatformEventHandler<TEvent extends PlatformEvent = PlatformEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type EventHandlerRegistration<TEvent extends PlatformEvent = PlatformEvent> = Readonly<{
  token: string;
  eventName: PlatformEventName | "*";
  handler: PlatformEventHandler<TEvent>;
  mode: EventHandlerMode;
  priority: number;
  once: boolean;
  retry?: EventRetryMetadata;
}>;

export type EventDispatchResult = Readonly<{
  eventId: string;
  eventName: PlatformEventName;
  handlerToken: string;
  status: "handled" | "failed";
  error?: unknown;
}>;

export type EventSubscription = Readonly<{
  token: string;
  eventName: PlatformEventName | "*";
}>;

export type PlatformEventBus = Readonly<{
  publish<TEvent extends PlatformEvent>(event: TEvent): Promise<readonly EventDispatchResult[]>;
  dispatch<TEvent extends PlatformEvent>(event: TEvent): Promise<readonly EventDispatchResult[]>;
  subscribe<TEvent extends PlatformEvent>(
    eventName: PlatformEventName | "*",
    handler: PlatformEventHandler<TEvent>,
    options?: EventSubscribeOptions,
  ): EventSubscription;
  once<TEvent extends PlatformEvent>(
    eventName: PlatformEventName | "*",
    handler: PlatformEventHandler<TEvent>,
    options?: Omit<EventSubscribeOptions, "once">,
  ): EventSubscription;
  unsubscribe(subscription: EventSubscription | string): boolean;
}>;

export type EventSubscribeOptions = Readonly<{
  mode?: EventHandlerMode;
  priority?: number;
  token?: string;
  retry?: EventRetryMetadata;
  once?: boolean;
}>;

export const BUILT_IN_PLATFORM_EVENTS = [
  "DocumentCreated",
  "DocumentUpdated",
  "DocumentSubmitted",
  "DocumentApproved",
  "DocumentRejected",
  "DocumentCancelled",
  "DocumentArchived",
  "WorkflowStarted",
  "WorkflowTransitionRequested",
  "WorkflowTransitionCompleted",
  "WorkflowTransitionDenied",
  "WorkflowCompleted",
  "WorkflowCancelled",
  "ApprovalRequested",
  "ApprovalAssigned",
  "ApprovalGranted",
  "ApprovalRejected",
  "ApprovalReturned",
  "ApprovalCancelled",
  "ApprovalCompleted",
  "ActivityCreated",
  "AssignmentCreated",
  "CommentAdded",
  "AttachmentAdded",
  "UserLoggedIn",
  "SessionExpired",
  "PermissionDenied",
  "ReportGenerated",
  "PrintCompleted",
  "ExportCompleted",
  "ImportCompleted",
  "ImportFailed",
  "JobQueued",
  "JobStarted",
  "JobProgress",
  "JobCompleted",
  "JobFailed",
  "JobCancelled",
  "JobDeadLettered",
  "BackgroundJobCompleted",
  "AutomationExecuted",
  "AIActionCompleted",
] as const;

export const PLATFORM_EVENT_HOOK_INTEGRATIONS = {
  audit: ["audit-engine"],
  document: ["document-engine"],
  futureApproval: ["approval"],
  futureAutomation: ["automation"],
  futureNotification: ["notification"],
  futureWorkflow: ["workflow"],
  observability: ["observability"],
} as const satisfies Record<string, readonly EventSource[]>;

const BUILT_IN_EVENT_CATEGORIES: Record<(typeof BUILT_IN_PLATFORM_EVENTS)[number], EventCategory> = {
  AIActionCompleted: "ai",
  ActivityCreated: "activity",
  AssignmentCreated: "assignment",
  AttachmentAdded: "attachment",
  AutomationExecuted: "automation",
  BackgroundJobCompleted: "background-job",
  CommentAdded: "comment",
  DocumentApproved: "document",
  DocumentArchived: "document",
  DocumentCancelled: "document",
  DocumentCreated: "document",
  DocumentRejected: "document",
  DocumentSubmitted: "document",
  DocumentUpdated: "document",
  WorkflowCancelled: "workflow",
  WorkflowCompleted: "workflow",
  WorkflowStarted: "workflow",
  WorkflowTransitionCompleted: "workflow",
  WorkflowTransitionDenied: "workflow",
  WorkflowTransitionRequested: "workflow",
  ApprovalAssigned: "approval",
  ApprovalCancelled: "approval",
  ApprovalCompleted: "approval",
  ApprovalGranted: "approval",
  ApprovalRejected: "approval",
  ApprovalRequested: "approval",
  ApprovalReturned: "approval",
  ExportCompleted: "export",
  ImportCompleted: "import",
  ImportFailed: "import",
  JobCancelled: "background-job",
  JobCompleted: "background-job",
  JobDeadLettered: "background-job",
  JobFailed: "background-job",
  JobProgress: "background-job",
  JobQueued: "background-job",
  JobStarted: "background-job",
  PermissionDenied: "security",
  PrintCompleted: "printing",
  ReportGenerated: "reporting",
  SessionExpired: "security",
  UserLoggedIn: "security",
};

export const BUILT_IN_PLATFORM_EVENT_DEFINITIONS = BUILT_IN_PLATFORM_EVENTS.map((eventName) =>
  definePlatformEventDefinition({
    category: BUILT_IN_EVENT_CATEGORIES[eventName],
    description: `Built-in platform event: ${eventName}.`,
    kind: eventName.startsWith("Document") || eventName.endsWith("Created") ? "domain" : "system",
    name: definePlatformEventName(eventName),
    source: inferBuiltInEventSource(eventName),
    version: 1,
  }),
);

export function definePlatformEventName(value: string): PlatformEventName {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(value) && !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error("Platform event names must use PascalCase or module.event dot notation.");
  }

  return value as PlatformEventName;
}

export function definePlatformEventDefinition<TDefinition extends PlatformEventDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validatePlatformEventDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validatePlatformEventDefinition(
  definition: PlatformEventDefinition,
): EventRegistryValidationResult {
  const errors: string[] = [];

  if (definition.version < 1 || !Number.isInteger(definition.version)) {
    errors.push("Event versions must be positive integers.");
  }

  if (!definition.description.trim()) {
    errors.push("Event description is required.");
  }

  if (definition.deprecatedBy && !definition.deprecatedAt) {
    errors.push("Deprecated events must include deprecatedAt when deprecatedBy is set.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createPlatformEventRegistry(
  events: readonly PlatformEventDefinition[] = BUILT_IN_PLATFORM_EVENT_DEFINITIONS,
): PlatformEventRegistry {
  return {
    events: sortEventDefinitions(dedupeEventDefinitions(events)),
  };
}

export function registerPlatformEvent(
  registry: PlatformEventRegistry,
  definition: PlatformEventDefinition,
): PlatformEventRegistry {
  definePlatformEventDefinition(definition);

  return createPlatformEventRegistry([
    ...registry.events.filter((event) => !(event.name === definition.name && event.version === definition.version)),
    definition,
  ]);
}

export function deprecatePlatformEvent(
  registry: PlatformEventRegistry,
  eventName: PlatformEventName,
  version: number,
  deprecatedAt: string,
  deprecatedBy?: PlatformEventName,
): PlatformEventRegistry {
  return createPlatformEventRegistry(registry.events.map((event) => {
    if (event.name !== eventName || event.version !== version) {
      return event;
    }

    return {
      ...event,
      deprecatedAt,
      deprecatedBy: deprecatedBy ?? null,
    };
  }));
}

export function discoverPlatformEvents(
  registry: PlatformEventRegistry,
  filters: Readonly<{
    category?: EventCategory;
    kind?: PlatformEventKind;
    source?: EventSource;
    includeDeprecated?: boolean;
  }> = {},
): readonly PlatformEventDefinition[] {
  return registry.events.filter((event) =>
    (!filters.category || event.category === filters.category)
    && (!filters.kind || event.kind === filters.kind)
    && (!filters.source || event.source === filters.source)
    && (filters.includeDeprecated || !event.deprecatedAt),
  );
}

export function getPlatformEventDefinition(
  registry: PlatformEventRegistry,
  eventName: PlatformEventName,
  version?: number,
): PlatformEventDefinition | null {
  const matches = registry.events.filter((event) => event.name === eventName);

  if (version !== undefined) {
    return matches.find((event) => event.version === version) ?? null;
  }

  return matches.at(-1) ?? null;
}

export function createEventMetadata(
  input: Omit<EventMetadata, "timestamp" | "schemaVersion"> &
    Partial<Pick<EventMetadata, "timestamp" | "schemaVersion">>,
): EventMetadata {
  return {
    ...input,
    schemaVersion: input.schemaVersion ?? `${input.eventName}.v${input.eventVersion}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function createPlatformEvent<TPayload extends Record<string, unknown>>(
  input: Readonly<{
    metadata: EventMetadata;
    payload: TPayload;
  }>,
): PlatformEvent<TPayload> {
  return deepFreeze({
    metadata: input.metadata,
    payload: input.payload,
  });
}

export function createDomainPlatformEvent<TPayload extends Record<string, unknown>>(
  input: Readonly<{
    metadata: Omit<EventMetadata, "kind">;
    payload: TPayload;
  }>,
): DomainEvent<TPayload> {
  return createPlatformEvent({
    metadata: { ...input.metadata, kind: "domain" },
    payload: input.payload,
  }) as DomainEvent<TPayload>;
}

export function createPlatformEventBus(): PlatformEventBus {
  const handlers = new Map<PlatformEventName | "*", EventHandlerRegistration[]>();

  function subscribe<TEvent extends PlatformEvent>(
    eventName: PlatformEventName | "*",
    handler: PlatformEventHandler<TEvent>,
    options: EventSubscribeOptions = {},
  ): EventSubscription {
    const token = options.token ?? `${eventName}:${crypto.randomUUID()}`;
    const registration: EventHandlerRegistration = {
      eventName,
      handler: handler as PlatformEventHandler,
      mode: options.mode ?? "sync",
      once: options.once ?? false,
      priority: options.priority ?? 0,
      retry: options.retry,
      token,
    };

    handlers.set(eventName, sortHandlerRegistrations([
      ...(handlers.get(eventName) ?? []),
      registration,
    ]));

    return { eventName, token };
  }

  function unsubscribe(subscription: EventSubscription | string): boolean {
    const token = typeof subscription === "string" ? subscription : subscription.token;
    let removed = false;

    for (const [eventName, registrations] of handlers.entries()) {
      const nextRegistrations = registrations.filter((registration) => registration.token !== token);

      if (nextRegistrations.length !== registrations.length) {
        removed = true;
        handlers.set(eventName, nextRegistrations);
      }
    }

    return removed;
  }

  async function dispatch<TEvent extends PlatformEvent>(
    event: TEvent,
  ): Promise<readonly EventDispatchResult[]> {
    const registrations = sortHandlerRegistrations([
      ...(handlers.get(event.metadata.eventName) ?? []),
      ...(handlers.get("*") ?? []),
    ]);
    const results: EventDispatchResult[] = [];

    for (const registration of registrations) {
      try {
        await registration.handler(event);
        results.push({
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
          handlerToken: registration.token,
          status: "handled",
        });
      } catch (error) {
        results.push({
          error,
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
          handlerToken: registration.token,
          status: "failed",
        });
      }

      if (registration.once) {
        unsubscribe(registration.token);
      }
    }

    return results;
  }

  return {
    dispatch,
    once: (eventName, handler, options) =>
      subscribe(eventName, handler, { ...options, once: true }),
    publish: dispatch,
    subscribe,
    unsubscribe,
  };
}

function sortHandlerRegistrations(
  registrations: readonly EventHandlerRegistration[],
): EventHandlerRegistration[] {
  return [...registrations].sort((left, right) =>
    right.priority - left.priority || left.token.localeCompare(right.token),
  );
}

function sortEventDefinitions(
  events: readonly PlatformEventDefinition[],
): readonly PlatformEventDefinition[] {
  return [...events].sort((left, right) =>
    left.name.localeCompare(right.name) || left.version - right.version,
  );
}

function dedupeEventDefinitions(
  events: readonly PlatformEventDefinition[],
): readonly PlatformEventDefinition[] {
  const byKey = new Map<string, PlatformEventDefinition>();

  for (const event of events) {
    byKey.set(`${event.name}:${event.version}`, event);
  }

  return [...byKey.values()];
}

function inferBuiltInEventSource(eventName: (typeof BUILT_IN_PLATFORM_EVENTS)[number]): EventSource {
  if (eventName.startsWith("Document")) {
    return "document-engine";
  }

  if (eventName.startsWith("Workflow")) {
    return "workflow";
  }

  if (eventName.startsWith("Approval")) {
    return "approval";
  }

  if (eventName.startsWith("Report")) {
    return "reporting";
  }

  if (eventName.startsWith("Print")) {
    return "printing";
  }

  if (eventName.endsWith("Completed") && (eventName.startsWith("Export") || eventName.startsWith("Import"))) {
    return "import-export";
  }

  if (eventName.startsWith("Automation")) {
    return "automation";
  }

  if (eventName.startsWith("AI")) {
    return "ai";
  }

  if (eventName.startsWith("BackgroundJob")) {
    return "background-job";
  }

  if (eventName.startsWith("Job")) {
    return "background-job";
  }

  if (eventName === "UserLoggedIn" || eventName === "SessionExpired") {
    return "auth";
  }

  if (eventName === "PermissionDenied") {
    return "security";
  }

  return "system";
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
