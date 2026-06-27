import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/core/env/server";

export type RequestSupabaseClientOptions = Readonly<{
  accessToken: string;
}>;

export function createRequestSupabaseClient(
  options: RequestSupabaseClientOptions,
): SupabaseClient {
  const env = getServerEnvironment();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment values are not configured.");
  }

  if (!options.accessToken) {
    throw new Error("A request access token is required for RLS-scoped access.");
  }

  // Request-scoped clients must carry the user's JWT so RLS can evaluate auth context.
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
        },
      },
    },
  );
}
