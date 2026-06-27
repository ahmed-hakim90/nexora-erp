import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_DOCUMENT_STATUSES,
  DEFAULT_DOCUMENT_LIFECYCLE,
  createDocumentRegistry,
  createDocumentRelation,
  createDocumentVersion,
  createPlatformDocument,
  defineDocumentBehavior,
  defineDocumentLifecycle,
  defineDocumentType,
  defineDocumentTypeDefinition,
  generateDocumentNumber,
  registerDocumentHooks,
  validateDocumentBehaviors,
  validateDocumentLifecycleTransition,
  type DocumentNumberingDefinition,
} from "@/platform/public-api";

const documentType = defineDocumentType("platform.test-document");

const numbering: DocumentNumberingDefinition = {
  documentType,
  includeYear: true,
  key: "platform.test-document.numbering",
  pattern: "{prefix}-{year}-{sequence}",
  prefix: "DOC",
  sequencePadding: 6,
  tenantScoped: true,
};

const lifecycle = defineDocumentLifecycle({
  documentType,
  initialState: "draft",
  terminalStates: ["completed", "archived", "cancelled"],
  transitions: [
    { command: "submit", from: "draft", hookAfter: "afterSubmit", hookBefore: "beforeSubmit", to: "submitted" },
    { command: "approve", from: "submitted", hookAfter: "afterApprove", hookBefore: "beforeApprove", to: "approved" },
    { command: "post", from: "approved", hookAfter: "afterPost", hookBefore: "beforePost", to: "posted" },
    { command: "complete", from: "posted", to: "completed" },
    { command: "cancel", from: "draft", hookAfter: "afterCancel", hookBefore: "beforeCancel", to: "cancelled" },
  ],
});

test("document type definition composes lifecycle, behaviors, numbering, and hooks", () => {
  const hooks = registerDocumentHooks(documentType, [
    { hook: "afterSubmit", key: "platform.after-submit", order: 20, requiredBehavior: "workflow" },
    { hook: "beforeSubmit", key: "platform.before-submit", order: 10, requiredBehavior: "workflow" },
  ]);
  const definition = defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering"),
      defineDocumentBehavior("workflow"),
      defineDocumentBehavior("timeline"),
      defineDocumentBehavior("audit"),
      defineDocumentBehavior("versioning"),
    ],
    documentType,
    hooks,
    label: "Platform Test Document",
    lifecycle,
    moduleKey: "platform",
    numbering,
  });
  const registry = createDocumentRegistry([definition]);

  assert.equal(definition.documentType, documentType);
  assert.equal(definition.lifecycle.initialState, "draft");
  assert.equal(definition.numbering?.pattern, "{prefix}-{year}-{sequence}");
  assert.deepEqual(registry.hooks.map((hook) => hook.key), [
    "platform.before-submit",
    "platform.after-submit",
  ]);
});

test("document behavior validation enforces composition requirements", () => {
  assert.deepEqual(validateDocumentBehaviors([
    defineDocumentBehavior("workflow"),
    defineDocumentBehavior("approval"),
    defineDocumentBehavior("timeline"),
    defineDocumentBehavior("comments"),
    defineDocumentBehavior("audit"),
    defineDocumentBehavior("attachments"),
  ]), []);

  assert.deepEqual(validateDocumentBehaviors([
    defineDocumentBehavior("approval"),
    defineDocumentBehavior("comments"),
    defineDocumentBehavior("attachments"),
    defineDocumentBehavior("approval"),
  ]), [
    "Duplicate document behavior: approval",
    "Approval behavior requires workflow behavior.",
    "Comments behavior requires timeline behavior.",
    "Attachments behavior requires audit behavior.",
  ]);
});

test("lifecycle transition validation supports built-in and custom lifecycle states", () => {
  assert.deepEqual(BUILT_IN_DOCUMENT_STATUSES, [
    "draft",
    "submitted",
    "waiting-approval",
    "approved",
    "rejected",
    "posted",
    "completed",
    "archived",
    "cancelled",
  ]);
  assert.equal(DEFAULT_DOCUMENT_LIFECYCLE.initialState, "draft");

  assert.deepEqual(validateDocumentLifecycleTransition(lifecycle, {
    command: "submit",
    currentState: "draft",
    documentId: "doc-1",
  }), {
    command: "submit",
    documentId: "doc-1",
    from: "draft",
    to: "submitted",
  });

  assert.equal(validateDocumentLifecycleTransition(lifecycle, {
    command: "post",
    currentState: "draft",
    documentId: "doc-1",
  }), null);
});

test("numbering pattern generation supports prefix, year, branch, custom tokens, and padded sequence", () => {
  assert.deepEqual(generateDocumentNumber(numbering, {
    sequence: 1,
    tenantId: "tenant-1",
    year: 2026,
  }), {
    pattern: "{prefix}-{year}-{sequence}",
    sequence: 1,
    tokens: {
      branch: "",
      company: "",
      prefix: "DOC",
      sequence: "000001",
      suffix: "",
      tenant: "tenant-1",
      year: "2026",
    },
    value: "DOC-2026-000001",
  });

  assert.equal(generateDocumentNumber({
    documentType,
    key: "branch-pattern",
    pattern: "{prefix}-{branch}-{sequence}-{channel}",
    prefix: "PO",
    sequencePadding: 4,
  }, {
    branchId: "CAI",
    customTokens: { channel: "WEB" },
    sequence: 25,
    tenantId: "tenant-1",
  }).value, "PO-CAI-0025-WEB");
});

test("version metadata captures previous version and snapshot information", () => {
  assert.deepEqual(createDocumentVersion({
    changeSummary: "Submitted for approval.",
    createdAt: "2026-06-27T06:00:00.000Z",
    createdBy: "user-1",
    currentVersion: 2,
    documentId: "doc-1",
    snapshotMetadata: { status: "submitted" },
  }), {
    changeSummary: "Submitted for approval.",
    createdAt: "2026-06-27T06:00:00.000Z",
    createdBy: "user-1",
    documentId: "doc-1",
    previousVersion: 2,
    snapshotMetadata: { status: "submitted" },
    version: 3,
  });
});

test("document relationships link documents generically without business document types", () => {
  assert.deepEqual(createDocumentRelation({
    createdAt: "2026-06-27T06:00:00.000Z",
    from: {
      documentId: "source-1",
      documentNumber: "SRC-1",
      documentType,
    },
    relation: "creates",
    to: {
      documentId: "target-1",
      documentNumber: "TGT-1",
      documentType: defineDocumentType("platform.target-document"),
    },
  }), {
    createdAt: "2026-06-27T06:00:00.000Z",
    from: {
      documentId: "source-1",
      documentNumber: "SRC-1",
      documentType,
    },
    key: "platform.test-document:source-1->creates->platform.target-document:target-1",
    relation: "creates",
    to: {
      documentId: "target-1",
      documentNumber: "TGT-1",
      documentType: "platform.target-document",
    },
  });
});

test("document factory creates a complete platform document envelope", () => {
  const document = createPlatformDocument({
    body: { lines: [] },
    header: {
      createdAt: "2026-06-27T06:00:00.000Z",
      currentVersion: 1,
      documentNumber: "DOC-2026-000001",
      documentType,
      id: "doc-1",
      moduleKey: "platform",
      status: "draft",
      tenantId: "tenant-1",
    },
    metadata: { source: "test" },
  });

  assert.equal(document.header.status, "draft");
  assert.deepEqual(document.body, { lines: [] });
  assert.deepEqual(document.metadata, { source: "test" });
  assert.deepEqual(document.timeline, []);
  assert.deepEqual(document.attachments, []);
});
