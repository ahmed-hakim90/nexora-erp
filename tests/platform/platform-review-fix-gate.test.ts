import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createInMemoryPermissionResolverSource,
  defineCustomRole,
  defineDataScope,
  defineEntitlement,
  definePermission,
  definePermissionKey,
  defineSecurityMetadata,
} from "@/platform/public-api";
import {
  hasServerPermission,
  requirePermission,
  type TenantRequestContext,
} from "@/platform/server";
import * as platformServer from "@/platform/server";

const root = process.cwd();

test("supabase migrations pass repeatable PL/pgSQL validation", () => {
  const output = execFileSync("node", ["scripts/validate-supabase-migrations.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.match(output, /Validated \d+ Supabase migration files/);
});

test("review fix migration replaces broad platform engine RLS policies", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/20260627120000_platform_review_fix_gate.sql"),
    "utf8",
  );

  for (const policy of [
    "workflow_definitions_member_insert",
    "approval_policies_member_insert",
    "platform_documents_member_insert",
    "notification_outbox_member_insert",
    "file_attachments_member_insert",
    "searchable_entities_member_insert",
    "numbering_sequences_member_update",
    "background_jobs_member_insert",
  ]) {
    assert.match(migration, new RegExp(`drop policy if exists ${policy}`));
  }

  for (const permission of [
    "platform.workflow.manage",
    "platform.approval.manage",
    "platform.document.manage",
    "platform.notification.dispatch",
    "platform.file.manage",
    "platform.search.manage",
    "platform.numbering.manage",
    "platform.background-job.manage",
  ]) {
    assert.match(migration, new RegExp(`public\\.has_permission\\('${permission}'`));
  }
});

test("requirePermission can use the official resolver bridge without legacy RPC", async () => {
  const permission = definePermissionKey("platform.review.execute");
  const context = {
    accessToken: "test-token",
    actorType: "user",
    correlationId: "request:review",
    credential: { accessToken: "test-token", type: "bearer" },
    currentPrincipal: { actorType: "user", id: "principal-1", type: "user" },
    currentUser: {
      displayName: "Reviewer",
      id: "user-1",
      identity: { displayName: "Reviewer", id: "identity-1", type: "user" },
      principal: { actorType: "user", id: "principal-1", type: "user" },
      providerKey: "test",
      providerSubject: "user-1",
    },
    direction: "ltr",
    experience: "erp",
    identity: { displayName: "Reviewer", id: "identity-1", type: "user" },
    identityId: "identity-1",
    locale: "en",
    principal: { actorType: "user", id: "principal-1", type: "user" },
    principalId: "principal-1",
    providerKey: "test",
    session: {
      accessToken: "test-token",
      credential: { accessToken: "test-token", type: "bearer" },
      identity: { displayName: "Reviewer", id: "identity-1", type: "user" },
      principal: { actorType: "user", id: "principal-1", type: "user" },
      providerKey: "test",
      providerSubject: "user-1",
    },
    source: "web",
    tenantId: "tenant-1",
    timezone: "UTC",
    userId: "user-1",
  } as unknown as TenantRequestContext;
  const source = createInMemoryPermissionResolverSource({
    entitlements: [
      defineEntitlement({
        appKey: "platform",
        key: "platform.review",
        status: "active",
        tenantId: "tenant-1",
      }),
    ],
    permissions: [
      definePermission({
        action: "execute",
        categoryKey: "platform",
        description: "Run review fix checks.",
        experiences: ["erp"],
        groupKey: "review",
        key: permission,
        label: "Run review",
        metadata: defineSecurityMetadata(),
        ownerKey: "platform",
        resource: "review",
      }),
    ],
    roleAssignments: [
      {
        role: defineCustomRole({
          isAssignable: true,
          isSystemRole: false,
          key: "reviewer",
          label: "Reviewer",
          permissionKeys: [permission],
          tenantId: "tenant-1",
          type: "custom",
        }),
        scope: defineDataScope({ kind: "tenant", tenantId: "tenant-1" }),
      },
    ],
  });

  assert.equal(
    await hasServerPermission({
      context,
      entitlementKey: "platform.review",
      permission,
      resolverSource: source,
    }),
    true,
  );
  await assert.doesNotReject(() =>
    requirePermission({
      context,
      entitlementKey: "platform.review",
      permission,
      resolverSource: source,
    }),
  );
});

test("platform dependency boundaries avoid value cycles and business imports", () => {
  const platformDir = path.join(root, "src/platform");
  const files = listFiles(platformDir).filter((file) => /\.(ts|tsx)$/.test(file));
  const graph = new Map<string, Set<string>>();

  for (const file of files) {
    const moduleKey = platformModule(file);
    graph.set(moduleKey, graph.get(moduleKey) ?? new Set());
    const source = fs.readFileSync(file, "utf8");

    assert.doesNotMatch(source, /from\s+["']@\/features\//, `${file} imports a feature module`);

    for (const match of source.matchAll(/import\s+(?!type\b)[^;]+from\s+["']@\/platform\/([^/"']+)/g)) {
      const target = match[1];
      if (target !== moduleKey) graph.get(moduleKey)?.add(target);
    }
  }

  assertNoCycles(graph);

  const approvals = fs.readFileSync(path.join(platformDir, "approvals/public-api.ts"), "utf8");
  const workflow = fs.readFileSync(path.join(platformDir, "workflow/public-api.ts"), "utf8");
  const notifications = fs.readFileSync(path.join(platformDir, "notifications/public-api.ts"), "utf8");

  assert.doesNotMatch(approvals, /@\/platform\/workflow/);
  assert.doesNotMatch(workflow, /@\/platform\/approvals/);
  assert.doesNotMatch(notifications, /@\/features\//);
});

test("platform server barrel exports existing server helpers", () => {
  for (const exportName of [
    "AppRegistry",
    "validateApprovalPolicy",
    "validateBackgroundJobDefinition",
    "executeDocumentLifecycleCommand",
    "validateNotificationIntent",
    "previewDocumentNumber",
    "ReportRegistry",
    "validateSearchQuery",
    "validateWorkflowTransition",
  ]) {
    assert.equal(typeof platformServer[exportName as keyof typeof platformServer], "function");
  }
});

test("event bus and outbox layering decision is documented", () => {
  const doc = fs.readFileSync(
    path.join(root, "docs/platform/10_EVENT_OUTBOX_LAYERING.md"),
    "utf8",
  );

  assert.match(doc, /Platform Event Bus is the in-process/);
  assert.match(doc, /Outbox and Integration layer is the durable delivery boundary/);
});

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function platformModule(file: string): string {
  return path.relative(path.join(root, "src/platform"), file).split(path.sep)[0];
}

function assertNoCycles(graph: Map<string, Set<string>>): void {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];

  function visit(node: string): void {
    if (visiting.has(node)) {
      const cycle = [...stack.slice(stack.indexOf(node)), node].join(" -> ");
      assert.fail(`Platform value import cycle detected: ${cycle}`);
    }

    if (visited.has(node)) return;

    visiting.add(node);
    stack.push(node);

    for (const target of graph.get(node) ?? []) {
      visit(target);
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    visit(node);
  }
}

