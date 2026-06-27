import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/core/env/server";

export function createServiceRoleSupabaseClient(): SupabaseClient {
  const env = getServerEnvironment();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service-role environment values are not configured.");
  }

  // Service-role access bypasses RLS. Only reviewed platform adapters may use it.
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
