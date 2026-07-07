import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { PLATFORM_PERMISSIONS, type PermissionKey } from "@/platform/permissions/public-api";

import {
  ADMINISTRATION_APP_OPTIONS,
  DEFAULT_ROLE_TEMPLATES,
  getInvitationStatus,
  type AdminDataScopeKind,
  type AdminInvitation,
  type AdminRole,
  type AdminUser,
  type AdminUserStatus,
  type BranchAccessAssignment,
  type CompanyAccessAssignment,
} from "./model";

export type AdminCompanyOption = Readonly<{ id: string; name: string; code: string }>;
export type AdminBranchOption = Readonly<{ id: string; name: string; code: string }>;

export type AdministrationWorkspaceData = Readonly<{
  users: readonly AdminUser[];
  invitations: readonly AdminInvitation[];
  roles: readonly AdminRole[];
  permissions: readonly { id: string; key: PermissionKey; label: string; description?: string | null; riskLevel: string }[];
  companies: readonly AdminCompanyOption[];
  branches: readonly AdminBranchOption[];
  auditEvents: readonly { id: string; action: string; subjectType: string; subjectId?: string | null; subjectDisplay?: string | null; occurredAt: string }[];
  roleTemplates: typeof DEFAULT_ROLE_TEMPLATES;
  appOptions: typeof ADMINISTRATION_APP_OPTIONS;
  errorMessage?: string;
}>;

type Row = Record<string, unknown>;

export function formatAdministrationDataError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return fallback;
}

function stringValue(row: Row, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function nullableString(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function stringArray(row: Row, key: string): readonly string[] {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function emptyData(errorMessage?: string): AdministrationWorkspaceData {
  return {
    appOptions: ADMINISTRATION_APP_OPTIONS,
    auditEvents: [],
    branches: [],
    companies: [],
    errorMessage,
    invitations: [],
    permissions: [],
    roleTemplates: DEFAULT_ROLE_TEMPLATES,
    roles: [],
    users: [],
  };
}

function mapCompanyAccess(rows: readonly Row[], userId: string): CompanyAccessAssignment {
  const userRows = rows.filter((row) => stringValue(row, "user_id") === userId);
  if (userRows.some((row) => row.all_companies === true)) {
    return { companyIds: [], mode: "all" };
  }

  return {
    companyIds: userRows.map((row) => stringValue(row, "company_id")).filter(Boolean),
    mode: "specific",
  };
}

function mapBranchAccess(rows: readonly Row[], userId: string): readonly BranchAccessAssignment[] {
  const byCompany = new Map<string, { all: boolean; branchIds: string[] }>();

  for (const row of rows.filter((candidate) => stringValue(candidate, "user_id") === userId)) {
    const companyId = stringValue(row, "company_id");
    if (!companyId) continue;
    const existing = byCompany.get(companyId) ?? { all: false, branchIds: [] };
    if (row.all_branches === true) {
      existing.all = true;
    }
    const branchId = stringValue(row, "branch_id");
    if (branchId) {
      existing.branchIds.push(branchId);
    }
    byCompany.set(companyId, existing);
  }

  return [...byCompany.entries()].map(([companyId, value]) => ({
    branchIds: value.all ? [] : value.branchIds,
    companyId,
    mode: value.all ? "all" : "specific",
  }));
}

function mapUser(row: Row, params: {
  userRoles: readonly Row[];
  roles: readonly Row[];
  companyAccess: readonly Row[];
  branchAccess: readonly Row[];
  appAccess: readonly Row[];
  dataScopes: readonly Row[];
}): AdminUser {
  const userId = stringValue(row, "id");
  const roleIds = params.userRoles
    .filter((assignment) => stringValue(assignment, "user_id") === userId)
    .map((assignment) => stringValue(assignment, "role_id"));
  const roles = params.roles
    .filter((role) => roleIds.includes(stringValue(role, "id")))
    .map((role) => stringValue(role, "role_key"));
  const dataScope = params.dataScopes.find((scope) => stringValue(scope, "user_id") === userId);

  return {
    allowedApps: params.appAccess
      .filter((access) => stringValue(access, "user_id") === userId && access.is_enabled !== false)
      .map((access) => stringValue(access, "app_key")),
    avatarUrl: nullableString(row, "avatar_url"),
    branchAccess: mapBranchAccess(params.branchAccess, userId),
    companyAccess: mapCompanyAccess(params.companyAccess, userId),
    dataScope: stringValue(dataScope ?? {}, "scope_kind", "branch") as AdminDataScopeKind,
    defaultBranchId: nullableString(row, "default_branch_id"),
    defaultCompanyId: nullableString(row, "default_company_id"),
    department: nullableString(row, "department"),
    email: stringValue(row, "email"),
    id: userId,
    jobTitle: nullableString(row, "job_title"),
    language: stringValue(row, "default_locale", "en"),
    lastLoginAt: nullableString(row, "last_login_at"),
    name: stringValue(row, "display_name", stringValue(row, "email", "Unnamed user")),
    notes: nullableString(row, "notes"),
    phone: nullableString(row, "phone"),
    roles,
    status: stringValue(row, "admin_status", row.is_active === false ? "disabled" : "active") as AdminUserStatus,
    timezone: stringValue(row, "default_timezone", "UTC"),
  };
}

function mapRole(row: Row, permissionRows: readonly Row[], rolePermissionRows: readonly Row[]): AdminRole {
  const roleId = stringValue(row, "id");
  const permissionIds = rolePermissionRows
    .filter((assignment) => stringValue(assignment, "role_id") === roleId)
    .map((assignment) => stringValue(assignment, "permission_id"));

  return {
    description: nullableString(row, "description"),
    id: roleId,
    isSystem: row.is_system === true,
    key: stringValue(row, "role_key"),
    name: stringValue(row, "name"),
    permissionKeys: permissionRows
      .filter((permission) => permissionIds.includes(stringValue(permission, "id")))
      .map((permission) => stringValue(permission, "permission_key") as PermissionKey),
    scope: stringValue(row, "data_scope_kind", "tenant") as AdminDataScopeKind,
    status: stringValue(row, "status", row.is_active === false ? "disabled" : "active") as AdminRole["status"],
    type: stringValue(row, "admin_role_type", row.is_system === true ? "system" : "tenant") as AdminRole["type"],
  };
}

export async function loadAdministrationWorkspace(): Promise<AdministrationWorkspaceData> {
  let context;

  try {
    context = await resolveTenantRequestContext("erp");
    await requirePermission({ context, permission: PLATFORM_PERMISSIONS.accessAdmin });
  } catch (error) {
    return emptyData(formatAdministrationDataError(error, "Administration context could not be resolved."));
  }

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  try {
    const [
      profilesResult,
      membershipsResult,
      rolesResult,
      permissionsResult,
      rolePermissionsResult,
      userRolesResult,
      invitationsResult,
      companiesResult,
      branchesResult,
      companyAccessResult,
      branchAccessResult,
      appAccessResult,
      dataScopesResult,
      auditResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("display_name", { ascending: true }),
      supabase.from("tenant_memberships").select("*").eq("tenant_id", context.tenantId),
      supabase.from("roles").select("*").or(`tenant_id.eq.${context.tenantId},role_scope.eq.template`).order("name", { ascending: true }),
      supabase.from("permissions").select("*").order("permission_key", { ascending: true }),
      supabase.from("role_permissions").select("*").or(`tenant_id.eq.${context.tenantId},tenant_id.is.null`),
      supabase.from("user_roles").select("*").eq("tenant_id", context.tenantId),
      supabase.from("user_invitations").select("*").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }),
      supabase.from("companies").select("id, code, name").eq("tenant_id", context.tenantId).order("name", { ascending: true }),
      supabase.from("branches").select("id, code, name").eq("tenant_id", context.tenantId).order("name", { ascending: true }),
      supabase.from("user_company_access").select("*").eq("tenant_id", context.tenantId),
      supabase.from("user_branch_access").select("*").eq("tenant_id", context.tenantId),
      supabase.from("user_app_access").select("*").eq("tenant_id", context.tenantId),
      supabase.from("user_data_scopes").select("*").eq("tenant_id", context.tenantId),
      supabase
        .from("audit_events")
        .select("id, action, subject_type, subject_id, subject_display, occurred_at")
        .eq("tenant_id", context.tenantId)
        .in("category", ["security", "permission", "entitlement", "data-access"])
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

    const firstError = [
      profilesResult.error,
      membershipsResult.error,
      rolesResult.error,
      permissionsResult.error,
      rolePermissionsResult.error,
      userRolesResult.error,
      invitationsResult.error,
      companiesResult.error,
      branchesResult.error,
      companyAccessResult.error,
      branchAccessResult.error,
      appAccessResult.error,
      dataScopesResult.error,
      auditResult.error,
    ].find(Boolean);

    if (firstError) {
      return emptyData(formatAdministrationDataError(firstError, "Administration data could not be loaded."));
    }

    const memberships = (membershipsResult.data ?? []) as Row[];
    const tenantUserIds = new Set(memberships.map((membership) => stringValue(membership, "user_id")));
    const profiles = ((profilesResult.data ?? []) as Row[]).filter((profile) => tenantUserIds.has(stringValue(profile, "id")));
    const roles = (rolesResult.data ?? []) as Row[];
    const permissions = (permissionsResult.data ?? []) as Row[];
    const rolePermissions = (rolePermissionsResult.data ?? []) as Row[];

    return {
      appOptions: ADMINISTRATION_APP_OPTIONS,
      auditEvents: ((auditResult.data ?? []) as Row[]).map((row) => ({
        action: stringValue(row, "action"),
        id: stringValue(row, "id"),
        occurredAt: stringValue(row, "occurred_at"),
        subjectDisplay: nullableString(row, "subject_display"),
        subjectId: nullableString(row, "subject_id"),
        subjectType: stringValue(row, "subject_type"),
      })),
      branches: ((branchesResult.data ?? []) as Row[]).map((row) => ({
        code: stringValue(row, "code"),
        id: stringValue(row, "id"),
        name: stringValue(row, "name"),
      })),
      companies: ((companiesResult.data ?? []) as Row[]).map((row) => ({
        code: stringValue(row, "code"),
        id: stringValue(row, "id"),
        name: stringValue(row, "name"),
      })),
      invitations: ((invitationsResult.data ?? []) as Row[]).map((row) => ({
        allowedApps: stringArray(row, "allowed_app_keys"),
        branchIds: stringArray(row, "branch_ids"),
        companyIds: stringArray(row, "company_ids"),
        email: stringValue(row, "email"),
        expiresAt: stringValue(row, "expires_at"),
        id: stringValue(row, "id"),
        invitedBy: stringValue(row, "invited_by"),
        roleKey: roles.find((role) => stringValue(role, "id") === stringValue(row, "role_id"))?.role_key as string ?? "unassigned",
        status: getInvitationStatus({
          expiresAt: stringValue(row, "expires_at"),
          status: stringValue(row, "status", "pending") as AdminInvitation["status"],
        }),
      })),
      permissions: permissions.map((row) => ({
        description: nullableString(row, "description"),
        id: stringValue(row, "id"),
        key: stringValue(row, "permission_key") as PermissionKey,
        label: stringValue(row, "label", stringValue(row, "permission_key")),
        riskLevel: stringValue(row, "risk_level", "standard"),
      })),
      roleTemplates: DEFAULT_ROLE_TEMPLATES,
      roles: roles.map((row) => mapRole(row, permissions, rolePermissions)),
      users: profiles.map((row) =>
        mapUser(row, {
          appAccess: (appAccessResult.data ?? []) as Row[],
          branchAccess: (branchAccessResult.data ?? []) as Row[],
          companyAccess: (companyAccessResult.data ?? []) as Row[],
          dataScopes: (dataScopesResult.data ?? []) as Row[],
          roles,
          userRoles: (userRolesResult.data ?? []) as Row[],
        }),
      ),
    };
  } catch (error) {
    return emptyData(formatAdministrationDataError(error, "Administration data could not be loaded."));
  }
}
