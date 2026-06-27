import type { RequestContext } from "@/core/context";
import type { PlatformIdentity, PlatformPrincipal } from "@/platform/auth/public-api";

export type TenantId = string & { readonly __brand: "TenantId" };
export type CompanyId = string & { readonly __brand: "CompanyId" };
export type BranchId = string & { readonly __brand: "BranchId" };
export type DepartmentId = string & { readonly __brand: "DepartmentId" };
export type TeamId = string & { readonly __brand: "TeamId" };
export type EmployeeId = string & { readonly __brand: "EmployeeId" };

export type DataOwnershipScope =
  | "global"
  | "tenant"
  | "company"
  | "branch"
  | "department"
  | "team"
  | "employee"
  | "self";

export type DataOwnershipDefinition = Readonly<{
  scope: DataOwnershipScope;
  description: string;
  requiredColumns: readonly string[];
  recordTypes: readonly string[];
}>;

export const DATA_OWNERSHIP_MODEL = {
  branch: {
    description: "Operational records owned by a physical or operational branch.",
    recordTypes: ["warehouse operations", "POS sessions", "branch stock", "service operations"],
    requiredColumns: ["tenant_id", "company_id", "branch_id"],
    scope: "branch",
  },
  company: {
    description: "Legal, financial, or company-level operating records.",
    recordTypes: ["financial documents", "legal settings", "company reports"],
    requiredColumns: ["tenant_id", "company_id"],
    scope: "company",
  },
  department: {
    description: "Records owned by an organizational department inside a company.",
    recordTypes: ["department budgets", "department requests", "department dashboards"],
    requiredColumns: ["tenant_id", "company_id", "department_id"],
    scope: "department",
  },
  employee: {
    description: "Records owned by or linked to a specific employee identity.",
    recordTypes: ["employee documents", "attendance facts", "self-service requests"],
    requiredColumns: ["tenant_id", "employee_id"],
    scope: "employee",
  },
  global: {
    description: "Public platform reference data with no tenant-private content.",
    recordTypes: ["system metadata", "global enum registries", "public platform catalog metadata"],
    requiredColumns: [],
    scope: "global",
  },
  self: {
    description: "Records visible only to the current principal or linked subject.",
    recordTypes: ["personal preferences", "my notifications", "my saved views"],
    requiredColumns: ["tenant_id", "principal_id"],
    scope: "self",
  },
  team: {
    description: "Records owned by a team inside a department or company.",
    recordTypes: ["team work queues", "team assignments", "team dashboards"],
    requiredColumns: ["tenant_id", "company_id", "team_id"],
    scope: "team",
  },
  tenant: {
    description: "Tenant-private records that are not owned by a narrower company or branch.",
    recordTypes: ["tenant settings", "tenant roles", "tenant-wide metadata"],
    requiredColumns: ["tenant_id"],
    scope: "tenant",
  },
} satisfies Record<DataOwnershipScope, DataOwnershipDefinition>;

export type DataScopeContext = Readonly<{
  ownershipScope: DataOwnershipScope;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  employeeId?: string | null;
  principalId?: string | null;
}>;

export type RepositoryContext = Readonly<{
  request: RequestContext;
  identity?: PlatformIdentity;
  principal?: PlatformPrincipal;
  tenantId?: string;
  companyId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  employeeId?: string | null;
  dataScope: DataScopeContext;
  correlationId: string;
}>;

export function createRepositoryContext(
  context: Omit<RepositoryContext, "correlationId" | "dataScope"> &
    Readonly<{ dataScope?: Partial<DataScopeContext> }>,
): RepositoryContext {
  return {
    ...context,
    correlationId: context.request.correlationId,
    dataScope: {
      branchId: context.branchId,
      companyId: context.companyId,
      departmentId: context.departmentId,
      employeeId: context.employeeId,
      ownershipScope: context.dataScope?.ownershipScope ?? "tenant",
      principalId: context.principal?.id,
      teamId: context.teamId,
      tenantId: context.tenantId,
      ...context.dataScope,
    },
  };
}

export type RlsOperation = "select" | "insert" | "update" | "delete";

export type RlsPolicyTemplate = Readonly<{
  tableName: string;
  ownershipScope: DataOwnershipScope;
  operations: readonly RlsOperation[];
  usingExpression: string;
  withCheckExpression?: string;
  includeSoftDeletedFilter?: boolean;
  includeArchivedFilter?: boolean;
  permissionAware?: boolean;
}>;

export function defineRlsPolicyTemplate<TTemplate extends RlsPolicyTemplate>(
  template: TTemplate,
): TTemplate {
  return template;
}

export function createRlsPolicyName(params: {
  tableName: string;
  operation: RlsOperation;
  scope: DataOwnershipScope;
}): string {
  return `${params.tableName}_${params.operation}_${params.scope}`;
}

export function createOwnershipRlsTemplate(params: {
  tableName: string;
  ownershipScope: Exclude<DataOwnershipScope, "global">;
  operations?: readonly RlsOperation[];
  includeSoftDeletedFilter?: boolean;
  includeArchivedFilter?: boolean;
}): RlsPolicyTemplate {
  const scopeChecks = {
    branch: "tenant_id = any(current_tenant_ids()) and branch_id = any(current_branch_ids())",
    company: "tenant_id = any(current_tenant_ids()) and company_id = any(current_company_ids())",
    department: "tenant_id = any(current_tenant_ids()) and department_id = any(current_department_ids())",
    employee: "tenant_id = any(current_tenant_ids()) and employee_id = current_employee_id()",
    self: "tenant_id = any(current_tenant_ids()) and principal_id = current_principal_id()",
    team: "tenant_id = any(current_tenant_ids()) and team_id = any(current_team_ids())",
    tenant: "tenant_id = any(current_tenant_ids())",
  } satisfies Record<Exclude<DataOwnershipScope, "global">, string>;
  const lifecycleChecks = [
    params.includeSoftDeletedFilter ? "deleted_at is null" : undefined,
    params.includeArchivedFilter ? "archived_at is null" : undefined,
  ].filter(Boolean);
  const usingExpression = [scopeChecks[params.ownershipScope], ...lifecycleChecks].join(" and ");

  return defineRlsPolicyTemplate({
    includeArchivedFilter: params.includeArchivedFilter,
    includeSoftDeletedFilter: params.includeSoftDeletedFilter,
    operations: params.operations ?? ["select", "insert", "update"],
    ownershipScope: params.ownershipScope,
    tableName: params.tableName,
    usingExpression,
    withCheckExpression: scopeChecks[params.ownershipScope],
  });
}

export type RlsRecordFixture = Readonly<{
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  employeeId?: string | null;
  principalId?: string | null;
  deletedAt?: string | null;
  archivedAt?: string | null;
}>;

export type RlsHarnessScenario = Readonly<{
  key: string;
  operation: RlsOperation;
  ownershipScope: DataOwnershipScope;
  context: DataScopeContext;
  record: RlsRecordFixture;
  expected: "allowed" | "denied";
}>;

function matchesNullableScope(expected: string | null | undefined, actual: string | null | undefined): boolean {
  return Boolean(expected) && expected === actual;
}

export function evaluateRlsScenario(scenario: RlsHarnessScenario): "allowed" | "denied" {
  const { context, record } = scenario;

  if (record.deletedAt || record.archivedAt) {
    return "denied";
  }

  const allowed = {
    branch:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.branchId, record.branchId),
    company:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.companyId, record.companyId),
    department:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.departmentId, record.departmentId),
    employee:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.employeeId, record.employeeId),
    global: true,
    self:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.principalId, record.principalId),
    team:
      matchesNullableScope(context.tenantId, record.tenantId) &&
      matchesNullableScope(context.teamId, record.teamId),
    tenant: matchesNullableScope(context.tenantId, record.tenantId),
  } satisfies Record<DataOwnershipScope, boolean>;

  return allowed[scenario.ownershipScope] ? "allowed" : "denied";
}

export function defineRlsHarnessScenario<TScenario extends RlsHarnessScenario>(
  scenario: TScenario,
): TScenario {
  return scenario;
}

export const DEFAULT_QUERY_LIMIT = 50;
export const MAX_QUERY_LIMIT = 200;

export type SortDirection = "asc" | "desc";
export type FilterOperator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in"
  | "contains"
  | "startsWith"
  | "isNull"
  | "notNull";

export type ServerSort = Readonly<{
  field: string;
  direction: SortDirection;
  nulls?: "first" | "last";
}>;

export type ServerFilter = Readonly<{
  field: string;
  operator: FilterOperator;
  value?: string | number | boolean | readonly (string | number | boolean)[];
}>;

export type PaginatedQuery = Readonly<{
  pageSize?: number;
  cursor?: string | null;
  search?: string | null;
  filters?: readonly ServerFilter[];
  sort?: readonly ServerSort[];
}>;

export type NormalizedQuery = Readonly<{
  pageSize: number;
  cursor: string | null;
  search: string | null;
  filters: readonly ServerFilter[];
  sort: readonly ServerSort[];
}>;

export type CursorPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  pageSize: number;
  nextCursor: string | null;
}>;

export type IndexExpectation = Readonly<{
  tableName: string;
  columns: readonly string[];
  reason: "rls" | "list" | "search" | "sort" | "foreign-key" | "unique-scope";
  required: boolean;
}>;

export function normalizeSearchInput(search?: string | null): string | null {
  const normalized = search?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function clampQueryLimit(
  requested?: number,
  max = MAX_QUERY_LIMIT,
): number {
  if (!requested || requested < 1) {
    return DEFAULT_QUERY_LIMIT;
  }

  return Math.min(Math.floor(requested), max);
}

export function normalizePaginatedQuery(query: PaginatedQuery): NormalizedQuery {
  return {
    cursor: query.cursor ?? null,
    filters: query.filters ?? [],
    pageSize: clampQueryLimit(query.pageSize),
    search: normalizeSearchInput(query.search),
    sort: query.sort ?? [],
  };
}

export function createCursorPage<TRecord>(params: {
  records: readonly TRecord[];
  pageSize: number;
  nextCursor?: string | null;
}): CursorPage<TRecord> {
  return {
    nextCursor: params.nextCursor ?? null,
    pageSize: params.pageSize,
    records: params.records,
  };
}

export type LifecycleFields = Readonly<{
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  version: number;
}>;

export type LifecycleColumn = keyof LifecycleFields;

export const LIFECYCLE_COLUMNS = [
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "deleted_at",
  "deleted_by",
  "archived_at",
  "archived_by",
  "version",
] as const;

export type MigrationPolicy = Readonly<{
  ownershipScope: DataOwnershipScope;
  requiresRls: boolean;
  requiresRollbackPlan: boolean;
  requiresBackfillPlan: boolean;
  requiresIndexReview: boolean;
  requiresRlsTests: boolean;
  requiredColumns: readonly string[];
  requiredIndexes: readonly IndexExpectation[];
  immutableColumns: readonly string[];
}>;

export type MigrationDefinition = Readonly<{
  tableName: string;
  ownershipScope: DataOwnershipScope;
  columns: readonly string[];
  indexes: readonly IndexExpectation[];
  enablesRls: boolean;
  hasRollbackPlan: boolean;
  hasBackfillPlan?: boolean;
  hasRlsTests: boolean;
  immutableColumns?: readonly string[];
}>;

export function createMigrationPolicy(
  ownershipScope: DataOwnershipScope,
  tableName: string,
): MigrationPolicy {
  const requiredColumns = DATA_OWNERSHIP_MODEL[ownershipScope].requiredColumns;
  const requiredIndexes = requiredColumns.map((column) => ({
    columns: [column],
    reason: "rls" as const,
    required: true,
    tableName,
  }));

  return {
    immutableColumns: requiredColumns.filter((column) =>
      ["tenant_id", "company_id", "branch_id"].includes(column),
    ),
    ownershipScope,
    requiredColumns,
    requiredIndexes,
    requiresBackfillPlan: ownershipScope !== "global",
    requiresIndexReview: ownershipScope !== "global",
    requiresRollbackPlan: true,
    requiresRls: ownershipScope !== "global",
    requiresRlsTests: ownershipScope !== "global",
  };
}

export function validateMigrationDefinition(
  definition: MigrationDefinition,
): readonly string[] {
  const policy = createMigrationPolicy(definition.ownershipScope, definition.tableName);
  const missingColumns = policy.requiredColumns.filter(
    (column) => !definition.columns.includes(column),
  );
  const missingImmutableColumns = policy.immutableColumns.filter(
    (column) => !(definition.immutableColumns ?? []).includes(column),
  );
  const missingIndexes = policy.requiredIndexes.filter(
    (expectation) =>
      !definition.indexes.some((index) =>
        expectation.columns.every((column) => index.columns.includes(column)),
      ),
  );

  return [
    ...missingColumns.map((column) => `Missing required column: ${column}`),
    ...missingImmutableColumns.map((column) => `Missing immutable guard: ${column}`),
    ...missingIndexes.map((index) => `Missing required index for: ${index.columns.join(",")}`),
    policy.requiresRls && !definition.enablesRls ? "RLS must be enabled." : undefined,
    policy.requiresRollbackPlan && !definition.hasRollbackPlan ? "Rollback plan is required." : undefined,
    policy.requiresBackfillPlan && definition.hasBackfillPlan === false
      ? "Backfill plan is required for scoped tables."
      : undefined,
    policy.requiresRlsTests && !definition.hasRlsTests ? "RLS tests are required." : undefined,
  ].filter((message): message is string => Boolean(message));
}
