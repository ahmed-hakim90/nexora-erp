import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { TaxProfileService } from "../application/services/tax-profiles.service";
import { SupabaseTaxProfileRepository } from "../infrastructure/repositories/tax-profiles.repository";

export async function createTaxProfileService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseTaxProfileRepository(supabase, context);

  return new TaxProfileService(context, repository);
}
