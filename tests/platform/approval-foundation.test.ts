import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_PLATFORM_EVENTS,
  createApprovalAuditLink,
  createApprovalRequest,
  createPlatformEventBus,
  decideApproval,
  defineApproval,
  defineApprovalPolicy,
  requestApproval,
  validateApprovalDecision,
  validateApprovalPolicy,
  type ApprovalDefinition,
  type PlatformEvent,
} from "@/platform/public-api";

const policy = defineApprovalPolicy({
  allowCancellation: true,
  allowSkip: false,
  entityType: "platform.test-document",
  key: "platform.test-approval",
  mode: "sequential",
  moduleKey: "platform",
  requireReasonOnReject: true,
  requireReasonOnReturn: true,
  steps: [
    {
      allowSelfApproval: false,
      key: "manager",
      mode: "single",
      order: 1,
      participants: [
        {
          id: "role-manager",
          label: "Manager",
          type: "role",
        },
      ],
    },
  ],
});

const definition = defineApproval({
  isActive: true,
  key: "platform.test-approval-definition",
  label: "Platform Test Approval",
  policy,
  version: 1,
} satisfies ApprovalDefinition);

function createContext(eventBus?: ReturnType<typeof createPlatformEventBus>) {
  return {
    actorType: "user" as const,
    correlationId: "request:approval",
    eventBus,
    experience: "erp" as const,
    principalId: "approver-1",
    sourceApp: "platform",
    tenantId: "tenant-1",
  };
}

test("approval definitions compose policy, steps, and participants", () => {
  assert.equal(definition.policy.steps[0]?.participants[0]?.type, "role");
  assert.equal(definition.policy.mode, "sequential");
  assert.equal(definition.isActive, true);
});

test("approval policy validation catches duplicates and invalid assignments", () => {
  assert.deepEqual(validateApprovalPolicy(policy), {
    errors: [],
    valid: true,
  });

  assert.deepEqual(validateApprovalPolicy({
    ...policy,
    steps: [
      {
        key: "manager",
        mode: "single",
        order: 1,
        participants: [],
      },
      {
        key: "manager",
        mode: "single",
        order: 2,
        participants: [
          { id: "u1", type: "user" },
          { id: "u2", type: "user" },
        ],
      },
    ],
  }), {
    errors: [
      "Duplicate approval step: manager",
      "Approval step manager must declare at least one participant.",
      "Approval step manager single mode cannot declare multiple participants.",
    ],
    valid: false,
  });
});

test("request approval creates request, assignment, and platform events", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });

  const result = await requestApproval(definition, {
    entityId: "doc-1",
    id: "approval-1",
    requestedAt: "2026-06-27T07:30:00.000Z",
    requestedByUserId: "requester-1",
    tenantId: "tenant-1",
  }, createContext(bus));

  assert.equal(result.allowed, true);
  assert.equal(result.request.status, "assigned");
  assert.deepEqual(result.request.assignments.map((assignment) => assignment.participant.type), ["role"]);
  assert.deepEqual(published.map((event) => event.metadata.eventName), [
    APPROVAL_PLATFORM_EVENTS.requested,
    APPROVAL_PLATFORM_EVENTS.assigned,
  ]);
  assert.equal(published[0]?.metadata.context.sourceEngine, "approval");
});

test("approval decision validation denies self approval and missing reject reason", () => {
  const request = createApprovalRequest(definition, {
    entityId: "doc-1",
    id: "approval-1",
    requestedAt: "2026-06-27T07:30:00.000Z",
    requestedByUserId: "requester-1",
    tenantId: "tenant-1",
  });

  assert.deepEqual(validateApprovalDecision(policy, request, {
    actor: { userId: "requester-1" },
    approvalInstanceId: "approval-1",
    decision: "approve",
    requestedByUserId: "requester-1",
    stepKey: "manager",
    tenantId: "tenant-1",
  }), {
    errors: ["Self-approval is not allowed for this approval step."],
    valid: false,
  });

  assert.deepEqual(validateApprovalDecision(policy, request, {
    actor: { userId: "approver-1" },
    approvalInstanceId: "approval-1",
    decision: "reject",
    requestedByUserId: "requester-1",
    stepKey: "manager",
    tenantId: "tenant-1",
  }), {
    errors: ["Reject decision requires a reason."],
    valid: false,
  });
});

test("approval decisions record audit history and publish granted/completed events", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const requested = await requestApproval(definition, {
    entityId: "doc-1",
    id: "approval-1",
    requestedAt: "2026-06-27T07:30:00.000Z",
    requestedByUserId: "requester-1",
    tenantId: "tenant-1",
  }, createContext());

  const result = await decideApproval(definition, requested.request, {
    actor: { userId: "approver-1" },
    approvalInstanceId: "approval-1",
    decision: "approve",
    requestedByUserId: "requester-1",
    stepKey: "manager",
    tenantId: "tenant-1",
  }, {
    ...createContext(bus),
    now: "2026-06-27T08:00:00.000Z",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.status, "completed");
  assert.equal(result.historyEntry?.auditEvent?.category, "approval");
  assert.equal(result.historyEntry?.auditEvent?.action, "approval.approve");
  assert.deepEqual(published.map((event) => event.metadata.eventName), [
    APPROVAL_PLATFORM_EVENTS.granted,
    APPROVAL_PLATFORM_EVENTS.completed,
  ]);
});

test("approval rejection and return publish decision-specific events", async () => {
  const bus = createPlatformEventBus();
  const published: PlatformEvent[] = [];
  bus.subscribe("*", (event) => {
    published.push(event);
  });
  const request = createApprovalRequest(definition, {
    entityId: "doc-1",
    id: "approval-1",
    requestedAt: "2026-06-27T07:30:00.000Z",
    requestedByUserId: "requester-1",
    tenantId: "tenant-1",
  });

  await decideApproval(definition, request, {
    actor: { userId: "approver-1" },
    approvalInstanceId: "approval-1",
    decision: "return-for-correction",
    reason: "Missing details.",
    requestedByUserId: "requester-1",
    stepKey: "manager",
    tenantId: "tenant-1",
  }, createContext(bus));

  assert.deepEqual(published.map((event) => event.metadata.eventName), [
    APPROVAL_PLATFORM_EVENTS.returned,
  ]);
});

test("approval engine stays workflow-independent through platform events only", () => {
  const source = String(decideApproval);

  assert.equal(source.includes("executeTransition"), false);
  assert.equal(source.includes("Workflow"), false);
});

test("approval audit link captures correlation and approval action", () => {
  const request = createApprovalRequest(definition, {
    entityId: "doc-1",
    id: "approval-1",
    requestedAt: "2026-06-27T07:30:00.000Z",
    requestedByUserId: "requester-1",
    tenantId: "tenant-1",
  });

  assert.deepEqual(createApprovalAuditLink(request, {
    actor: { userId: "approver-1" },
    approvalInstanceId: "approval-1",
    decision: "cancel",
    requestedByUserId: "requester-1",
    stepKey: "manager",
    tenantId: "tenant-1",
  }, {
    ...createContext(),
    now: "2026-06-27T08:00:00.000Z",
  }), {
    action: "approval.cancel",
    category: "approval",
    correlationId: "request:approval",
    id: "approval-1:manager:cancel",
    timestamp: "2026-06-27T08:00:00.000Z",
  });
});
