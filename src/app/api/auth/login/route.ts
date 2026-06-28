import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnvironment } from "@/core/env/server";
import { createServiceRoleSupabaseClient } from "@/platform/database/server";

const ACCESS_TOKEN_COOKIE = "nexora_access_token";
const REFRESH_TOKEN_COOKIE = "nexora_refresh_token";
const TENANT_COOKIE = "nexora_tenant_id";
const COMPANY_COOKIE = "nexora_company_id";
const BRANCH_COOKIE = "nexora_branch_id";

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

function createJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function setSessionCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAge: number,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function resolveDefaultWorkspace(userId: string) {
  const serviceRole = createServiceRoleSupabaseClient();
  const { data: membership, error: membershipError } = await serviceRole
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error("No active tenant membership was found for this user.");
  }

  const { data: tenant, error: tenantError } = await serviceRole
    .from("tenants")
    .select("id")
    .eq("id", membership.tenant_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (tenantError) {
    throw tenantError;
  }

  if (!tenant) {
    throw new Error("The assigned tenant is not active.");
  }

  const { data: company, error: companyError } = await serviceRole
    .from("companies")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw new Error("No active company was found for this tenant.");
  }

  const { data: branch, error: branchError } = await serviceRole
    .from("branches")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (branchError) {
    throw branchError;
  }

  if (!branch) {
    throw new Error("No active branch was found for this tenant.");
  }

  return {
    branchId: branch.id as string,
    companyId: company.id as string,
    tenantId: tenant.id as string,
  };
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return createJsonError("Please provide a valid email and password.");
  }

  const env = getServerEnvironment();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createJsonError("Supabase public environment values are not configured.", 500);
  }

  const publicSupabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { data, error } = await publicSupabase.auth.signInWithPassword(parsed.data);

  if (error || !data.session || !data.user) {
    return createJsonError(error?.message ?? "Invalid email or password.", 401);
  }

  try {
    const workspace = await resolveDefaultWorkspace(data.user.id);
    const response = NextResponse.json({
      ...workspace,
      redirectTo: "/erp",
    });

    setSessionCookie(response, ACCESS_TOKEN_COOKIE, data.session.access_token, 60 * 60);
    setSessionCookie(
      response,
      REFRESH_TOKEN_COOKIE,
      data.session.refresh_token,
      60 * 60 * 24 * 30,
    );
    setSessionCookie(response, TENANT_COOKIE, workspace.tenantId, 60 * 60 * 24 * 30);
    setSessionCookie(response, COMPANY_COOKIE, workspace.companyId, 60 * 60 * 24 * 30);
    setSessionCookie(response, BRANCH_COOKIE, workspace.branchId, 60 * 60 * 24 * 30);

    return response;
  } catch (workspaceError) {
    return createJsonError(
      workspaceError instanceof Error
        ? workspaceError.message
        : "Unable to resolve your default workspace.",
      403,
    );
  }
}
