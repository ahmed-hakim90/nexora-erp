import type { AppManifest } from "@/platform/app-registry/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import {
  createInMemoryPermissionResolverSource,
  defineDataScope,
  definePermission,
  defineSecurityMetadata,
  type DataScope,
  type Permission,
  type PermissionResolverSource,
  type Role,
  type RoleAssignment,
} from "@/platform/security/public-api";

export const ADMINISTRATION_APP_KEY = "administration";

export const ADMIN_USER_STATUSES = ["invited", "active", "suspended", "disabled", "archived"] as const;
export const ADMIN_INVITATION_STATUSES = ["pending", "accepted", "expired", "revoked"] as const;
export const ADMIN_ROLE_TYPES = ["system", "tenant", "company", "branch", "app"] as const;
export const ADMIN_ROLE_STATUSES = ["active", "disabled", "archived"] as const;
export const ADMIN_DATA_SCOPE_KINDS = ["own", "branch", "company", "tenant", "all"] as const;
export const ADMIN_PERMISSION_MATRIX_ACTIONS = [
  "view",
  "create",
  "edit",
  "archive",
  "delete",
  "submit",
  "approve",
  "export",
  "import",
  "print",
  "manage-settings",
  "audit",
] as const;

export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];
export type AdminInvitationStatus = (typeof ADMIN_INVITATION_STATUSES)[number];
export type AdminRoleType = (typeof ADMIN_ROLE_TYPES)[number];
export type AdminRoleStatus = (typeof ADMIN_ROLE_STATUSES)[number];
export type AdminDataScopeKind = (typeof ADMIN_DATA_SCOPE_KINDS)[number];
export type AdminPermissionMatrixAction = (typeof ADMIN_PERMISSION_MATRIX_ACTIONS)[number];

export type AdminAuditEventType =
  | "user.invited"
  | "user.updated"
  | "user.activated"
  | "user.suspended"
  | "role.created"
  | "role.updated"
  | "permission.changed"
  | "company-access.changed"
  | "branch-access.changed"
  | "app-access.changed";

export type AdminUser = Readonly<{
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: AdminUserStatus;
  jobTitle?: string | null;
  department?: string | null;
  defaultCompanyId?: string | null;
  defaultBranchId?: string | null;
  language: string;
  timezone: string;
  avatarUrl?: string | null;
  notes?: string | null;
  lastLoginAt?: string | null;
  roles: readonly string[];
  companyAccess: CompanyAccessAssignment;
  branchAccess: readonly BranchAccessAssignment[];
  allowedApps: readonly string[];
  dataScope: AdminDataScopeKind;
}>;

export type AdminInvitation = Readonly<{
  id: string;
  email: string;
  roleKey: string;
  companyIds: readonly string[];
  branchIds: readonly string[];
  allowedApps: readonly string[];
  expiresAt: string;
  invitedBy: string;
  status: AdminInvitationStatus;
}>;

export type AdminRole = Readonly<{
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type: AdminRoleType;
  scope: AdminDataScopeKind;
  status: AdminRoleStatus;
  permissionKeys: readonly PermissionKey[];
  isSystem: boolean;
}>;

export type CompanyAccessAssignment = Readonly<{
  mode: "all" | "specific";
  companyIds: readonly string[];
}>;

export type BranchAccessAssignment = Readonly<{
  companyId: string;
  mode: "all" | "specific";
  branchIds: readonly string[];
}>;

export type AdminAccessRecord = Readonly<{
  userId: string;
  tenantId: string;
  companyAccess: CompanyAccessAssignment;
  branchAccess: readonly BranchAccessAssignment[];
  allowedApps: readonly string[];
  dataScope: AdminDataScopeKind;
}>;

export type PermissionMatrixRow = Readonly<{
  key: string;
  app: string;
  module: string;
  entity: string;
  actions: Readonly<Record<AdminPermissionMatrixAction, PermissionKey | null>>;
}>;

export type AdminAuditEvent = Readonly<{
  action: AdminAuditEventType;
  actorUserId: string;
  subjectType: "user" | "role" | "permission" | "access" | "invitation";
  subjectId: string;
  subjectDisplay: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type AdminGrantValidation = Readonly<{
  allowed: boolean;
  missingPermissions: readonly PermissionKey[];
}>;

export type AdminAppAccessSummary = Readonly<{
  appKey: string;
  name: string;
  visible: boolean;
  reason: "allowed" | "not-assigned" | "missing-permission" | "planned-or-disabled";
}>;

export type RoleTemplate = Readonly<{
  key: string;
  name: string;
  description: string;
  type: AdminRoleType;
  scope: AdminDataScopeKind;
  permissionKeys: readonly PermissionKey[];
  editableAfterCreation: boolean;
}>;

const BASE_ERP_PERMISSION = "platform.erp.access" as PermissionKey;
const READ_USERS_PERMISSION = "platform.user.read" as PermissionKey;
const MANAGE_USERS_PERMISSION = "platform.user.manage" as PermissionKey;
const MANAGE_ROLES_PERMISSION = "platform.role.manage" as PermissionKey;
const READ_PERMISSIONS_PERMISSION = "platform.permission.read" as PermissionKey;
const READ_AUDIT_PERMISSION = "platform.audit.read" as PermissionKey;
const MANAGE_MEMBERSHIPS_PERMISSION = "platform.membership.manage" as PermissionKey;
const MANAGE_TENANT_PERMISSION = "platform.tenant.manage" as PermissionKey;
const MANAGE_BRANCH_PERMISSION = "platform.branch.manage" as PermissionKey;

export const ADMINISTRATION_PERMISSION_KEYS = [
  BASE_ERP_PERMISSION,
  READ_USERS_PERMISSION,
  MANAGE_USERS_PERMISSION,
  MANAGE_ROLES_PERMISSION,
  READ_PERMISSIONS_PERMISSION,
  READ_AUDIT_PERMISSION,
  MANAGE_MEMBERSHIPS_PERMISSION,
  MANAGE_TENANT_PERMISSION,
  MANAGE_BRANCH_PERMISSION,
] as const;

export const ADMINISTRATION_APP_OPTIONS = [
  { appKey: "finance", name: "Finance", planned: false },
  { appKey: "inventory", name: "Inventory", planned: false },
  { appKey: "manufacturing", name: "Manufacturing", planned: false },
  { appKey: "reports", name: "Reports", planned: false },
  { appKey: "dashboards", name: "Dashboards", planned: false },
  { appKey: "settings", name: "Settings", planned: false },
  { appKey: ADMINISTRATION_APP_KEY, name: "Administration", planned: false },
] as const;

export const DEFAULT_ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    description: "Full tenant administration across users, roles, access, apps, audit, and business app permissions.",
    editableAfterCreation: false,
    key: "super-admin",
    name: "Super Admin",
    permissionKeys: ADMINISTRATION_PERMISSION_KEYS,
    scope: "all",
    type: "system",
  },
  {
    description: "Tenant-wide administration without unsafe system-only removal semantics.",
    editableAfterCreation: true,
    key: "tenant-admin",
    name: "Tenant Admin",
    permissionKeys: ADMINISTRATION_PERMISSION_KEYS,
    scope: "tenant",
    type: "tenant",
  },
  {
    description: "Company scoped administration for users, branches, and app access inside assigned companies.",
    editableAfterCreation: true,
    key: "company-admin",
    name: "Company Admin",
    permissionKeys: [BASE_ERP_PERMISSION, READ_USERS_PERMISSION, MANAGE_USERS_PERMISSION, MANAGE_BRANCH_PERMISSION],
    scope: "company",
    type: "company",
  },
  {
    description: "Finance definitions and finance reporting access for assigned companies.",
    editableAfterCreation: true,
    key: "finance-manager",
    name: "Finance Manager",
    permissionKeys: [BASE_ERP_PERMISSION, "finance.app.access" as PermissionKey, "finance.coa.view" as PermissionKey, "finance.coa.manage" as PermissionKey],
    scope: "company",
    type: "app",
  },
  {
    description: "Inventory product, warehouse, stock, import, and export access.",
    editableAfterCreation: true,
    key: "inventory-manager",
    name: "Inventory Manager",
    permissionKeys: [BASE_ERP_PERMISSION, "inventory.app.access" as PermissionKey, "inventory.products.view" as PermissionKey, "inventory.products.manage" as PermissionKey],
    scope: "company",
    type: "app",
  },
  {
    description: "Manufacturing master data, execution, and approval access for assigned plants or branches.",
    editableAfterCreation: true,
    key: "manufacturing-manager",
    name: "Manufacturing Manager",
    permissionKeys: [BASE_ERP_PERMISSION, "manufacturing.app.access" as PermissionKey, "manufacturing.view" as PermissionKey, "manufacturing.daily-reports.manage" as PermissionKey],
    scope: "company",
    type: "app",
  },
  {
    description: "Production supervision for branch or line-scoped daily production records.",
    editableAfterCreation: true,
    key: "production-supervisor",
    name: "Production Supervisor",
    permissionKeys: [BASE_ERP_PERMISSION, "manufacturing.view" as PermissionKey, "manufacturing.daily-reports.view" as PermissionKey, "manufacturing.daily-reports.manage" as PermissionKey],
    scope: "branch",
    type: "branch",
  },
  {
    description: "Production worker with own or branch execution visibility only.",
    editableAfterCreation: true,
    key: "production-worker",
    name: "Production Worker",
    permissionKeys: [BASE_ERP_PERMISSION, "manufacturing.view" as PermissionKey, "manufacturing.daily-reports.view" as PermissionKey],
    scope: "own",
    type: "branch",
  },
  {
    description: "Read-only user for assigned apps and scopes.",
    editableAfterCreation: true,
    key: "read-only-viewer",
    name: "Read Only Viewer",
    permissionKeys: [BASE_ERP_PERMISSION],
    scope: "branch",
    type: "tenant",
  },
];

function normalizeMatrixAction(action: string): AdminPermissionMatrixAction | null {
  if (action === "update" || action === "manage") {
    return "edit";
  }

  if (action === "archive" || action === "delete") {
    return action;
  }

  return ADMIN_PERMISSION_MATRIX_ACTIONS.find((candidate) => candidate === action) ?? null;
}

export function parsePermissionKey(permission: PermissionKey): {
  app: string;
  module: string;
  entity: string;
  action: AdminPermissionMatrixAction | null;
} {
  const parts = String(permission).split(".");
  const app = parts[0] ?? "platform";
  const action = normalizeMatrixAction(parts.at(-1) ?? "view");
  const moduleKey = parts.length > 3 ? parts[1] ?? app : app;
  const entityParts = parts.slice(parts.length > 3 ? 2 : 1, -1);
  const entity = entityParts.length ? entityParts.join(" / ") : moduleKey;

  return { action, app, entity, module: moduleKey };
}

export function buildPermissionMatrix(permissionKeys: readonly PermissionKey[]): readonly PermissionMatrixRow[] {
  const rows = new Map<string, PermissionMatrixRow>();

  for (const permissionKey of permissionKeys) {
    const parsed = parsePermissionKey(permissionKey);
    if (!parsed.action) {
      continue;
    }

    const rowKey = `${parsed.app}:${parsed.module}:${parsed.entity}`;
    const existing = rows.get(rowKey);
    const actions =
      existing?.actions ??
      Object.fromEntries(ADMIN_PERMISSION_MATRIX_ACTIONS.map((action) => [action, null])) as Record<AdminPermissionMatrixAction, PermissionKey | null>;

    rows.set(rowKey, {
      actions: {
        ...actions,
        [parsed.action]: permissionKey,
      },
      app: parsed.app,
      entity: parsed.entity,
      key: rowKey,
      module: parsed.module,
    });
  }

  return [...rows.values()].sort((left, right) =>
    `${left.app}.${left.module}.${left.entity}`.localeCompare(`${right.app}.${right.module}.${right.entity}`),
  );
}

export function validateGrantablePermissions(
  actorPermissionKeys: ReadonlySet<PermissionKey> | readonly PermissionKey[],
  requestedPermissionKeys: readonly PermissionKey[],
): AdminGrantValidation {
  const actorPermissions = actorPermissionKeys instanceof Set ? actorPermissionKeys : new Set(actorPermissionKeys);
  const missingPermissions = requestedPermissionKeys.filter((permissionKey) => !actorPermissions.has(permissionKey));

  return {
    allowed: missingPermissions.length === 0,
    missingPermissions,
  };
}

export function canChangeOwnSuperAdminAssignment(params: {
  actorUserId: string;
  targetUserId: string;
  removedRoleKeys: readonly string[];
  confirmed: boolean;
}): boolean {
  if (params.actorUserId !== params.targetUserId) {
    return true;
  }

  if (!params.removedRoleKeys.includes("super-admin")) {
    return true;
  }

  return params.confirmed;
}

export function isDangerousPermissionChange(permissionKeys: readonly PermissionKey[]): boolean {
  return permissionKeys.some((permissionKey) =>
    String(permissionKey).startsWith("platform.")
    || String(permissionKey).endsWith(".manage")
    || String(permissionKey).endsWith(".approve")
    || String(permissionKey).includes(".audit"),
  );
}

export function summarizeAppAccess(
  manifests: readonly AppManifest[],
  assignedAppKeys: readonly string[],
  grantedPermissionKeys: ReadonlySet<PermissionKey> | readonly PermissionKey[],
): readonly AdminAppAccessSummary[] {
  const assignedApps = new Set(assignedAppKeys);
  const grantedPermissions = grantedPermissionKeys instanceof Set ? grantedPermissionKeys : new Set(grantedPermissionKeys);

  return ADMINISTRATION_APP_OPTIONS.map((option) => {
    if (option.planned) {
      return { appKey: option.appKey, name: option.name, reason: "planned-or-disabled", visible: false };
    }

    const manifest = manifests.find((candidate) => candidate.key === option.appKey);
    const manifestPermissions = manifest?.permissions ?? [];
    const hasManifestPermissions = manifestPermissions.length === 0
      || manifestPermissions.every((permissionKey) => grantedPermissions.has(permissionKey));

    if (!assignedApps.has(option.appKey)) {
      return { appKey: option.appKey, name: option.name, reason: "not-assigned", visible: false };
    }

    if (!hasManifestPermissions) {
      return { appKey: option.appKey, name: option.name, reason: "missing-permission", visible: false };
    }

    return { appKey: option.appKey, name: option.name, reason: "allowed", visible: true };
  });
}

export function dataScopeAllowsRecord(
  scope: AdminAccessRecord,
  record: { ownerUserId?: string | null; tenantId: string; companyId?: string | null; branchId?: string | null },
): boolean {
  if (scope.tenantId !== record.tenantId) {
    return false;
  }

  if (scope.dataScope === "all" || scope.dataScope === "tenant") {
    return true;
  }

  if (scope.dataScope === "own") {
    return record.ownerUserId === scope.userId;
  }

  const companyAllowed =
    scope.companyAccess.mode === "all"
    || (record.companyId ? scope.companyAccess.companyIds.includes(record.companyId) : false);

  if (scope.dataScope === "company") {
    return companyAllowed;
  }

  const recordBranchId = record.branchId;
  const recordCompanyId = record.companyId;

  if (!recordBranchId || !recordCompanyId) {
    return false;
  }

  return scope.branchAccess.some((assignment) =>
    assignment.companyId === recordCompanyId
    && (assignment.mode === "all" || assignment.branchIds.includes(recordBranchId)),
  );
}

export function createAdminAuditEvent(params: AdminAuditEvent): AdminAuditEvent {
  return {
    ...params,
    metadata: {
      ...params.metadata,
      auditedByAdministration: true,
    },
  };
}

export function getInvitationStatus(invitation: Pick<AdminInvitation, "expiresAt" | "status">, now = new Date().toISOString()): AdminInvitationStatus {
  if (invitation.status !== "pending") {
    return invitation.status;
  }

  return invitation.expiresAt < now ? "expired" : "pending";
}

export function toEnterpriseDataScope(scope: AdminAccessRecord): DataScope {
  if (scope.dataScope === "all" || scope.dataScope === "tenant") {
    return defineDataScope({
      kind: "tenant",
      tenantId: scope.tenantId,
      unrestricted: scope.dataScope === "all",
    });
  }

  if (scope.dataScope === "company") {
    return defineDataScope({
      companyIds: scope.companyAccess.mode === "all" ? [] : scope.companyAccess.companyIds,
      kind: "company",
      tenantId: scope.tenantId,
    });
  }

  if (scope.dataScope === "branch") {
    return defineDataScope({
      branchIds: scope.branchAccess.flatMap((assignment) => assignment.mode === "all" ? [] : assignment.branchIds),
      companyIds: scope.companyAccess.mode === "all" ? [] : scope.companyAccess.companyIds,
      kind: "branch",
      tenantId: scope.tenantId,
    });
  }

  return defineDataScope({
    kind: "self",
    selfUserId: scope.userId,
    tenantId: scope.tenantId,
  });
}

export function createAdministrationResolverSource(params: {
  tenantId: string;
  permissionKeys: readonly PermissionKey[];
  role: AdminRole;
  access: AdminAccessRecord;
}): PermissionResolverSource {
  const permissions: readonly Permission[] = params.permissionKeys.map((permissionKey) => {
    const parsed = parsePermissionKey(permissionKey);

    return definePermission({
      action: parsed.action === "create" ? "create" : parsed.action === "archive" ? "archive" : parsed.action === "approve" ? "approve" : parsed.action === "print" ? "print" : parsed.action === "export" ? "export" : parsed.action === "import" ? "import" : parsed.action === "delete" ? "delete" : "view",
      categoryKey: parsed.app,
      description: `${permissionKey} administration permission.`,
      experiences: ["erp"],
      groupKey: parsed.module,
      key: permissionKey,
      label: permissionKey,
      metadata: defineSecurityMetadata({
        auditRequired: String(permissionKey).includes(".audit"),
        dataScopeRequired: true,
        riskLevel: isDangerousPermissionChange([permissionKey]) ? "critical" : "standard",
        sensitiveData: String(permissionKey).startsWith("platform."),
      }),
      ownerKey: parsed.app,
      resource: parsed.entity,
    });
  });
  const role: Role = {
    description: params.role.description ?? undefined,
    isAssignable: !params.role.isSystem,
    isSystemRole: params.role.isSystem,
    key: params.role.key,
    label: params.role.name,
    permissionKeys: params.role.permissionKeys,
    tenantId: params.tenantId,
    type: params.role.isSystem ? "system" : "custom",
  };
  const roleAssignments: readonly RoleAssignment[] = [
    {
      role,
      scope: toEnterpriseDataScope(params.access),
    },
  ];

  return createInMemoryPermissionResolverSource({
    dataScopes: [toEnterpriseDataScope(params.access)],
    permissions,
    roleAssignments,
  });
}
