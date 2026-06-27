import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { PriceListService } from "../application/services/price-lists.service";
import { SupabasePriceListRepository } from "../infrastructure/repositories/price-lists.repository";

export async function createPriceListService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabasePriceListRepository(supabase, context);

  return new PriceListService(context, repository);
}
