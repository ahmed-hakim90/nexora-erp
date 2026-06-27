import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_PLATFORM_EVENT_DEFINITIONS,
  BUILT_IN_PLATFORM_EVENTS,
  createBusinessProcess,
  createEventMetadata,
  createPlatformEvent,
  createPlatformEventBus,
  createPlatformEventRegistry,
  defineBusinessProcess,
  defineBusinessProcessKey,
  definePlatformEventDefinition,
  definePlatformEventName,
  deprecatePlatformEvent,
  discoverPlatformEvents,
  getPlatformEventDefinition,
  registerPlatformEvent,
  validatePlatformEventDefinition,
  type PlatformEvent,
  type PlatformEventDefinition,
} from "@/platform/public-api";

const eventName = definePlatformEventName("PlatformTestEvent");

const eventDefinition = definePlatformEventDefinition({
  category: "system",
  description: "Platform test event.",
  kind: "system",
  name: eventName,
  source: "system",
  version: 1,
});

function createTestEvent(
  overrides: Partial<PlatformEvent["metadata"]> = {},
): PlatformEvent<{ message: string }> {
  return createPlatformEvent({
    metadata: createEventMetadata({
      category: "system",
      context: {
        branchId: "branch-1",
        companyId: "company-1",
        correlationId: "request:123456",
        experience: "erp",
        principalId: "user-1",
        requestId: "request-1",
        sourceApp: "platform",
        sourceEngine: "system",
        tenantId: "tenant-1",
      },
      eventId: "event-1",
      eventName,
      eventVersion: 1,
      kind: "system",
      priority: "normal",
      source: "system",
      sourceApp: "platform",
      ...overrides,
    }),
    payload: {
      message: "hello",
    },
  });
}

test("event registration validates and discovers platform events", () => {
  let registry = createPlatformEventRegistry([]);

  registry = registerPlatformEvent(registry, eventDefinition);

  assert.deepEqual(registry.events, [eventDefinition]);
  assert.deepEqual(validatePlatformEventDefinition({
    ...eventDefinition,
    description: "",
    version: 0,
  }), {
    errors: [
      "Event versions must be positive integers.",
      "Event description is required.",
    ],
    valid: false,
  });
  assert.equal(getPlatformEventDefinition(registry, eventName)?.name, eventName);
  assert.deepEqual(discoverPlatformEvents(registry, { category: "system" }).map((event) => event.name), [
    eventName,
  ]);
});

test("event registry supports versioning and deprecation discovery", () => {
  const v2: PlatformEventDefinition = {
    ...eventDefinition,
    description: "Platform test event v2.",
    version: 2,
  };
  const registry = deprecatePlatformEvent(
    registerPlatformEvent(createPlatformEventRegistry([eventDefinition]), v2),
    eventName,
    1,
    "2026-06-27T06:00:00.000Z",
    eventName,
  );

  assert.equal(getPlatformEventDefinition(registry, eventName)?.version, 2);
  assert.deepEqual(discoverPlatformEvents(registry).map((event) => event.version), [2]);
  assert.deepEqual(discoverPlatformEvents(registry, { includeDeprecated: true }).map((event) => event.version), [
    1,
    2,
  ]);
});

test("built-in event registry includes required platform events", () => {
  const registry = createPlatformEventRegistry();

  assert.deepEqual(BUILT_IN_PLATFORM_EVENTS, [
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
  ]);
  assert.equal(BUILT_IN_PLATFORM_EVENT_DEFINITIONS.length, BUILT_IN_PLATFORM_EVENTS.length);
  assert.ok(registry.events.some((event) => event.name === "DocumentSubmitted"));
  assert.equal(getPlatformEventDefinition(registry, definePlatformEventName("PermissionDenied"))?.category, "security");
});

test("publish and subscribe support multiple subscribers and context propagation", async () => {
  const bus = createPlatformEventBus();
  const handled: string[] = [];

  bus.subscribe(eventName, (event) => {
    handled.push(`first:${event.metadata.context.correlationId}`);
  }, { token: "first" });
  bus.subscribe(eventName, (event) => {
    handled.push(`second:${event.metadata.context.tenantId}`);
  }, { token: "second" });

  const results = await bus.publish(createTestEvent());

  assert.deepEqual(handled, [
    "first:request:123456",
    "second:tenant-1",
  ]);
  assert.deepEqual(results.map((result) => result.status), ["handled", "handled"]);
});

test("handler priorities run higher priority handlers first", async () => {
  const bus = createPlatformEventBus();
  const order: string[] = [];

  bus.subscribe(eventName, () => {
    order.push("low");
  }, { priority: 1, token: "low" });
  bus.subscribe(eventName, () => {
    order.push("critical");
  }, { priority: 100, token: "critical" });
  bus.subscribe("*", () => {
    order.push("wildcard");
  }, { priority: 50, token: "wildcard" });

  await bus.dispatch(createTestEvent());

  assert.deepEqual(order, ["critical", "wildcard", "low"]);
});

test("event bus supports sync, async, once, and unsubscribe handlers", async () => {
  const bus = createPlatformEventBus();
  const calls: string[] = [];

  const sync = bus.subscribe(eventName, () => {
    calls.push("sync");
  }, { mode: "sync", token: "sync" });
  bus.once(eventName, async () => {
    await Promise.resolve();
    calls.push("async-once");
  }, { mode: "async", token: "async-once" });

  await bus.publish(createTestEvent());
  await bus.publish(createTestEvent({ eventId: "event-2" }));

  assert.deepEqual(calls, ["async-once", "sync", "sync"]);
  assert.equal(bus.unsubscribe(sync), true);
  await bus.publish(createTestEvent({ eventId: "event-3" }));
  assert.deepEqual(calls, ["async-once", "sync", "sync"]);
});

test("business process contracts prepare activity, assignment, reminder, task, escalation, and SLA foundations", () => {
  const processKey = defineBusinessProcessKey("platform.test-process");
  const definition = defineBusinessProcess({
    allowedStatuses: ["active", "completed", "cancelled"],
    description: "Test business process definition.",
    key: processKey,
    name: "Test Process",
    sourceEventNames: [eventName],
  });
  const process = createBusinessProcess({
    activities: [
      {
        key: "activity-1",
        processKey,
        sourceEventName: eventName,
        status: "open",
        title: "Review event",
      },
    ],
    assignments: [
      {
        assignedAt: "2026-06-27T06:00:00.000Z",
        assigneeId: "user-1",
        assigneeType: "user",
        key: "assignment-1",
        processKey,
        status: "assigned",
      },
    ],
    escalations: [
      {
        key: "escalation-1",
        processKey,
        status: "pending",
        targetKey: "assignment-1",
        targetType: "assignment",
        triggerAt: "2026-06-28T06:00:00.000Z",
      },
    ],
    key: processKey,
    name: definition.name,
    owner: {
      experience: "erp",
      tenantId: "tenant-1",
    },
    reminders: [
      {
        key: "reminder-1",
        processKey,
        remindAt: "2026-06-27T12:00:00.000Z",
        status: "scheduled",
        targetKey: "task-1",
        targetType: "task",
      },
    ],
    slas: [
      {
        dueAt: "2026-06-28T06:00:00.000Z",
        key: "sla-1",
        name: "Initial response",
        processKey,
        status: "running",
      },
    ],
    sourceEventName: eventName,
    status: "active",
    tasks: [
      {
        key: "task-1",
        processKey,
        status: "todo",
        title: "Complete review",
      },
    ],
  });

  assert.equal(definition.key, processKey);
  assert.equal(process.activities[0]?.sourceEventName, eventName);
  assert.equal(process.assignments[0]?.status, "assigned");
  assert.equal(process.reminders[0]?.status, "scheduled");
  assert.equal(process.escalations[0]?.targetType, "assignment");
  assert.equal(process.slas[0]?.status, "running");
});
