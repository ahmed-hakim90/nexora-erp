import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction, AuditEvent } from "@/platform/audit/public-api";
import type { BusinessProcessKey } from "@/platform/business-process/public-api";
import type { DocumentHeader } from "@/platform/document/public-api";
import {
  createEventMetadata,
  createPlatformEvent,
  definePlatformEventName,
  type EventContext,
  type PlatformEventBus,
  type PlatformEventName,
} from "@/platform/events/public-api";

export type ApprovalDecision =
  | "approve"
  | "reject"
  | "return"
  | "return-for-correction"
  | "cancel"
  | "skip";

export type ApprovalStatus =
  | "requested"
  | "assigned"
  | "in-progress"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "completed";

export type ApprovalMode = "single" | "multiple" | "any" | "all" | "sequential" | "parallel" | "conditional";

export type ApprovalAssignmentTargetType =
  | "user"
  | "role"
  | "department"
  | "team"
  | "dynamic-resolver";

export type ApprovalParticipant = Readonly<{
  type: ApprovalAssignmentTargetType;
  id: string;
  label?: string;
  delegatedFromId?: string | null;
}>;

export type ApprovalActor = Readonly<{
  userId: string;
  delegatedFromUserId?: string;
  participant?: ApprovalParticipant;
}>;

export type ApprovalAssignment = Readonly<{
  key: string;
  stepKey: string;
  participant: ApprovalParticipant;
  status: "pending" | "accepted" | "decided" | "cancelled" | "skipped";
  assignedAt: string;
  dueAt?: string | null;
}>;

export type ApprovalCondition = Readonly<{
  key: string;
  field: string;
  operator: "exists" | "equals" | "not-equals" | "gt" | "gte" | "lt" | "lte";
  value?: unknown;
}>;

export type ApprovalStep = Readonly<{
  key: string;
  order: number;
  mode: ApprovalMode;
  label?: string;
  participants: readonly ApprovalParticipant[];
  requiredApproverRoleKeys?: readonly string[];
  requiredApproverUserIds?: readonly string[];
  allowSelfApproval?: boolean;
  allowSkip?: boolean;
  escalationAfterMinutes?: number;
  conditions?: readonly ApprovalCondition[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ApprovalStepDefinition = ApprovalStep;

export type ApprovalStage = Readonly<{
  key: string;
  order: number;
  label: string;
  mode: Extract<ApprovalMode, "sequential" | "parallel" | "conditional">;
  steps: readonly ApprovalStep[];
  conditions?: readonly ApprovalCondition[];
}>;

export type ApprovalPolicy = Readonly<{
  key: string;
  moduleKey: string;
  entityType: string;
  mode: ApprovalMode;
  steps: readonly ApprovalStep[];
  stages?: readonly ApprovalStage[];
  allowCancellation: boolean;
  allowSkip: boolean;
  requireReasonOnReject?: boolean;
  requireReasonOnReturn?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ApprovalPolicyDefinition = ApprovalPolicy;

export type ApprovalDefinition = Readonly<{
  key: string;
  label: string;
  description?: string;
  policy: ApprovalPolicy;
  version: number;
  isActive: boolean;
}>;

export type ApprovalRequest = Readonly<{
  id: string;
  definitionKey: string;
  policyKey: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  moduleKey: string;
  requestedByUserId: string;
  requestedAt: string;
  status: ApprovalStatus;
  currentStepKey?: string | null;
  assignments: readonly ApprovalAssignment[];
  history: readonly ApprovalHistory[];
  document?: Pick<DocumentHeader, "id" | "documentType" | "documentNumber" | "status"> | null;
  businessProcessKey?: BusinessProcessKey | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ApprovalSnapshot = Readonly<{
  policyKey: string;
  requestedByUserId: string;
  entityId: string;
  entityType: string;
  moduleKey: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}>;

export type ApprovalContext = Readonly<{
  tenantId: string;
  correlationId: string;
  requestId?: string | null;
  principalId?: string | null;
  actorType?: ActorType | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  sourceApp?: string | null;
  fieldValues?: Readonly<Record<string, unknown>>;
  eventBus?: PlatformEventBus;
  now?: string;
}>;

export type ApprovalDecisionCommand = Readonly<{
  tenantId: string;
  approvalInstanceId: string;
  stepKey: string;
  decision: ApprovalDecision;
  actor: ApprovalActor;
  requestedByUserId: string;
  reason?: string;
}>;

export type ApprovalHistory = Readonly<{
  id: string;
  approvalRequestId: string;
  stepKey: string;
  decision: ApprovalDecision;
  actor: ApprovalActor;
  decidedAt: string;
  reason?: string | null;
  auditEvent?: Pick<AuditEvent, "id" | "action" | "category" | "timestamp" | "correlationId">;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ApprovalResult = Readonly<{
  allowed: boolean;
  request: ApprovalRequest;
  decision?: ApprovalDecision;
  historyEntry?: ApprovalHistory;
  status: ApprovalStatus;
  reason?: string;
  publishedEvents: readonly PlatformEventName[];
}>;

export type ApprovalValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export const APPROVAL_PLATFORM_EVENTS = {
  assigned: definePlatformEventName("ApprovalAssigned"),
  cancelled: definePlatformEventName("ApprovalCancelled"),
  completed: definePlatformEventName("ApprovalCompleted"),
  granted: definePlatformEventName("ApprovalGranted"),
  rejected: definePlatformEventName("ApprovalRejected"),
  requested: definePlatformEventName("ApprovalRequested"),
  returned: definePlatformEventName("ApprovalReturned"),
} as const;

export function defineApproval<TDefinition extends ApprovalDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateApprovalPolicy(definition.policy);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function defineApprovalPolicy<TPolicy extends ApprovalPolicy>(
  policy: TPolicy,
): TPolicy {
  const validation = validateApprovalPolicy(policy);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return policy;
}

export function validateApprovalPolicy(policy: ApprovalPolicy): ApprovalValidationResult {
  const errors: string[] = [];

  if (!policy.key.trim()) {
    errors.push("Approval policy key is required.");
  }

  if (policy.steps.length === 0) {
    errors.push("Approval policy must contain at least one step.");
  }

  for (const duplicate of findDuplicates(policy.steps.map((step) => step.key))) {
    errors.push(`Duplicate approval step: ${duplicate}`);
  }

  for (const step of policy.steps) {
    const hasLegacyParticipants = (step.requiredApproverRoleKeys?.length ?? 0) > 0
      || (step.requiredApproverUserIds?.length ?? 0) > 0;

    if (step.participants.length === 0 && !hasLegacyParticipants) {
      errors.push(`Approval step ${step.key} must declare at least one participant.`);
    }

    if (step.mode === "single" && step.participants.length > 1) {
      errors.push(`Approval step ${step.key} single mode cannot declare multiple participants.`);
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createApprovalRequest(
  definition: ApprovalDefinition,
  input: Readonly<{
    id: string;
    tenantId: string;
    entityId: string;
    requestedByUserId: string;
    requestedAt: string;
    document?: ApprovalRequest["document"];
    businessProcessKey?: BusinessProcessKey | null;
    metadata?: Readonly<Record<string, unknown>>;
  }>,
): ApprovalRequest {
  const firstStep = [...definition.policy.steps].sort((left, right) => left.order - right.order)[0];

  return {
    assignments: [],
    businessProcessKey: input.businessProcessKey,
    currentStepKey: firstStep?.key ?? null,
    definitionKey: definition.key,
    document: input.document,
    entityId: input.entityId,
    entityType: definition.policy.entityType,
    history: [],
    id: input.id,
    metadata: input.metadata,
    moduleKey: definition.policy.moduleKey,
    policyKey: definition.policy.key,
    requestedAt: input.requestedAt,
    requestedByUserId: input.requestedByUserId,
    status: "requested",
    tenantId: input.tenantId,
  };
}

export function assignApprovalStep(
  request: ApprovalRequest,
  step: ApprovalStep,
  assignedAt: string,
): ApprovalRequest {
  const assignments = step.participants.map((participant) => ({
    assignedAt,
    key: `${request.id}:${step.key}:${participant.type}:${participant.id}`,
    participant,
    status: "pending" as const,
    stepKey: step.key,
  }));

  return {
    ...request,
    assignments: [...request.assignments, ...assignments],
    currentStepKey: step.key,
    status: "assigned",
  };
}

export async function requestApproval(
  definition: ApprovalDefinition,
  input: Parameters<typeof createApprovalRequest>[1],
  context: ApprovalContext,
): Promise<ApprovalResult> {
  let request = createApprovalRequest(definition, input);
  const firstStep = [...definition.policy.steps].sort((left, right) => left.order - right.order)[0];
  const publishedEvents: PlatformEventName[] = [];

  await publishApprovalEvent(APPROVAL_PLATFORM_EVENTS.requested, request, context);
  publishedEvents.push(APPROVAL_PLATFORM_EVENTS.requested);

  if (firstStep) {
    request = assignApprovalStep(request, firstStep, context.now ?? input.requestedAt);
    await publishApprovalEvent(APPROVAL_PLATFORM_EVENTS.assigned, request, context, { stepKey: firstStep.key });
    publishedEvents.push(APPROVAL_PLATFORM_EVENTS.assigned);
  }

  return {
    allowed: true,
    publishedEvents,
    request,
    status: request.status,
  };
}

export async function decideApproval(
  definition: ApprovalDefinition,
  request: ApprovalRequest,
  command: ApprovalDecisionCommand,
  context: ApprovalContext,
): Promise<ApprovalResult> {
  const validation = validateApprovalDecision(definition.policy, request, command);
  const publishedEvents: PlatformEventName[] = [];

  if (!validation.valid) {
    return {
      allowed: false,
      publishedEvents,
      reason: validation.errors[0] ?? "Approval decision denied.",
      request,
      status: request.status,
    };
  }

  const normalizedDecision = normalizeApprovalDecision(command.decision);
  const decidedAt = context.now ?? new Date().toISOString();
  const historyEntry = recordApprovalHistory({
    actor: command.actor,
    approvalRequestId: request.id,
    auditEvent: createApprovalAuditLink(request, command, context),
    decidedAt,
    decision: normalizedDecision,
    reason: command.reason ?? null,
    stepKey: command.stepKey,
  });
  const nextStatus = getNextApprovalStatus(definition.policy, request, normalizedDecision);
  const nextRequest: ApprovalRequest = {
    ...request,
    history: [...request.history, historyEntry],
    status: nextStatus,
  };
  const eventName = approvalDecisionEvent(normalizedDecision, nextStatus);

  await publishApprovalEvent(eventName, nextRequest, context, {
    decision: normalizedDecision,
    stepKey: command.stepKey,
  });
  publishedEvents.push(eventName);

  if (nextStatus === "completed") {
    await publishApprovalEvent(APPROVAL_PLATFORM_EVENTS.completed, nextRequest, context);
    publishedEvents.push(APPROVAL_PLATFORM_EVENTS.completed);
  }

  return {
    allowed: true,
    decision: normalizedDecision,
    historyEntry,
    publishedEvents,
    request: nextRequest,
    status: nextStatus,
  };
}

export function validateApprovalDecision(
  policy: ApprovalPolicy,
  request: ApprovalRequest,
  command: ApprovalDecisionCommand,
): ApprovalValidationResult {
  const errors: string[] = [];
  const step = policy.steps.find((candidate) => candidate.key === command.stepKey);

  if (command.tenantId !== request.tenantId) {
    errors.push("Approval decision tenant does not match approval request.");
  }

  if (!step) {
    errors.push("Approval step is not defined.");
  }

  if (step && step.allowSelfApproval !== true && command.actor.userId === command.requestedByUserId) {
    errors.push("Self-approval is not allowed for this approval step.");
  }

  if (command.decision === "skip" && !(step?.allowSkip && policy.allowSkip)) {
    errors.push("Skip decision is not allowed by this approval policy.");
  }

  if ((command.decision === "reject" && policy.requireReasonOnReject) && !command.reason?.trim()) {
    errors.push("Reject decision requires a reason.");
  }

  if ((command.decision === "return" || command.decision === "return-for-correction") && policy.requireReasonOnReturn && !command.reason?.trim()) {
    errors.push("Return decision requires a reason.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function recordApprovalHistory(
  entry: Omit<ApprovalHistory, "id"> & Readonly<{ id?: string }>,
): ApprovalHistory {
  return {
    ...entry,
    id: entry.id ?? `${entry.approvalRequestId}:${entry.stepKey}:${entry.decision}:${entry.decidedAt}`,
  };
}

export function createApprovalAuditLink(
  request: ApprovalRequest,
  command: ApprovalDecisionCommand,
  context: ApprovalContext,
): Pick<AuditEvent, "id" | "action" | "category" | "timestamp" | "correlationId"> {
  return {
    action: `approval.${normalizeApprovalDecision(command.decision)}` as AuditAction,
    category: "approval",
    correlationId: context.correlationId,
    id: `${request.id}:${command.stepKey}:${normalizeApprovalDecision(command.decision)}`,
    timestamp: context.now ?? new Date().toISOString(),
  };
}

export function normalizeApprovalDecision(decision: ApprovalDecision): ApprovalDecision {
  return decision === "return-for-correction" ? "return" : decision;
}

async function publishApprovalEvent(
  eventName: PlatformEventName,
  request: ApprovalRequest,
  context: ApprovalContext,
  metadata: Readonly<Record<string, unknown>> = {},
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
    sourceEngine: "approval",
    tenantId: context.tenantId,
  };

  await context.eventBus.publish(createPlatformEvent({
    metadata: createEventMetadata({
      category: "approval",
      context: eventContext,
      eventId: crypto.randomUUID(),
      eventName,
      eventVersion: 1,
      kind: "domain",
      priority: "normal",
      source: "approval",
      sourceApp: context.sourceApp,
      timestamp: context.now,
    }),
    payload: {
      approvalRequestId: request.id,
      definitionKey: request.definitionKey,
      entityId: request.entityId,
      entityType: request.entityType,
      policyKey: request.policyKey,
      status: request.status,
      ...metadata,
    },
  }));
}

function getNextApprovalStatus(
  policy: ApprovalPolicy,
  request: ApprovalRequest,
  decision: ApprovalDecision,
): ApprovalStatus {
  if (decision === "reject") {
    return "rejected";
  }

  if (decision === "return" || decision === "return-for-correction") {
    return "returned";
  }

  if (decision === "cancel") {
    return policy.allowCancellation ? "cancelled" : request.status;
  }

  if (decision === "skip") {
    return policy.allowSkip ? "completed" : request.status;
  }

  if (decision === "approve") {
    return "completed";
  }

  return request.status;
}

function approvalDecisionEvent(
  decision: ApprovalDecision,
  status: ApprovalStatus,
): PlatformEventName {
  if (status === "cancelled") {
    return APPROVAL_PLATFORM_EVENTS.cancelled;
  }

  switch (decision) {
    case "approve":
      return APPROVAL_PLATFORM_EVENTS.granted;
    case "reject":
      return APPROVAL_PLATFORM_EVENTS.rejected;
    case "return":
    case "return-for-correction":
      return APPROVAL_PLATFORM_EVENTS.returned;
    case "cancel":
      return APPROVAL_PLATFORM_EVENTS.cancelled;
    case "skip":
      return APPROVAL_PLATFORM_EVENTS.completed;
  }
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
