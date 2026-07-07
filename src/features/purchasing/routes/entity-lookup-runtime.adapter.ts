import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";
import type { OxLookupExecutor } from "@/platform/operator-experience/lookup-runtime";

import { PurchasingEntityLookupService } from "../application/services/purchasing-entity-lookup.service";
import { SupabasePurchasingEntityLookupRepository } from "../infrastructure/repositories/purchasing-entity-lookup.repository";

export function createPurchasingLookupExecutors(
  context: BranchRequestContext,
  supabase: SupabaseClient,
): Record<string, OxLookupExecutor> {
  const repository = new SupabasePurchasingEntityLookupRepository(supabase, context);
  const service = new PurchasingEntityLookupService(context, repository);
  return service.createExecutors();
}
