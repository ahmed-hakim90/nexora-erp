"use server";

import { revalidatePath } from "next/cache";

import { createRequestSupabaseClient, createServiceRoleSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";
import { PLATFORM_PERMISSIONS, type PermissionKey } from "@/platform/permissions/public-api";
import { requirePermission } from "@/platform/permissions/server";
import { recordPermissionAudit, recordSecurityAudit } from "@/platform/audit/server";
import { defineAuditAction } from "@/platform/audit/public-api";

import {
  ADMINISTRATION_APP_OPTIONS,
  createAdminAuditEvent,
  isDangerousPermissionChange,
  validateGrantablePermissions,
  type AdminAuditEventType,
  type AdminDataScopeKind,
  type AdminRoleType,
  type AdminUserStatus,
} from "./model";

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readStringArray(formData: FormData, key: string): readonly string[] {
  return formData.getAll(key).map((value) => String(value)).filter(Boolean);
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

async function resolveAdminAction(permission: PermissionKey) {
  const context = await resolveTenantRequestContext("erp");
  await requirePermission({ context, permission: PLATFORM_PERMISSIONS.accessAdmin });
  await requirePermission({ context, permission });

  return {
    context,
    supabase: createRequestSupabaseClient({ accessToken: context.accessToken }),
  };
}

async function actorOwnsPermissions(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  tenantId: string,
  permissionKeys: readonly PermissionKey[],
): Promise<readonly PermissionKey[]> {
  const checks = await Promise.all(
    permissionKeys.map(async (permissionKey) => {
      const { data, error } = await supabase.rpc("has_permission", {
        check_tenant_id: tenantId,
        permission_key: permissionKey,
      });

      if (error || data !== true) {
        return permissionKey;
      }

      return null;
    }),
  );

  return checks.filter((permissionKey): permissionKey is PermissionKey => permissionKey !== null);
}

async function writeAudit(params: {
  action: AdminAuditEventType;
  actorUserId: string;
  context: Awaited<ReturnType<typeof resolveTenantRequestContext>>;
  subjectType: "user" | "role" | "permission" | "access" | "invitation";
  subjectId: string;
  subjectDisplay: string;
  metadata?: Record<string, unknown>;
}) {
  const event = createAdminAuditEvent({
    action: params.action,
    actorUserId: params.actorUserId,
    metadata: params.metadata ?? {},
    subjectDisplay: params.subjectDisplay,
    subjectId: params.subjectId,
    subjectType: params.subjectType,
  });

  const recorder = params.action.startsWith("permission") || params.subjectType === "role"
    ? recordPermissionAudit
    : recordSecurityAudit;

  await recorder({
    action: defineAuditAction(`administration.${event.action}`),
    context: params.context,
    entityId: event.subjectId,
    entityType: event.subjectType,
    metadata: event.metadata,
    module: "administration",
    outcome: "success",
    severity: isDangerousPermissionChange((event.metadata.permissionKeys ?? []) as PermissionKey[]) ? "critical" : "info",
    source: "administration",
    subject: {
      branchId: "branchId" in params.context ? params.context.branchId : null,
      companyId: "companyId" in params.context ? params.context.companyId : null,
      display: event.subjectDisplay,
      id: event.subjectId,
      type: event.subjectType,
    },
  });
}

export async function inviteUserAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageUsers);
  const email = readString(formData, "email").toLowerCase();
  const roleId = readString(formData, "roleId");
  const expiresAt = readString(formData, "expiresAt");
  const companyIds = readStringArray(formData, "companyIds");
  const branchIds = readStringArray(formData, "branchIds");
  const allowedApps = readStringArray(formData, "allowedApps");

  if (!email || !roleId || !expiresAt) {
    throw new Error("Email, role, and expiration are required.");
  }

  const serviceRole = createServiceRoleSupabaseClient();
  const inviteResult = await serviceRole.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: context.tenantId,
    },
  });

  const { data, error } = await supabase
    .from("user_invitations")
    .insert({
      allowed_app_keys: allowedApps,
      branch_ids: branchIds,
      company_ids: companyIds,
      email,
      expires_at: expiresAt,
      invited_by: context.userId,
      metadata: { provider: "supabase" },
      provider_invitation_id: inviteResult.data.user?.id,
      role_id: roleId,
      tenant_id: context.tenantId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await writeAudit({
    action: "user.invited",
    actorUserId: context.userId,
    context,
    metadata: { allowedApps, branchIds, companyIds, email, roleId },
    subjectDisplay: email,
    subjectId: String(data.id),
    subjectType: "invitation",
  });

  revalidatePath("/erp/admin/invitations");
  revalidatePath("/erp/admin/users");
}

export async function createRoleAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageRoles);
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const permissionKeys = readStringArray(formData, "permissionKeys") as readonly PermissionKey[];
  const roleType = (readString(formData, "roleType") || "tenant") as AdminRoleType;
  const dataScope = (readString(formData, "dataScope") || "tenant") as AdminDataScopeKind;
  const roleKey = normalizeSlug(readString(formData, "roleKey") || name);

  if (!name || !roleKey) {
    throw new Error("Role name is required.");
  }

  const missingPermissions = await actorOwnsPermissions(supabase, context.tenantId, permissionKeys);
  const grantValidation = validateGrantablePermissions(permissionKeys, permissionKeys.filter((permissionKey) => !missingPermissions.includes(permissionKey)));

  if (missingPermissions.length || !grantValidation.allowed) {
    throw new Error(`You cannot grant permissions you do not own: ${missingPermissions.join(", ")}`);
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .insert({
      admin_role_type: roleType,
      data_scope_kind: dataScope,
      description,
      is_system: false,
      name,
      role_key: roleKey,
      role_scope: "tenant",
      tenant_id: context.tenantId,
    })
    .select("id")
    .single();

  if (roleError) {
    throw roleError;
  }

  if (permissionKeys.length) {
    const { data: permissions, error: permissionError } = await supabase
      .from("permissions")
      .select("id, permission_key")
      .in("permission_key", permissionKeys);

    if (permissionError) {
      throw permissionError;
    }

    const { error: rolePermissionError } = await supabase.from("role_permissions").insert(
      (permissions ?? []).map((permission) => ({
        permission_id: permission.id,
        role_id: role.id,
        tenant_id: context.tenantId,
      })),
    );

    if (rolePermissionError) {
      throw rolePermissionError;
    }
  }

  await writeAudit({
    action: "role.created",
    actorUserId: context.userId,
    context,
    metadata: { dataScope, permissionKeys, roleType },
    subjectDisplay: name,
    subjectId: String(role.id),
    subjectType: "role",
  });

  revalidatePath("/erp/admin/roles");
  revalidatePath("/erp/admin/permissions");
}

export async function updateUserStatusAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageUsers);
  const userId = readString(formData, "userId");
  const status = readString(formData, "status") as AdminUserStatus;

  if (!userId || !status) {
    throw new Error("User and status are required.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      admin_status: status,
      is_active: status === "active" || status === "invited",
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  await writeAudit({
    action: status === "active" ? "user.activated" : "user.suspended",
    actorUserId: context.userId,
    context,
    metadata: { status },
    subjectDisplay: userId,
    subjectId: userId,
    subjectType: "user",
  });

  revalidatePath("/erp/admin/users");
}

export async function updateUserProfileAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageUsers);
  const userId = readString(formData, "userId");

  if (!userId) {
    throw new Error("User is required.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: readString(formData, "avatarUrl") || null,
      default_branch_id: readString(formData, "defaultBranchId") || null,
      default_company_id: readString(formData, "defaultCompanyId") || null,
      default_locale: readString(formData, "language") || "en",
      default_timezone: readString(formData, "timezone") || "UTC",
      department: readString(formData, "department") || null,
      display_name: readString(formData, "name"),
      job_title: readString(formData, "jobTitle") || null,
      notes: readString(formData, "notes") || null,
      phone: readString(formData, "phone") || null,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  await writeAudit({
    action: "user.updated",
    actorUserId: context.userId,
    context,
    metadata: { fields: ["profile"] },
    subjectDisplay: readString(formData, "name") || userId,
    subjectId: userId,
    subjectType: "user",
  });

  revalidatePath("/erp/admin/users");
}

export async function sendPasswordResetAction(formData: FormData): Promise<void> {
  const { context } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageUsers);
  const userId = readString(formData, "userId");
  const email = readString(formData, "email").toLowerCase();

  if (!userId || !email) {
    throw new Error("User and email are required.");
  }

  const serviceRole = createServiceRoleSupabaseClient();
  const { error } = await serviceRole.auth.resetPasswordForEmail(email);

  if (error) {
    throw error;
  }

  await writeAudit({
    action: "user.updated",
    actorUserId: context.userId,
    context,
    metadata: { operation: "password-reset-requested" },
    subjectDisplay: email,
    subjectId: userId,
    subjectType: "user",
  });

  revalidatePath("/erp/admin/users");
}

export async function assignUserRolesAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageRoles);
  const userId = readString(formData, "userId");
  const roleIds = readStringArray(formData, "roleIds");

  if (!userId) {
    throw new Error("User is required.");
  }

  const { data: rolePermissions, error: permissionError } = await supabase
    .from("role_permissions")
    .select("role_id, permissions(permission_key)")
    .in("role_id", roleIds);

  if (permissionError) {
    throw permissionError;
  }

  const permissionKeys = (rolePermissions ?? []).flatMap((row) => {
    const permission = row.permissions as { permission_key?: string } | null;
    return permission?.permission_key ? [permission.permission_key as PermissionKey] : [];
  });
  const missingPermissions = await actorOwnsPermissions(supabase, context.tenantId, permissionKeys);

  if (missingPermissions.length) {
    throw new Error(`You cannot assign roles with permissions you do not own: ${missingPermissions.join(", ")}`);
  }

  await supabase.from("user_roles").delete().eq("tenant_id", context.tenantId).eq("user_id", userId);

  if (roleIds.length) {
    const { error } = await supabase.from("user_roles").insert(
      roleIds.map((roleId) => ({
        role_id: roleId,
        tenant_id: context.tenantId,
        user_id: userId,
      })),
    );

    if (error) {
      throw error;
    }
  }

  await writeAudit({
    action: "permission.changed",
    actorUserId: context.userId,
    context,
    metadata: { permissionKeys, roleIds },
    subjectDisplay: userId,
    subjectId: userId,
    subjectType: "permission",
  });

  revalidatePath("/erp/admin/access");
  revalidatePath("/erp/admin/users");
}

export async function assignUserAccessAction(formData: FormData): Promise<void> {
  const { context, supabase } = await resolveAdminAction(PLATFORM_PERMISSIONS.manageMemberships);
  const userId = readString(formData, "userId");
  const companyMode = readString(formData, "companyMode") === "all" ? "all" : "specific";
  const branchMode = readString(formData, "branchMode") === "all" ? "all" : "specific";
  const companyIds = readStringArray(formData, "companyIds");
  const branchRefs = readStringArray(formData, "branchRefs");
  const allowedApps = readStringArray(formData, "allowedApps");
  const dataScope = (readString(formData, "dataScope") || "branch") as AdminDataScopeKind;

  if (!userId) {
    throw new Error("User is required.");
  }

  const selectedApps = allowedApps.filter((appKey) => ADMINISTRATION_APP_OPTIONS.some((app) => app.appKey === appKey));

  await Promise.all([
    supabase.from("user_company_access").delete().eq("tenant_id", context.tenantId).eq("user_id", userId),
    supabase.from("user_branch_access").delete().eq("tenant_id", context.tenantId).eq("user_id", userId),
    supabase.from("user_app_access").delete().eq("tenant_id", context.tenantId).eq("user_id", userId),
    supabase.from("user_data_scopes").delete().eq("tenant_id", context.tenantId).eq("user_id", userId),
  ]);

  const companyRows: {
    all_companies: boolean;
    company_id: string | null;
    tenant_id: string;
    user_id: string;
  }[] = companyMode === "all"
    ? [{ all_companies: true, company_id: null, tenant_id: context.tenantId, user_id: userId }]
    : companyIds.map((companyId) => ({ all_companies: false, company_id: companyId, tenant_id: context.tenantId, user_id: userId }));
  const branchRows: {
    all_branches: boolean;
    branch_id: string | null;
    company_id: string | null;
    tenant_id: string;
    user_id: string;
  }[] = branchMode === "all"
    ? companyIds.map((companyId) => ({ all_branches: true, branch_id: null, company_id: companyId, tenant_id: context.tenantId, user_id: userId }))
    : branchRefs
      .map((branchRef) => {
        const [companyId, branchId] = branchRef.split(":");
        return { all_branches: false, branch_id: branchId ?? null, company_id: companyId ?? null, tenant_id: context.tenantId, user_id: userId };
      })
      .filter((row) => row.company_id && row.branch_id);

  const results = await Promise.all([
    companyRows.length ? supabase.from("user_company_access").insert(companyRows) : Promise.resolve({ error: null }),
    branchRows.length ? supabase.from("user_branch_access").insert(branchRows) : Promise.resolve({ error: null }),
    selectedApps.length ? supabase.from("user_app_access").insert(selectedApps.map((appKey) => ({ app_key: appKey, tenant_id: context.tenantId, user_id: userId }))) : Promise.resolve({ error: null }),
    supabase.from("user_data_scopes").insert({ scope_kind: dataScope, tenant_id: context.tenantId, user_id: userId }),
  ]);

  const firstError = results.map((result) => result.error).find(Boolean);
  if (firstError) {
    throw firstError;
  }

  await writeAudit({
    action: "company-access.changed",
    actorUserId: context.userId,
    context,
    metadata: { branchMode, branchRefs, companyIds, companyMode, dataScope },
    subjectDisplay: userId,
    subjectId: userId,
    subjectType: "access",
  });
  await writeAudit({
    action: "app-access.changed",
    actorUserId: context.userId,
    context,
    metadata: { allowedApps: selectedApps },
    subjectDisplay: userId,
    subjectId: userId,
    subjectType: "access",
  });

  revalidatePath("/erp/admin/access");
  revalidatePath("/erp/admin/users");
}
