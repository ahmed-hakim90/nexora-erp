import type { AccessExperience, ActorType } from "@/core/context";
import type { BusinessProcessKey } from "@/platform/business-process/public-api";
import type { DocumentBehaviorDeclaration, DocumentHeader, PlatformDocument } from "@/platform/document/public-api";
import {
  createEventMetadata,
  createPlatformEvent,
  definePlatformEventName,
  type EventContext,
  type PlatformEventBus,
  type PlatformEventName,
} from "@/platform/events/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type WorkflowStatusKey = string & {
  readonly __brand: "WorkflowStatusKey";
};

export type WorkflowTransitionKey = string & {
  readonly __brand: "WorkflowTransitionKey";
};

export type WorkflowActionKey = string & {
  readonly __brand: "WorkflowActionKey";
};

export type WorkflowGuardKey = string & {
  readonly __brand: "WorkflowGuardKey";
};

export type WorkflowHookKey = string & {
  readonly __brand: "WorkflowHookKey";
};

export type WorkflowGuardResult =
  | { readonly allowed: true; readonly reason?: string }
  | { readonly allowed: false; readonly reason: string };

export type WorkflowValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type WorkflowState = Readonly<{
  key: WorkflowStatusKey;
  label: string;
  description?: string;
  isInitial?: boolean;
  isTerminal?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowStateDefinition = WorkflowState;

export type WorkflowGuardKind =
  | "permission"
  | "entitlement"
  | "data-scope"
  | "document-status"
  | "required-field"
  | "custom";

export type WorkflowExecutionContext = Readonly<{
  tenantId: string;
  correlationId: string;
  requestId?: string | null;
  principalId?: string | null;
  actorType?: ActorType | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  sourceEngine: "workflow";
  sourceApp?: string | null;
  sourceDocument?: Pick<DocumentHeader, "id" | "documentType" | "documentNumber" | "status"> | null;
  businessProcessKey?: BusinessProcessKey | null;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  entitlementKeys?: ReadonlySet<string>;
  dataScopeKeys?: ReadonlySet<string>;
  fieldValues?: Readonly<Record<string, unknown>>;
  eventBus?: PlatformEventBus;
  now?: string;
}>;

export type WorkflowGuard = Readonly<{
  key: WorkflowGuardKey;
  kind: WorkflowGuardKind;
  label: string;
  requiredPermission?: PermissionKey | string;
  entitlementKey?: string;
  dataScopeKey?: string;
  allowedDocumentStatuses?: readonly string[];
  requiredFields?: readonly string[];
  evaluate?: (context: WorkflowExecutionContext) => WorkflowGuardResult | Promise<WorkflowGuardResult>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowAction = Readonly<{
  key: WorkflowActionKey;
  label: string;
  description?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowHook = Readonly<{
  key: WorkflowHookKey;
  label: string;
  timing: "before" | "after";
  run?: (context: WorkflowExecutionContext) => void | Promise<void>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowTransition = Readonly<{
  key: WorkflowTransitionKey;
  from: WorkflowStatusKey;
  to: WorkflowStatusKey;
  actionKey: WorkflowActionKey;
  label: string;
  requiredPermission?: PermissionKey | string;
  guards?: readonly WorkflowGuard[];
  hooks?: readonly WorkflowHook[];
  guardKeys?: readonly string[];
  hookKeys?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowTransitionDefinition = WorkflowTransition;

export type WorkflowDefinition = Readonly<{
  key: string;
  moduleKey: string;
  entityType: string;
  label?: string;
  version?: number;
  states: readonly WorkflowStateDefinition[];
  transitions: readonly WorkflowTransitionDefinition[];
  actions?: readonly WorkflowAction[];
  guards?: readonly WorkflowGuard[];
  hooks?: readonly WorkflowHook[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowInstance = Readonly<{
  id: string;
  workflowKey: string;
  entityType: string;
  entityId: string;
  status: WorkflowStatusKey;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  startedAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  history: readonly WorkflowHistoryEntry[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowHistoryEntry = Readonly<{
  id: string;
  workflowInstanceId: string;
  workflowKey: string;
  transitionKey: WorkflowTransitionKey;
  actionKey: WorkflowActionKey;
  from: WorkflowStatusKey;
  to: WorkflowStatusKey;
  occurredAt: string;
  principalId?: string | null;
  correlationId: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowTransitionCommand = Readonly<{
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  workflowKey: string;
  transitionKey: WorkflowTransitionKey;
  currentStatus: WorkflowStatusKey;
  metadata?: Record<string, unknown>;
}>;

export type WorkflowTransitionResult = Readonly<{
  from: WorkflowStatusKey;
  to: WorkflowStatusKey;
  transitionKey: WorkflowTransitionKey;
}>;

export type WorkflowExecutionResult = Readonly<{
  allowed: boolean;
  reason?: string;
  instance: WorkflowInstance;
  transition?: WorkflowTransitionResult;
  historyEntry?: WorkflowHistoryEntry;
  publishedEvents: readonly PlatformEventName[];
}>;

export type DocumentWorkflowAdapter = Readonly<{
  workflowEnabled: boolean;
  workflowKey: string;
  entityType: string;
  entityId: string;
  currentStatus: WorkflowStatusKey;
}>;

export const WORKFLOW_PLATFORM_EVENTS = {
  cancelled: definePlatformEventName("WorkflowCancelled"),
  completed: definePlatformEventName("WorkflowCompleted"),
  denied: definePlatformEventName("WorkflowTransitionDenied"),
  requested: definePlatformEventName("WorkflowTransitionRequested"),
  started: definePlatformEventName("WorkflowStarted"),
  transitionCompleted: definePlatformEventName("WorkflowTransitionCompleted"),
} as const;

export function defineWorkflowStatus(value: string): WorkflowStatusKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Workflow status keys must be lowercase dot or dash separated identifiers.");
  }

  return value as WorkflowStatusKey;
}

export function defineWorkflowTransition(value: string): WorkflowTransitionKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Workflow transition keys must be lowercase dot or dash separated identifiers.");
  }

  return value as WorkflowTransitionKey;
}

export function defineWorkflowAction(value: string): WorkflowActionKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Workflow action keys must be lowercase dot or dash separated identifiers.");
  }

  return value as WorkflowActionKey;
}

export function defineWorkflowGuardKey(value: string): WorkflowGuardKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Workflow guard keys must be lowercase dot or dash separated identifiers.");
  }

  return value as WorkflowGuardKey;
}

export function defineWorkflowHookKey(value: string): WorkflowHookKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Workflow hook keys must be lowercase dot or dash separated identifiers.");
  }

  return value as WorkflowHookKey;
}

export function defineWorkflow<TDefinition extends WorkflowDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateWorkflow(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validateWorkflow(definition: WorkflowDefinition): WorkflowValidationResult {
  const errors: string[] = [];
  const stateKeys = new Set(definition.states.map((state) => state.key));
  const initialStates = definition.states.filter((state) => state.isInitial);

  if (!definition.key.trim()) {
    errors.push("Workflow key is required.");
  }

  if (definition.states.length === 0) {
    errors.push("At least one workflow state is required.");
  }

  if (initialStates.length !== 1) {
    errors.push("Workflow must define exactly one initial state.");
  }

  for (const duplicate of findDuplicates(definition.states.map((state) => state.key))) {
    errors.push(`Duplicate workflow state: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(definition.transitions.map((transition) => transition.key))) {
    errors.push(`Duplicate workflow transition: ${duplicate}`);
  }

  for (const transition of definition.transitions) {
    if (!stateKeys.has(transition.from)) {
      errors.push(`Transition ${transition.key} references unknown from state: ${transition.from}`);
    }

    if (!stateKeys.has(transition.to)) {
      errors.push(`Transition ${transition.key} references unknown to state: ${transition.to}`);
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createWorkflowInstance(
  definition: WorkflowDefinition,
  input: Readonly<{
    id: string;
    entityId: string;
    tenantId: string;
    companyId?: string | null;
    branchId?: string | null;
    startedAt: string;
    metadata?: Readonly<Record<string, unknown>>;
  }>,
): WorkflowInstance {
  const validation = validateWorkflow(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const initialState = definition.states.find((state) => state.isInitial);

  if (!initialState) {
    throw new Error("Workflow initial state is required.");
  }

  return {
    branchId: input.branchId,
    cancelledAt: null,
    companyId: input.companyId,
    completedAt: null,
    entityId: input.entityId,
    entityType: definition.entityType,
    history: [],
    id: input.id,
    metadata: input.metadata,
    startedAt: input.startedAt,
    status: initialState.key,
    tenantId: input.tenantId,
    workflowKey: definition.key,
  };
}

export async function canExecuteTransition(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  transitionKey: WorkflowTransitionKey,
  context: WorkflowExecutionContext,
): Promise<WorkflowGuardResult> {
  const transition = getExecutableTransition(definition, instance, transitionKey);

  if (!transition) {
    return {
      allowed: false,
      reason: "Workflow transition is not available from the current state.",
    };
  }

  if (transition.requiredPermission && !context.grantedPermissions?.has(transition.requiredPermission)) {
    return {
      allowed: false,
      reason: "Required workflow permission is missing.",
    };
  }

  const guardResult = await evaluateWorkflowGuards([
    ...(transition.guards ?? []),
    ...resolveWorkflowReferences(transition.guardKeys, definition.guards),
  ], context);

  if (!guardResult.allowed) {
    return guardResult;
  }

  return { allowed: true };
}

export async function executeTransition(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  transitionKey: WorkflowTransitionKey,
  context: WorkflowExecutionContext,
): Promise<WorkflowExecutionResult> {
  const transition = getExecutableTransition(definition, instance, transitionKey);
  const publishedEvents: PlatformEventName[] = [];

  await publishWorkflowEvent(WORKFLOW_PLATFORM_EVENTS.requested, definition, instance, context, transition ?? undefined);
  publishedEvents.push(WORKFLOW_PLATFORM_EVENTS.requested);

  if (!transition) {
    await publishWorkflowEvent(WORKFLOW_PLATFORM_EVENTS.denied, definition, instance, context, undefined, "Transition unavailable.");
    publishedEvents.push(WORKFLOW_PLATFORM_EVENTS.denied);

    return {
      allowed: false,
      instance,
      publishedEvents,
      reason: "Workflow transition is not available from the current state.",
    };
  }

  const allowed = await canExecuteTransition(definition, instance, transitionKey, context);

  if (!allowed.allowed) {
    await publishWorkflowEvent(WORKFLOW_PLATFORM_EVENTS.denied, definition, instance, context, transition, allowed.reason);
    publishedEvents.push(WORKFLOW_PLATFORM_EVENTS.denied);

    return {
      allowed: false,
      instance,
      publishedEvents,
      reason: allowed.reason,
    };
  }

  await runWorkflowHooks("before", transition, definition, context);

  const historyEntry = recordWorkflowHistory({
    actionKey: transition.actionKey,
    correlationId: context.correlationId,
    from: transition.from,
    metadata: transition.metadata,
    occurredAt: context.now ?? new Date().toISOString(),
    principalId: context.principalId,
    to: transition.to,
    transitionKey: transition.key,
    workflowInstanceId: instance.id,
    workflowKey: definition.key,
  });
  const nextState = definition.states.find((state) => state.key === transition.to);
  const nextInstance: WorkflowInstance = {
    ...instance,
    cancelledAt: transition.actionKey === "cancel" ? historyEntry.occurredAt : instance.cancelledAt,
    completedAt: nextState?.isTerminal ? historyEntry.occurredAt : instance.completedAt,
    history: [...instance.history, historyEntry],
    status: transition.to,
  };

  await runWorkflowHooks("after", transition, definition, context);
  await publishWorkflowEvent(WORKFLOW_PLATFORM_EVENTS.transitionCompleted, definition, nextInstance, context, transition);
  publishedEvents.push(WORKFLOW_PLATFORM_EVENTS.transitionCompleted);

  if (nextState?.isTerminal) {
    const terminalEvent = transition.actionKey === "cancel"
      ? WORKFLOW_PLATFORM_EVENTS.cancelled
      : WORKFLOW_PLATFORM_EVENTS.completed;
    await publishWorkflowEvent(terminalEvent, definition, nextInstance, context, transition);
    publishedEvents.push(terminalEvent);
  }

  if (instance.history.length === 0) {
    await publishWorkflowEvent(WORKFLOW_PLATFORM_EVENTS.started, definition, nextInstance, context, transition);
    publishedEvents.push(WORKFLOW_PLATFORM_EVENTS.started);
  }

  return {
    allowed: true,
    historyEntry,
    instance: nextInstance,
    publishedEvents,
    transition: {
      from: transition.from,
      to: transition.to,
      transitionKey: transition.key,
    },
  };
}

export function recordWorkflowHistory(
  entry: Omit<WorkflowHistoryEntry, "id"> & Readonly<{ id?: string }>,
): WorkflowHistoryEntry {
  return {
    ...entry,
    id: entry.id ?? `${entry.workflowInstanceId}:${entry.transitionKey}:${entry.occurredAt}`,
  };
}

export function createDocumentWorkflowAdapter(
  document: PlatformDocument,
  workflowKey: string,
  behaviors: readonly DocumentBehaviorDeclaration[] = [],
): DocumentWorkflowAdapter {
  return {
    currentStatus: defineWorkflowStatus(String(document.header.status)),
    entityId: document.header.id,
    entityType: String(document.header.documentType),
    workflowEnabled: behaviors.some((behavior) => behavior.behavior === "workflow" && behavior.enabled),
    workflowKey,
  };
}

export function createWorkflowExecutionContext(
  input: Omit<WorkflowExecutionContext, "sourceEngine"> & Partial<Pick<WorkflowExecutionContext, "sourceEngine">>,
): WorkflowExecutionContext {
  return {
    ...input,
    sourceEngine: "workflow",
  };
}

async function evaluateWorkflowGuards(
  guards: readonly WorkflowGuard[],
  context: WorkflowExecutionContext,
): Promise<WorkflowGuardResult> {
  for (const guard of guards) {
    const result = await evaluateWorkflowGuard(guard, context);

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

async function evaluateWorkflowGuard(
  guard: WorkflowGuard,
  context: WorkflowExecutionContext,
): Promise<WorkflowGuardResult> {
  if (guard.evaluate) {
    return guard.evaluate(context);
  }

  switch (guard.kind) {
    case "permission":
      return guard.requiredPermission && context.grantedPermissions?.has(guard.requiredPermission)
        ? { allowed: true }
        : { allowed: false, reason: `Workflow guard ${guard.key} denied missing permission.` };
    case "entitlement":
      return guard.entitlementKey && context.entitlementKeys?.has(guard.entitlementKey)
        ? { allowed: true }
        : { allowed: false, reason: `Workflow guard ${guard.key} denied missing entitlement.` };
    case "data-scope":
      return guard.dataScopeKey && context.dataScopeKeys?.has(guard.dataScopeKey)
        ? { allowed: true }
        : { allowed: false, reason: `Workflow guard ${guard.key} denied insufficient data scope.` };
    case "document-status":
      return context.sourceDocument?.status && guard.allowedDocumentStatuses?.includes(String(context.sourceDocument.status))
        ? { allowed: true }
        : { allowed: false, reason: `Workflow guard ${guard.key} denied document status.` };
    case "required-field":
      return hasRequiredFields(context.fieldValues, guard.requiredFields)
        ? { allowed: true }
        : { allowed: false, reason: `Workflow guard ${guard.key} denied missing required fields.` };
    case "custom":
      return { allowed: false, reason: `Workflow guard ${guard.key} has no evaluator.` };
  }
}

async function runWorkflowHooks(
  timing: WorkflowHook["timing"],
  transition: WorkflowTransition,
  definition: WorkflowDefinition,
  context: WorkflowExecutionContext,
): Promise<void> {
  const hooks = [
    ...(transition.hooks ?? []),
    ...resolveWorkflowReferences(transition.hookKeys, definition.hooks),
  ].filter((hook) => hook.timing === timing);

  for (const hook of hooks) {
    await hook.run?.(context);
  }
}

async function publishWorkflowEvent(
  eventName: PlatformEventName,
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  context: WorkflowExecutionContext,
  transition?: WorkflowTransition,
  reason?: string,
): Promise<void> {
  if (!context.eventBus) {
    return;
  }

  const eventContext: EventContext = {
    actorType: context.actorType,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    experience: context.experience,
    principalId: context.principalId,
    requestId: context.requestId,
    sourceApp: context.sourceApp,
    sourceEngine: "workflow",
    tenantId: context.tenantId,
  };

  await context.eventBus.publish(createPlatformEvent({
    metadata: createEventMetadata({
      category: "workflow",
      context: eventContext,
      eventId: crypto.randomUUID(),
      eventName,
      eventVersion: 1,
      kind: "domain",
      priority: "normal",
      source: "workflow",
      sourceApp: context.sourceApp,
      timestamp: context.now,
    }),
    payload: {
      entityId: instance.entityId,
      entityType: instance.entityType,
      from: transition?.from,
      reason,
      status: instance.status,
      to: transition?.to,
      transitionKey: transition?.key,
      workflowInstanceId: instance.id,
      workflowKey: definition.key,
    },
  }));
}

function getExecutableTransition(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  transitionKey: WorkflowTransitionKey,
): WorkflowTransition | null {
  const currentState = definition.states.find((state) => state.key === instance.status);

  if (currentState?.isTerminal) {
    return null;
  }

  return definition.transitions.find(
    (transition) => transition.key === transitionKey && transition.from === instance.status,
  ) ?? null;
}

function resolveWorkflowReferences<TItem extends Readonly<{ key: string }>>(
  keys: readonly string[] | undefined,
  items: readonly TItem[] | undefined,
): readonly TItem[] {
  return (keys ?? [])
    .map((key) => items?.find((item) => item.key === key))
    .filter((item): item is TItem => Boolean(item));
}

function hasRequiredFields(
  values: Readonly<Record<string, unknown>> | undefined,
  fields: readonly string[] | undefined,
): boolean {
  if (!fields || fields.length === 0) {
    return true;
  }

  if (!values) {
    return false;
  }

  return fields.every((field) => {
    const value = values[field];

    return value !== undefined && value !== null && value !== "";
  });
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}
