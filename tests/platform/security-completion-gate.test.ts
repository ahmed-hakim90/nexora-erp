import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { createAuditEvent, defineAuditAction, type RequestContext } from "@/platform/public-api";
import { PLATFORM_PERMISSIONS } from "@/platform/permissions/public-api";
import { ERP_PLATFORM_CAPABILITY_ACCESS } from "@/app/(erp)/erp-platform-capability.server";

const root = process.cwd();

const context = {
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:security-gate" as RequestContext["correlationId"],
  direction: "ltr",
  experience: "erp",
  identityId: "identity-1",
  locale: "en",
  principalId: "principal-1",
  source: "web",
  tenantId: "tenant-1",
  timezone: "UTC",
  userId: "user-1",
} satisfies RequestContext & Readonly<{ identityId: string; principalId: string }>;

test("authorization denial audit event includes actor, scope, permission, and denial metadata", () => {
  const event = createAuditEvent({
    action: defineAuditAction("platform.authorization.denied"),
    category: "security",
    context,
    entityType: "authorization",
    metadata: {
      branchId: context.branchId,
      companyId: context.companyId,
      correlationId: context.correlationId,
      denialReason: "missing-permission",
      requestedResource: "platform.search",
      requiredPermission: PLATFORM_PERMISSIONS.viewSearch,
      tenantId: context.tenantId,
      timestamp: "2026-06-30T12:00:00.000Z",
    },
    module: "platform.permissions",
    outcome: "denied",
    severity: "warning",
    subject: {
      display: "platform.search",
      id: "platform.search",
      type: "authorization",
    },
  });

  assert.equal(event.action, "platform.authorization.denied");
  assert.equal(event.outcome, "denied");
  assert.equal(event.category, "security");
  assert.equal(event.actor.type, "user");
  assert.equal(event.tenantId, "tenant-1");
  assert.equal(event.companyId, "company-1");
  assert.equal(event.branchId, "branch-1");
  assert.equal(event.correlationId, "request:security-gate");
  assert.equal(event.metadata.requiredPermission, PLATFORM_PERMISSIONS.viewSearch);
  assert.equal(event.metadata.denialReason, "missing-permission");
  assert.equal(event.metadata.requestedResource, "platform.search");
});

test("permission server audits authorization denials before throwing", () => {
  const source = fs.readFileSync(path.join(root, "src/platform/permissions/server.ts"), "utf8");
  assert.match(source, /recordAuthorizationDenial/);
  assert.match(source, /missing-permission/);
});

test("platform capability pages require explicit permission guards", () => {
  for (const pagePath of [
    "src/app/(erp)/erp/page.tsx",
    "src/app/(erp)/erp/dashboard/page.tsx",
    "src/app/(erp)/erp/notifications/page.tsx",
    "src/app/(erp)/erp/settings/page.tsx",
    "src/app/(erp)/erp/reports/page.tsx",
    "src/app/(erp)/erp/feature-flags/page.tsx",
    "src/app/(erp)/erp/preferences/page.tsx",
  ]) {
    const source = fs.readFileSync(path.join(root, pagePath), "utf8");
    assert.match(source, /requirePlatformCapabilityAccess\(/);
  }
});

test("platform capability registry fail-closed mappings are declared", () => {
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.dashboard.permission, PLATFORM_PERMISSIONS.accessErp);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.notifications.permission, PLATFORM_PERMISSIONS.viewNotifications);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.settings.permission, PLATFORM_PERMISSIONS.manageSettings);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.reports.permission, PLATFORM_PERMISSIONS.viewExport);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.search.permission, PLATFORM_PERMISSIONS.viewSearch);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.workflow.permission, PLATFORM_PERMISSIONS.viewWorkflow);
  assert.equal(ERP_PLATFORM_CAPABILITY_ACCESS.approval.permission, PLATFORM_PERMISSIONS.viewApproval);
});

test("app-layer catalog loaders delegate to feature services", () => {
  for (const pagePath of [
    "src/app/(erp)/erp/inventory/_components/warehouse-execution-pages.tsx",
    "src/app/(erp)/erp/inventory/_components/transaction-pages.tsx",
    "src/app/(erp)/erp/purchasing/_components/purchasing-pages.tsx",
  ]) {
    const source = fs.readFileSync(path.join(root, pagePath), "utf8");
    assert.doesNotMatch(source, /createRequestSupabaseClient/);
    assert.match(source, /CatalogLookupService/);
  }
});

test("inventory and purchasing catalog services use repository indirection", () => {
  const inventoryService = fs.readFileSync(
    path.join(root, "src/features/inventory/application/services/inventory-catalog-lookup.service.ts"),
    "utf8",
  );
  const purchasingService = fs.readFileSync(
    path.join(root, "src/features/purchasing/application/services/purchasing-catalog-lookup.service.ts"),
    "utf8",
  );

  assert.match(inventoryService, /SupabaseInventoryCatalogLookupRepository/);
  assert.match(purchasingService, /SupabasePurchasingCatalogLookupRepository/);
  assert.doesNotMatch(inventoryService, /createRequestSupabaseClient/);
  assert.doesNotMatch(purchasingService, /createRequestSupabaseClient/);
});

test("loader architecture exceptions are documented", () => {
  const doc = fs.readFileSync(path.join(root, "docs/07-development/LOADER_ARCHITECTURE_EXCEPTIONS.md"), "utf8");
  assert.match(doc, /Loader → Application Service → Repository → Database/);
  assert.match(doc, /inventory-lots\.loader\.ts/);
  assert.match(doc, /inventory-serials\.loader\.ts/);
});

test("erp route access audits app visibility denials", () => {
  const source = fs.readFileSync(path.join(root, "src/app/(erp)/erp-security.server.ts"), "utf8");
  assert.match(source, /recordAuthorizationDenial/);
  assert.match(source, /app-not-enabled/);
});

test("authorization denial audit module is wired into platform audit server", () => {
  const source = fs.readFileSync(path.join(root, "src/platform/audit/server.ts"), "utf8");
  assert.match(source, /recordAuthorizationDenial/);
  assert.match(source, /authorization-denial-audit/);
});
