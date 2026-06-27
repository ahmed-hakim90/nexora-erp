import assert from "node:assert/strict";
import test from "node:test";

import {
  NOTIFICATION_EVENT_MAPPINGS,
  applyNotificationPreferences,
  canTransitionNotificationDelivery,
  createEventMetadata,
  createNotificationAuditMetadata,
  createNotificationContextFromEvent,
  createNotificationDelivery,
  createNotificationFeedbackBridge,
  createNotificationTelemetryMetadata,
  createPlatformEvent,
  defineNotification,
  defineNotificationTemplate,
  definePlatformEventName,
  mapPlatformEventToNotification,
  normalizeNotificationRecipients,
  transitionNotificationDelivery,
  validateNotificationDefinition,
  validateNotificationIntent,
  validateNotificationTemplate,
} from "@/platform/public-api";

const context = {
  actorType: "user" as const,
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:notification",
  experience: "erp" as const,
  principalId: "user-1",
  requestId: "request-1",
  sourceApp: "platform",
  sourceEngine: "approval" as const,
  tenantId: "tenant-1",
};

test("notification templates support future channels and validate variables", () => {
  const template = defineNotificationTemplate({
    bodyTemplate: "Approval {approvalId} is waiting.",
    channels: ["in-app", "email", "sms", "whatsapp", "push", "webhook"],
    key: "approval.requested",
    subject: "Approval {approvalId}",
    variables: ["approvalId"],
  });

  assert.deepEqual(validateNotificationTemplate(template), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateNotificationTemplate({
    bodyTemplate: "Hello",
    channels: [],
    key: "",
    variables: ["missing"],
  }), {
    errors: [
      "Notification template key is required.",
      "Notification template must support at least one channel.",
      "Notification template variable is not used: missing",
    ],
    valid: false,
  });
});

test("notification definitions require channels, recipients, and templates", () => {
  const definition = defineNotification({
    channels: ["in-app"],
    durable: true,
    key: "approval.requested",
    name: "Approval requested",
    priority: "high",
    recipients: [{ id: "role-manager", type: "role" }],
    templateKey: "approval.requested",
  });

  assert.deepEqual(validateNotificationDefinition(definition), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateNotificationDefinition({
    channels: [],
    durable: true,
    key: "",
    name: "Invalid",
    priority: "normal",
    recipients: [],
    templateKey: "",
  }), {
    errors: [
      "Notification definition key is required.",
      "Notification definition template key is required.",
      "Notification definition requires at least one channel.",
      "Notification definition requires at least one recipient.",
    ],
    valid: false,
  });
});

test("recipient contracts normalize legacy and structured recipients", () => {
  assert.deepEqual(normalizeNotificationRecipients({
    channel: "in-app",
    recipientRoleKey: "role-manager",
    recipientUserId: "user-1",
    recipients: [
      { id: "team-1", type: "team" },
      { id: "employee-1", type: "employee" },
      { id: "party-1", type: "party" },
      { id: "department-1", type: "department" },
      { id: "resolver-1", type: "dynamic-resolver" },
      { id: "team-1", type: "team" },
    ],
    templateKey: "approval.requested",
  }).map((recipient) => `${recipient.type}:${recipient.id}`), [
    "team:team-1",
    "employee:employee-1",
    "party:party-1",
    "department:department-1",
    "dynamic-resolver:resolver-1",
    "user:user-1",
    "role:role-manager",
  ]);

  assert.deepEqual(validateNotificationIntent({
    channel: "in-app",
    templateKey: "",
  }), {
    errors: ["Notification intent requires recipient and template."],
    valid: false,
  });
});

test("delivery model supports pending, queued, sent, read, archived, failed, and cancelled transitions", () => {
  const delivery = createNotificationDelivery({
    channel: "in-app",
    context,
    id: "delivery-1",
    idempotencyKey: "idem-1",
    templateKey: "approval.requested",
  });

  assert.equal(delivery.status, "pending");
  assert.equal(canTransitionNotificationDelivery("pending", "queued"), true);
  assert.equal(canTransitionNotificationDelivery("sent", "failed"), false);

  const queued = transitionNotificationDelivery(delivery, "queued", "2026-06-27T08:00:00.000Z");
  const sent = transitionNotificationDelivery(queued, "sent", "2026-06-27T08:01:00.000Z");
  const read = transitionNotificationDelivery(sent, "read", "2026-06-27T08:02:00.000Z");
  const archived = transitionNotificationDelivery(read, "archived", "2026-06-27T08:03:00.000Z");

  assert.equal(archived.status, "archived");
  assert.equal(archived.queuedAt, "2026-06-27T08:00:00.000Z");
  assert.equal(archived.sentAt, "2026-06-27T08:01:00.000Z");
  assert.equal(archived.readAt, "2026-06-27T08:02:00.000Z");
  assert.equal(archived.archivedAt, "2026-06-27T08:03:00.000Z");
  assert.throws(() => transitionNotificationDelivery(archived, "queued", "2026-06-27T08:04:00.000Z"), /Cannot transition/);
});

test("preference model applies channel preferences, mutes, digest, priority, hours, language, and timezone", () => {
  const definition = defineNotification({
    channels: ["in-app", "email"],
    durable: true,
    eventName: definePlatformEventName("ApprovalRequested"),
    key: "approval.requested",
    name: "Approval requested",
    priority: "high",
    recipients: [{ id: "role-manager", type: "role" }],
    templateKey: "approval.requested",
  });

  assert.deepEqual(applyNotificationPreferences(definition, {
    channelPreferences: { email: false },
    digestRules: [{ channels: ["in-app"], frequency: "daily", key: "daily" }],
    language: "en",
    minimumPriority: "normal",
    ownerId: "user-1",
    ownerType: "user",
    timezone: "Asia/Riyadh",
    workingHours: { days: [0, 1, 2, 3, 4], endHour: 17, startHour: 9, timezone: "Asia/Riyadh" },
  })?.channels, ["in-app"]);

  assert.equal(applyNotificationPreferences(definition, {
    channelPreferences: {},
    mutedEventNames: [definePlatformEventName("ApprovalRequested")],
    ownerId: "user-1",
    ownerType: "user",
  }), null);
});

test("event-to-notification mapping creates durable definitions from platform events", () => {
  const event = createPlatformEvent({
    metadata: createEventMetadata({
      category: "approval",
      context,
      eventId: "event-1",
      eventName: definePlatformEventName("ApprovalRejected"),
      eventVersion: 1,
      kind: "domain",
      priority: "high",
      source: "approval",
    }),
    payload: { approvalRequestId: "approval-1" },
  });
  const notification = mapPlatformEventToNotification(event);

  assert.equal(NOTIFICATION_EVENT_MAPPINGS.some((mapping) => mapping.eventName === "ImportFailed"), true);
  assert.equal(notification?.key, "approval.rejected");
  assert.equal(notification?.durable, true);
  assert.equal(notification?.feedbackBridge?.severity, "error");
  assert.deepEqual(createNotificationContextFromEvent(event), {
    ...context,
    sourceEventId: "event-1",
    sourceEventName: "ApprovalRejected",
  });
});

test("feedback bridge is optional and never replaces durable notifications", () => {
  const definition = defineNotification({
    channels: ["in-app"],
    durable: true,
    feedbackBridge: {
      durableNotificationRequired: true,
      enabled: true,
      severity: "success",
    },
    key: "approval.granted",
    name: "Approval granted",
    priority: "normal",
    recipients: [{ id: "requester", type: "dynamic-resolver" }],
    templateKey: "approval.granted",
  });

  assert.deepEqual(createNotificationFeedbackBridge(definition), {
    durableNotificationRequired: true,
    enabled: true,
    severity: "success",
  });
});

test("audit and telemetry metadata preserve correlation, actor, tenant, source event, and delivery status", () => {
  const delivery = createNotificationDelivery({
    channel: "in-app",
    context: {
      ...context,
      sourceEventId: "event-1",
      sourceEventName: definePlatformEventName("ApprovalGranted"),
    },
    id: "delivery-1",
    idempotencyKey: "idem-1",
    status: "sent",
    templateKey: "approval.granted",
  });

  assert.deepEqual(createNotificationAuditMetadata(delivery), {
    action: "notification.sent",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:notification",
    notificationDeliveryId: "delivery-1",
    principalId: "user-1",
    sourceApp: "platform",
    sourceEngine: "approval",
    sourceEventName: "ApprovalGranted",
    status: "sent",
    tenantId: "tenant-1",
  });
  assert.deepEqual(createNotificationTelemetryMetadata(delivery), {
    branchId: "branch-1",
    channel: "in-app",
    companyId: "company-1",
    correlationId: "request:notification",
    notificationDeliveryId: "delivery-1",
    requestId: "request-1",
    sourceKey: "ApprovalGranted",
    status: "sent",
    tenantId: "tenant-1",
  });
});
