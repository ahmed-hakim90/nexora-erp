import assert from "node:assert/strict";
import test from "node:test";

import {
  DATA_OWNERSHIP_MODEL,
  LIFECYCLE_COLUMNS,
  clampQueryLimit,
  createCursorPage,
  createMigrationPolicy,
  createOwnershipRlsTemplate,
  createRepositoryContext,
  createRlsPolicyName,
  evaluateRlsScenario,
  normalizePaginatedQuery,
  normalizeSearchInput,
  validateMigrationDefinition,
  type RequestContext,
} from "@/platform/public-api";

const request: RequestContext = {
  actorType: "user",
  correlationId: "request:123456" as RequestContext["correlationId"],
  direction: "ltr",
  experience: "erp",
  locale: "en",
  source: "web",
  timezone: "UTC",
};

test("data ownership model defines required platform scopes", () => {
  assert.deepEqual(Object.keys(DATA_OWNERSHIP_MODEL).sort(), [
    "branch",
    "company",
    "department",
    "employee",
    "global",
    "self",
    "team",
    "tenant",
  ]);
  assert.deepEqual(DATA_OWNERSHIP_MODEL.branch.requiredColumns, [
    "tenant_id",
    "company_id",
    "branch_id",
  ]);
  assert.deepEqual(DATA_OWNERSHIP_MODEL.self.requiredColumns, [
    "tenant_id",
    "principal_id",
  ]);
});

test("repository context is derived from request and explicit data scope", () => {
  const context = createRepositoryContext({
    branchId: "branch-1",
    companyId: "company-1",
    dataScope: { ownershipScope: "branch" },
    request,
    tenantId: "tenant-1",
  });

  assert.equal(context.correlationId, "request:123456");
  assert.equal(context.dataScope.ownershipScope, "branch");
  assert.equal(context.dataScope.tenantId, "tenant-1");
  assert.equal(context.dataScope.branchId, "branch-1");
});

test("RLS templates standardize ownership and lifecycle filters", () => {
  const template = createOwnershipRlsTemplate({
    includeArchivedFilter: true,
    includeSoftDeletedFilter: true,
    ownershipScope: "company",
    tableName: "platform_settings",
  });

  assert.equal(createRlsPolicyName({
    operation: "select",
    scope: "company",
    tableName: "platform_settings",
  }), "platform_settings_select_company");
  assert.equal(template.withCheckExpression, "tenant_id = any(current_tenant_ids()) and company_id = any(current_company_ids())");
  assert.match(template.usingExpression, /deleted_at is null/);
  assert.match(template.usingExpression, /archived_at is null/);
});

test("RLS harness evaluates tenant, branch, self, deleted, and archived access", () => {
  assert.equal(evaluateRlsScenario({
    context: { ownershipScope: "tenant", tenantId: "tenant-1" },
    expected: "allowed",
    key: "tenant-allowed",
    operation: "select",
    ownershipScope: "tenant",
    record: { tenantId: "tenant-1" },
  }), "allowed");

  assert.equal(evaluateRlsScenario({
    context: { branchId: "branch-1", ownershipScope: "branch", tenantId: "tenant-1" },
    expected: "denied",
    key: "branch-denied",
    operation: "select",
    ownershipScope: "branch",
    record: { branchId: "branch-2", tenantId: "tenant-1" },
  }), "denied");

  assert.equal(evaluateRlsScenario({
    context: { ownershipScope: "self", principalId: "principal-1", tenantId: "tenant-1" },
    expected: "allowed",
    key: "self-allowed",
    operation: "select",
    ownershipScope: "self",
    record: { principalId: "principal-1", tenantId: "tenant-1" },
  }), "allowed");

  assert.equal(evaluateRlsScenario({
    context: { ownershipScope: "tenant", tenantId: "tenant-1" },
    expected: "denied",
    key: "soft-deleted-denied",
    operation: "select",
    ownershipScope: "tenant",
    record: { deletedAt: "2026-01-01T00:00:00.000Z", tenantId: "tenant-1" },
  }), "denied");

  assert.equal(evaluateRlsScenario({
    context: { ownershipScope: "tenant", tenantId: "tenant-1" },
    expected: "denied",
    key: "archived-denied",
    operation: "select",
    ownershipScope: "tenant",
    record: { archivedAt: "2026-01-01T00:00:00.000Z", tenantId: "tenant-1" },
  }), "denied");
});

test("query standards normalize search, limits, sorting, filtering, and cursor pages", () => {
  assert.equal(normalizeSearchInput("  invoice   1001  "), "invoice 1001");
  assert.equal(normalizeSearchInput("   "), null);
  assert.equal(clampQueryLimit(500), 200);
  assert.equal(clampQueryLimit(0), 50);

  const query = normalizePaginatedQuery({
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pageSize: 500,
    search: "  active   customers ",
    sort: [{ direction: "asc", field: "name" }],
  });

  assert.equal(query.pageSize, 200);
  assert.equal(query.search, "active customers");
  assert.equal(query.filters[0]?.field, "status");
  assert.equal(query.sort[0]?.field, "name");
  assert.deepEqual(createCursorPage({
    nextCursor: "cursor-2",
    pageSize: 2,
    records: [{ id: "1" }, { id: "2" }],
  }).nextCursor, "cursor-2");
});

test("lifecycle and migration standards enforce scoped table requirements", () => {
  assert.deepEqual(LIFECYCLE_COLUMNS, [
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "deleted_at",
    "deleted_by",
    "archived_at",
    "archived_by",
    "version",
  ]);

  const policy = createMigrationPolicy("branch", "future_branch_records");
  assert.deepEqual(policy.requiredColumns, ["tenant_id", "company_id", "branch_id"]);
  assert.deepEqual(policy.immutableColumns, ["tenant_id", "company_id", "branch_id"]);

  assert.deepEqual(validateMigrationDefinition({
    columns: ["id", "tenant_id", "company_id", "branch_id"],
    enablesRls: true,
    hasBackfillPlan: true,
    hasRollbackPlan: true,
    hasRlsTests: true,
    immutableColumns: ["tenant_id", "company_id", "branch_id"],
    indexes: [
      { columns: ["tenant_id"], reason: "rls", required: true, tableName: "future_branch_records" },
      { columns: ["company_id"], reason: "rls", required: true, tableName: "future_branch_records" },
      { columns: ["branch_id"], reason: "rls", required: true, tableName: "future_branch_records" },
    ],
    ownershipScope: "branch",
    tableName: "future_branch_records",
  }), []);

  assert.deepEqual(validateMigrationDefinition({
    columns: ["id", "tenant_id"],
    enablesRls: false,
    hasBackfillPlan: false,
    hasRollbackPlan: false,
    hasRlsTests: false,
    indexes: [],
    ownershipScope: "company",
    tableName: "future_company_records",
  }), [
    "Missing required column: company_id",
    "Missing immutable guard: tenant_id",
    "Missing immutable guard: company_id",
    "Missing required index for: tenant_id",
    "Missing required index for: company_id",
    "RLS must be enabled.",
    "Rollback plan is required.",
    "Backfill plan is required for scoped tables.",
    "RLS tests are required.",
  ]);
});
