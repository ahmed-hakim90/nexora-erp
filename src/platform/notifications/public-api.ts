import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import {
  definePlatformEventName,
  type EventSource,
  type PlatformEvent,
  type PlatformEventName,
} from "@/platform/events/public-api";
import type { TelemetryEvent } from "@/platform/observability/public-api";

export type NotificationChannel = "in-app" | "email" | "sms" | "whatsapp" | "push" | "webhook";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationStatus = "pending" | "queued" | "sent" | "failed" | "cancelled" | "read" | "archived";

export type NotificationRecipientType =
  | "user"
  | "role"
  | "team"
  | "department"
  | "employee"
  | "party"
  | "dynamic-resolver";

export type NotificationRecipient = Readonly<{
  type: NotificationRecipientType;
  id: string;
  label?: string;
  channelOverrides?: readonly NotificationChannel[];
}>;

export type NotificationContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  principalId?: string | null;
  actorType?: ActorType | null;
  sourceEventName?: PlatformEventName | null;
  sourceEventId?: string | null;
  sourceEngine: EventSource | "notification";
  sourceApp?: string | null;
  locale?: "ar" | "en";
  timezone?: string;
}>;

export type NotificationIntent = Readonly<{
  channel: NotificationChannel;
  recipientUserId?: string;
  recipientRoleKey?: string;
  recipientPermissionKey?: string;
  recipients?: readonly NotificationRecipient[];
  templateKey: string;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  priority?: NotificationPriority;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  context?: NotificationContext;
}>;

export type NotificationTemplate = Readonly<{
  key: string;
  channels: readonly NotificationChannel[];
  subject?: string;
  bodyTemplate: string;
  titleTemplate?: string;
  supportsBranding?: boolean;
  locale?: "ar" | "en";
  variables?: readonly string[];
}>;

export type NotificationTemplateDefinition = Omit<NotificationTemplate, "channels"> &
  Readonly<{
    channel?: NotificationChannel;
    channels?: readonly NotificationChannel[];
  }>;

export type NotificationDefinition = Readonly<{
  key: string;
  name: string;
  description?: string;
  templateKey: string;
  eventName?: PlatformEventName;
  channels: readonly NotificationChannel[];
  recipients: readonly NotificationRecipient[];
  priority: NotificationPriority;
  durable: boolean;
  feedbackBridge?: NotificationFeedbackBridge;
}>;

export type NotificationDelivery = Readonly<{
  id: string;
  templateKey: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempt: number;
  idempotencyKey: string;
  recipient?: NotificationRecipient;
  context?: NotificationContext;
  queuedAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
  errorMessage?: string | null;
}>;

export type NotificationPreference = Readonly<{
  ownerType: "user" | "tenant";
  ownerId: string;
  channelPreferences: Partial<Record<NotificationChannel, boolean>>;
  mutedNotificationKeys?: readonly string[];
  mutedEventNames?: readonly PlatformEventName[];
  digestRules?: readonly {
    key: string;
    channels: readonly NotificationChannel[];
    frequency: "hourly" | "daily" | "weekly";
  }[];
  minimumPriority?: NotificationPriority;
  workingHours?: Readonly<{
    timezone: string;
    startHour: number;
    endHour: number;
    days: readonly number[];
  }>;
  language?: "ar" | "en";
  timezone?: string;
}>;

export type NotificationEventMapping = Readonly<{
  eventName: PlatformEventName;
  notificationKey: string;
  templateKey: string;
  channels: readonly NotificationChannel[];
  recipients: readonly NotificationRecipient[];
  priority: NotificationPriority;
  feedbackBridge?: NotificationFeedbackBridge;
}>;

export type NotificationFeedbackBridge = Readonly<{
  enabled: boolean;
  severity: "success" | "error" | "warning" | "info" | "loading" | "progress";
  durableNotificationRequired: true;
}>;

export type NotificationValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export const NOTIFICATION_EVENT_MAPPINGS = [
  mapNotificationEvent("ApprovalRequested", "approval.requested", "approval.requested", "high"),
  mapNotificationEvent("ApprovalGranted", "approval.granted", "approval.granted", "normal", {
    enabled: true,
    durableNotificationRequired: true,
    severity: "success",
  }),
  mapNotificationEvent("ApprovalRejected", "approval.rejected", "approval.rejected", "high", {
    enabled: true,
    durableNotificationRequired: true,
    severity: "error",
  }),
  mapNotificationEvent("WorkflowTransitionCompleted", "workflow.transition-completed", "workflow.transition-completed", "normal"),
  mapNotificationEvent("DocumentSubmitted", "document.submitted", "document.submitted", "normal"),
  mapNotificationEvent("DocumentApproved", "document.approved", "document.approved", "normal"),
  mapNotificationEvent("DocumentCancelled", "document.cancelled", "document.cancelled", "high"),
  mapNotificationEvent("BackgroundJobCompleted", "background-job.completed", "background-job.completed", "normal"),
  mapNotificationEvent("ExportCompleted", "export.completed", "export.completed", "normal"),
  mapNotificationEvent("ImportFailed", "import.failed", "import.failed", "high", {
    enabled: true,
    durableNotificationRequired: true,
    severity: "error",
  }),
  mapNotificationEvent("PrintCompleted", "print.completed", "print.completed", "normal"),
] as const satisfies readonly NotificationEventMapping[];

export function defineNotificationTemplate<TTemplate extends NotificationTemplateDefinition>(
  template: TTemplate,
): TTemplate {
  const validation = validateNotificationTemplate(template);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return template;
}

export function defineNotification<TDefinition extends NotificationDefinition>(
  definition: TDefinition,
): TDefinition {
  const errors = validateNotificationDefinition(definition).errors;

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  return definition;
}

export function validateNotificationTemplate(
  template: NotificationTemplateDefinition,
): NotificationValidationResult {
  const errors: string[] = [];
  const channels = getTemplateChannels(template);

  if (!template.key.trim()) {
    errors.push("Notification template key is required.");
  }

  if (channels.length === 0) {
    errors.push("Notification template must support at least one channel.");
  }

  if (!template.bodyTemplate.trim()) {
    errors.push("Notification template body is required.");
  }

  for (const variable of template.variables ?? []) {
    if (!template.bodyTemplate.includes(`{${variable}}`) && !template.subject?.includes(`{${variable}}`)) {
      errors.push(`Notification template variable is not used: ${variable}`);
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function validateNotificationDefinition(
  definition: NotificationDefinition,
): NotificationValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Notification definition key is required.");
  }

  if (!definition.templateKey.trim()) {
    errors.push("Notification definition template key is required.");
  }

  if (definition.channels.length === 0) {
    errors.push("Notification definition requires at least one channel.");
  }

  if (definition.recipients.length === 0) {
    errors.push("Notification definition requires at least one recipient.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function validateNotificationIntent(intent: NotificationIntent): NotificationValidationResult {
  const recipients = normalizeNotificationRecipients(intent);
  const errors: string[] = [];

  if (recipients.length === 0) {
    errors.push("Notification intent requires recipient and template.");
  }

  if (!intent.templateKey.trim()) {
    errors.push("Notification intent requires recipient and template.");
  }

  return {
    errors: [...new Set(errors)],
    valid: errors.length === 0,
  };
}

export function normalizeNotificationRecipients(
  intent: NotificationIntent,
): readonly NotificationRecipient[] {
  const recipients = [...(intent.recipients ?? [])];

  if (intent.recipientUserId) {
    recipients.push({ id: intent.recipientUserId, type: "user" });
  }

  if (intent.recipientRoleKey) {
    recipients.push({ id: intent.recipientRoleKey, type: "role" });
  }

  if (intent.recipientPermissionKey) {
    recipients.push({ id: intent.recipientPermissionKey, type: "dynamic-resolver" });
  }

  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const key = `${recipient.type}:${recipient.id}`;
    if (!recipient.id || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function createNotificationDelivery(
  input: Omit<NotificationDelivery, "status" | "attempt"> &
    Partial<Pick<NotificationDelivery, "status" | "attempt">>,
): NotificationDelivery {
  return {
    ...input,
    attempt: input.attempt ?? 0,
    status: input.status ?? "pending",
  };
}

export function transitionNotificationDelivery(
  delivery: NotificationDelivery,
  status: NotificationStatus,
  at: string,
  errorMessage?: string,
): NotificationDelivery {
  if (!canTransitionNotificationDelivery(delivery.status, status)) {
    throw new Error(`Cannot transition notification delivery from ${delivery.status} to ${status}.`);
  }

  return {
    ...delivery,
    archivedAt: status === "archived" ? at : delivery.archivedAt,
    errorMessage: errorMessage ?? delivery.errorMessage,
    failedAt: status === "failed" ? at : delivery.failedAt,
    queuedAt: status === "queued" ? at : delivery.queuedAt,
    readAt: status === "read" ? at : delivery.readAt,
    sentAt: status === "sent" ? at : delivery.sentAt,
    status,
  };
}

export function canTransitionNotificationDelivery(
  from: NotificationStatus,
  to: NotificationStatus,
): boolean {
  const transitions: Record<NotificationStatus, readonly NotificationStatus[]> = {
    archived: [],
    cancelled: ["archived"],
    failed: ["queued", "archived"],
    pending: ["queued", "cancelled"],
    queued: ["sent", "failed", "cancelled"],
    read: ["archived"],
    sent: ["read", "archived"],
  };

  return transitions[from].includes(to);
}

export function applyNotificationPreferences(
  definition: NotificationDefinition,
  preference: NotificationPreference,
): NotificationDefinition | null {
  if (preference.mutedNotificationKeys?.includes(definition.key)) {
    return null;
  }

  if (definition.eventName && preference.mutedEventNames?.includes(definition.eventName)) {
    return null;
  }

  if (preference.minimumPriority && priorityRank(definition.priority) < priorityRank(preference.minimumPriority)) {
    return null;
  }

  const channels = definition.channels.filter((channel) => preference.channelPreferences[channel] !== false);

  if (channels.length === 0) {
    return null;
  }

  return {
    ...definition,
    channels,
  };
}

export function mapPlatformEventToNotification(
  event: PlatformEvent,
  mappings: readonly NotificationEventMapping[] = NOTIFICATION_EVENT_MAPPINGS,
): NotificationDefinition | null {
  const mapping = mappings.find((candidate) => candidate.eventName === event.metadata.eventName);

  if (!mapping) {
    return null;
  }

  return defineNotification({
    channels: mapping.channels,
    durable: true,
    eventName: mapping.eventName,
    feedbackBridge: mapping.feedbackBridge,
    key: mapping.notificationKey,
    name: mapping.notificationKey,
    priority: mapping.priority,
    recipients: mapping.recipients,
    templateKey: mapping.templateKey,
  });
}

export function createNotificationContextFromEvent(event: PlatformEvent): NotificationContext {
  return {
    actorType: event.metadata.context.actorType,
    branchId: event.metadata.context.branchId,
    companyId: event.metadata.context.companyId,
    correlationId: event.metadata.context.correlationId,
    experience: event.metadata.context.experience,
    principalId: event.metadata.context.principalId,
    requestId: event.metadata.context.requestId,
    sourceApp: event.metadata.context.sourceApp,
    sourceEngine: event.metadata.source,
    sourceEventId: event.metadata.eventId,
    sourceEventName: event.metadata.eventName,
    tenantId: event.metadata.context.tenantId,
  };
}

export function createNotificationFeedbackBridge(
  definition: NotificationDefinition,
): NotificationFeedbackBridge | null {
  return definition.feedbackBridge?.enabled ? definition.feedbackBridge : null;
}

export function createNotificationAuditMetadata(delivery: NotificationDelivery): Pick<
  NotificationContext,
  "correlationId" | "principalId" | "tenantId" | "companyId" | "branchId" | "sourceEventName" | "sourceEngine" | "sourceApp"
> & Readonly<{
  action: AuditAction;
  notificationDeliveryId: string;
  status: NotificationStatus;
}> {
  return {
    action: `notification.${delivery.status}` as AuditAction,
    branchId: delivery.context?.branchId,
    companyId: delivery.context?.companyId,
    correlationId: delivery.context?.correlationId ?? delivery.idempotencyKey,
    notificationDeliveryId: delivery.id,
    principalId: delivery.context?.principalId,
    sourceApp: delivery.context?.sourceApp,
    sourceEngine: delivery.context?.sourceEngine ?? "notification",
    sourceEventName: delivery.context?.sourceEventName,
    status: delivery.status,
    tenantId: delivery.context?.tenantId,
  };
}

export function createNotificationTelemetryMetadata(delivery: NotificationDelivery): Pick<
  TelemetryEvent,
  "correlationId" | "requestId" | "tenantId" | "companyId" | "branchId" | "sourceKey"
> & Readonly<{
  notificationDeliveryId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
}> {
  return {
    branchId: delivery.context?.branchId,
    channel: delivery.channel,
    companyId: delivery.context?.companyId,
    correlationId: delivery.context?.correlationId ?? delivery.idempotencyKey,
    notificationDeliveryId: delivery.id,
    requestId: delivery.context?.requestId,
    sourceKey: delivery.context?.sourceEventName ?? delivery.context?.sourceEngine,
    status: delivery.status,
    tenantId: delivery.context?.tenantId,
  };
}

function mapNotificationEvent(
  eventName: string,
  notificationKey: string,
  templateKey: string,
  priority: NotificationPriority,
  feedbackBridge?: NotificationFeedbackBridge,
): NotificationEventMapping {
  return {
    channels: ["in-app"],
    eventName: definePlatformEventName(eventName),
    feedbackBridge,
    notificationKey,
    priority,
    recipients: [{ id: "event-participants", type: "dynamic-resolver" }],
    templateKey,
  };
}

function getTemplateChannels(template: NotificationTemplateDefinition): readonly NotificationChannel[] {
  return template.channels ?? (template.channel ? [template.channel] : []);
}

function priorityRank(priority: NotificationPriority): number {
  return {
    critical: 4,
    high: 3,
    low: 1,
    normal: 2,
  }[priority];
}
