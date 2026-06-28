import "server-only";

import { cookies, headers } from "next/headers";

import { ApplicationError } from "@/core/errors";
import { createRequestSupabaseClient } from "@/infrastructure/server";
import type { AuthenticatedUser } from "@/platform/auth/authenticated-context";

const TENANT_HEADER = "x-nexora-tenant-id";
const COMPANY_HEADER = "x-nexora-company-id";
const BRANCH_HEADER = "x-nexora-branch-id";
const EMPLOYEE_HEADER = "x-nexora-employee-id";
const TENANT_COOKIE = "nexora_tenant_id";
const COMPANY_COOKIE = "nexora_company_id";
const BRANCH_COOKIE = "nexora_branch_id";
const EMPLOYEE_COOKIE = "nexora_employee_id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TenantMembership = Readonly<{
  id: string;
  tenantId: string;
  userId: string;
  status: "active" | "invited" | "suspended";
}>;

function validateScopedId(value: string | null, label: string): string | null {
  if (!value) {
    return null;
  }

  if (!UUID_PATTERN.test(value)) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: `${label} context is invalid.`,
    });
  }

  return value;
}

async function getScopedValue(
  headerName: string,
  cookieName: string,
  label: string,
): Promise<string | null> {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  return validateScopedId(
    requestHeaders.get(headerName) ?? requestCookies.get(cookieName)?.value ?? null,
    label,
  );
}

export async function getCurrentTenant(): Promise<string | null> {
  return getScopedValue(TENANT_HEADER, TENANT_COOKIE, "Tenant");
}

export async function requireTenant(): Promise<string> {
  const tenantId = await getCurrentTenant();

  if (!tenantId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Tenant context is required.",
    });
  }

  return tenantId;
}

export async function getCurrentCompany(): Promise<string | null> {
  return getScopedValue(COMPANY_HEADER, COMPANY_COOKIE, "Company");
}

export async function requireCompany(): Promise<string> {
  const companyId = await getCurrentCompany();

  if (!companyId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Company context is required.",
    });
  }

  return companyId;
}

export async function getCurrentBranch(): Promise<string | null> {
  return getScopedValue(BRANCH_HEADER, BRANCH_COOKIE, "Branch");
}

export async function requireBranch(): Promise<string> {
  const branchId = await getCurrentBranch();

  if (!branchId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Branch context is required.",
    });
  }

  return branchId;
}

export async function getCurrentEmployee(): Promise<string | null> {
  return getScopedValue(EMPLOYEE_HEADER, EMPLOYEE_COOKIE, "Employee");
}

export async function requireEmployee(): Promise<string> {
  const employeeId = await getCurrentEmployee();

  if (!employeeId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Employee context is required.",
    });
  }

  return employeeId;
}

export async function requireMembership(params: {
  user: AuthenticatedUser;
  tenantId: string;
}): Promise<TenantMembership> {
  const supabase = createRequestSupabaseClient({
    accessToken: params.user.accessToken,
  });

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, status")
    .eq("tenant_id", params.tenantId)
    .eq("user_id", params.user.id)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Active tenant membership is required.",
      cause: error,
    });
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    userId: data.user_id,
    status: data.status,
  };
}
