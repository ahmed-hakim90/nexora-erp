import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKFLOW_PLATFORM_EVENTS,
  canExecuteTransition,
  createDocumentWorkflowAdapter,
  createPlatformDocument,
  createPlatformEventBus,
  createWorkflowExecutionContext,
  createWorkflowInstance,
  defineDocumentBehavior,
  defineDocumentType,
  definePermissionKey,
  defineWorkflow,
  defineWorkflowAction,
  defineWorkflowGuardKey,
  defineWorkflowHookKey,
  defineWorkflowStatus,
  defineWorkflowTransition,
  executeTransition,
  recordWorkflowHistory,
  validateWorkflow,
  type PlatformEvent,
  type WorkflowDefinition,
} from "@/platform/public-api";

const submitPermission = definePermissionKey("platform.workflow.submit");
const workflowKey = "platform.test-workflow";
const draft = defineWorkflowStatus("draft");
const submitted = defineWorkflowStatus("submitted");
const cancelled = defineWorkflowStatus("cancelled");
const submit = defineWorkflowTransition("submit");
const cancel = defineWorkflowTransition("cancel");
const submitAction = defineWorkflowAction("submit");
const cancelAction = defineWorkflowAction("cancel");

const workflow = defineWorkflow({
  actions: [
    { key: submitAction, label: "Submit" },
    { key: cancelAction, label: "Cancel" },
  ],
  entityType: "platform.test-document",
  guards: [
    {
      key: defineWorkflowGuardKey("has-title"),
      kind: "required-field",
      label: "Has title",
      requiredFields: ["title"],
    },
  ],
  hooks: [
    {
      key: defineWorkflowHookKey("after-submit"),
      label: "After submit",
      timing: "after",
    },
  ],
  key: workflowKey,
  label: "Platform Test Workflow",
  moduleKey: "platform",
  states: [
    { isInitial: true, key: draft, label: "Draft" },
    { key: submitted, label: "Submitted" },
    { isTerminal: true, key: cancelled, label: "Cancelled" },
  ],
  transitions: [
    {
      actionKey: submitAction,
      from: draft,
      guardKeys: ["has-title"],
      hookKeys: ["after-submit"],
      key: submit,
      label: "Submit",
      requiredPermission: submitPermission,
      to: submitted,
    },
    {
      actionKey: cancelAction,
      from: draft,
      key: cancel,
      label: "Cancel",
      to: cancelled,
    },
  ],
} satisfies WorkflowDefinition);

function createContext(overrides: Partial<Parameters<typeof createWorkflowExecutionContext>[0]> = {}) {
  return createWorkflowExecutionContext({
    correlationId: "request:workflow",
    experience: "erp",
    fieldValues: { title: "Ready" },
    grantedPermissions: new Set([submitPermission]),
    principalId: "user-1",
    sourceApp: "platform",
    tenantId: "tenant-1",
    ...overrides,
  });
}

test("workflow definition validates states, transitions, actions, guards, and hooks", () => {
  assert.deepEqual(validateWorkflow(workflow), {
    errors: [],
    valid: true,
  });

  assert.deepEqual(validateWorkflow({
    ...workflow,
    states: [
      { isInitial: true, key: draft, label: "Draft" },
      { isInitial: true, key: submitted, label: "Submitted" },
    ],
    transitions: [
      {
        actionKey: submitAction,
        from: draft,
        key: submit,
        label: "Submit",
        to: defineWorkflowStatus("missing"),
      },
    ],
  }), {
    errors: [
      "Workflow must define exactly one initial state.",
      "Transition submit references unknown to state: missing",
    ],
    valid: false,
  });
});

test("workflow defaults to deny when transition is unavailable or permission is missing", async () => {
  const instance = createWorkflowInstance(workflow, {
    entityId: "doc-1",
    id: "workflow-1",
    startedAt: "2026-06-27T07:00:00.000Z",
    tenantId: "tenant-1",
  });

  assert.deepEqual(await canExecuteTransition(workflow, instance, defineWorkflowTransition("missing"), createContext()), {
    allowed: false,
    reason: "Workflow transition is not available from the current state.",
  });

  assert.deepEqual(await canExecuteTransition(workflow, instance, submit, createContext({
    grantedPermissions: new Set(),
  })), {
    allowed: false,
    reason: "Required workflow permission is missing.",
  });
});

test("workflow guard evaluation blocks missing required fields", async () => {
  const instance = createWorkflowInstance(workflow, {
    entityId: "doc-1",
    id: "workflow-1",
    startedAt: "2026-06-27T07:00:00.000Z",
    tenantId: "tenant-1",
  });

  assert.deepEqual(await canExecuteTransition(workflow, instance, submit, createContext({
    fieldValues: {},
  })), {
    allowed: false,
    reason: "Workflow guard has-title denied missing required fields.",
  });
});

test("workflow execution records history and publishes transition events", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const instance = createWorkflowInstance(workflow, {
    entityId: "doc-1",
    id: "workflow-1",
    startedAt: "2026-06-27T07:00:00.000Z",
    tenantId: "tenant-1",
  });

  const result = await executeTransition(workflow, instance, submit, createContext({
    eventBus: bus,
    now: "2026-06-27T07:05:00.000Z",
  }));

  assert.equal(result.allowed, true);
  assert.equal(result.instance.status, submitted);
  assert.equal(result.historyEntry?.from, draft);
  assert.equal(result.historyEntry?.to, submitted);
  assert.deepEqual(result.publishedEvents, [
    WORKFLOW_PLATFORM_EVENTS.requested,
    WORKFLOW_PLATFORM_EVENTS.transitionCompleted,
    WORKFLOW_PLATFORM_EVENTS.started,
  ]);
  assert.deepEqual(published.map((event) => event.metadata.eventName), result.publishedEvents);
  assert.equal(published[0]?.metadata.context.correlationId, "request:workflow");
});

test("workflow execution publishes denied event without mutating instance", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const instance = createWorkflowInstance(workflow, {
    entityId: "doc-1",
    id: "workflow-1",
    startedAt: "2026-06-27T07:00:00.000Z",
    tenantId: "tenant-1",
  });

  const result = await executeTransition(workflow, instance, submit, createContext({
    eventBus: bus,
    fieldValues: {},
  }));

  assert.equal(result.allowed, false);
  assert.equal(result.instance.status, draft);
  assert.deepEqual(published.map((event) => event.metadata.eventName), [
    WORKFLOW_PLATFORM_EVENTS.requested,
    WORKFLOW_PLATFORM_EVENTS.denied,
  ]);
});

test("terminal transitions publish completed or cancelled events", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const instance = createWorkflowInstance(workflow, {
    entityId: "doc-1",
    id: "workflow-1",
    startedAt: "2026-06-27T07:00:00.000Z",
    tenantId: "tenant-1",
  });

  const result = await executeTransition(workflow, instance, cancel, createContext({ eventBus: bus }));

  assert.equal(result.allowed, true);
  assert.equal(result.instance.status, cancelled);
  assert.equal(result.instance.cancelledAt !== null, true);
  assert.deepEqual(published.map((event) => event.metadata.eventName), [
    WORKFLOW_PLATFORM_EVENTS.requested,
    WORKFLOW_PLATFORM_EVENTS.transitionCompleted,
    WORKFLOW_PLATFORM_EVENTS.cancelled,
    WORKFLOW_PLATFORM_EVENTS.started,
  ]);
});

test("workflow history helper creates deterministic history entries", () => {
  assert.deepEqual(recordWorkflowHistory({
    actionKey: submitAction,
    correlationId: "request:workflow",
    from: draft,
    occurredAt: "2026-06-27T07:05:00.000Z",
    principalId: "user-1",
    to: submitted,
    transitionKey: submit,
    workflowInstanceId: "workflow-1",
    workflowKey,
  }), {
    actionKey: submitAction,
    correlationId: "request:workflow",
    from: draft,
    id: "workflow-1:submit:2026-06-27T07:05:00.000Z",
    occurredAt: "2026-06-27T07:05:00.000Z",
    principalId: "user-1",
    to: submitted,
    transitionKey: submit,
    workflowInstanceId: "workflow-1",
    workflowKey,
  });
});

test("document workflow adapter respects document workflow behavior declaration", () => {
  const documentType = defineDocumentType("platform.workflow-document");
  const document = createPlatformDocument({
    body: {},
    header: {
      createdAt: "2026-06-27T07:00:00.000Z",
      currentVersion: 1,
      documentType,
      id: "doc-1",
      moduleKey: "platform",
      status: "draft",
      tenantId: "tenant-1",
    },
  });

  assert.deepEqual(createDocumentWorkflowAdapter(document, workflowKey, [
    defineDocumentBehavior("workflow"),
  ]), {
    currentStatus: draft,
    entityId: "doc-1",
    entityType: "platform.workflow-document",
    workflowEnabled: true,
    workflowKey,
  });
});
