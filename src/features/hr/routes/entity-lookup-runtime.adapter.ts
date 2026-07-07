import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";
import type { OxLookupExecutor } from "@/platform/operator-experience/lookup-runtime";

import { HrEntityLookupService } from "../application/services/hr-entity-lookup.service";
import { SupabaseHrEntityLookupRepository } from "../infrastructure/repositories/hr-entity-lookup.repository";

export function createHrLookupExecutors(
  context: BranchRequestContext,
  supabase: SupabaseClient,
): Record<string, OxLookupExecutor> {
  const repository = new SupabaseHrEntityLookupRepository(supabase, context);
  const service = new HrEntityLookupService(context, repository);
  return service.createExecutors();
}
