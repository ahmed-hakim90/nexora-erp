import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";
import type { OxLookupExecutor } from "@/platform/operator-experience/lookup-runtime";

import { InventoryEntityLookupService } from "../application/services/inventory-entity-lookup.service";
import { SupabaseInventoryEntityLookupRepository } from "../infrastructure/repositories/inventory-entity-lookup.repository";

export function createInventoryLookupExecutors(
  context: BranchRequestContext,
  supabase: SupabaseClient,
): Record<string, OxLookupExecutor> {
  const repository = new SupabaseInventoryEntityLookupRepository(supabase, context);
  const service = new InventoryEntityLookupService(context, repository);
  return service.createExecutors();
}

export async function resolveInventoryLookupScan(
  context: BranchRequestContext,
  supabase: SupabaseClient,
  providerKey: string,
  term: string,
) {
  const repository = new SupabaseInventoryEntityLookupRepository(supabase, context);
  const service = new InventoryEntityLookupService(context, repository);
  return service.resolveScan(providerKey, term);
}
