import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { ProductCategoryService } from "../application/services/product-categories.service";
import { SupabaseProductCategoryRepository } from "../infrastructure/repositories/product-categories.repository";

export async function createProductCategoryService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseProductCategoryRepository(supabase, context);

  return new ProductCategoryService(context, repository);
}
