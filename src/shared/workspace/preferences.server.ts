import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import {
  EMPTY_WORKSPACE_PREFERENCES,
  normalizeWorkspacePreferences,
  type WorkspacePreferences,
} from "./preferences";

export type PersistedWorkspacePreferences = Readonly<{
  persisted: boolean;
  preferences: WorkspacePreferences;
}>;

export async function loadCurrentWorkspacePreferences(): Promise<PersistedWorkspacePreferences> {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("user_workspace_preferences")
    .select("preferences")
    .eq("tenant_id", context.tenantId)
    .eq("user_id", context.userId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return {
      persisted: false,
      preferences: EMPTY_WORKSPACE_PREFERENCES,
    };
  }

  return {
    persisted: true,
    preferences: normalizeWorkspacePreferences(data.preferences),
  };
}

export async function saveCurrentWorkspacePreferences(
  preferences: unknown,
): Promise<PersistedWorkspacePreferences> {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const normalized = normalizeWorkspacePreferences(preferences);
  const { data, error } = await supabase
    .from("user_workspace_preferences")
    .upsert(
      {
        created_by: context.userId,
        is_active: true,
        preferences: normalized,
        tenant_id: context.tenantId,
        updated_by: context.userId,
        user_id: context.userId,
      },
      { onConflict: "tenant_id,user_id" },
    )
    .select("preferences")
    .single();

  if (error) {
    throw error;
  }

  return {
    persisted: true,
    preferences: normalizeWorkspacePreferences(data.preferences),
  };
}
