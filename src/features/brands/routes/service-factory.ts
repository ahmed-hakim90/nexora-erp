import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { BrandService } from "../application/services/brands.service";
import { SupabaseBrandRepository } from "../infrastructure/repositories/brands.repository";

export async function createBrandService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseBrandRepository(supabase, context);

  return new BrandService(context, repository);
}
