import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { ProductService } from "../application/services/products.service";
import { SupabaseProductRepository } from "../infrastructure/repositories/products.repository";

export async function createProductService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseProductRepository(supabase, context);

  return new ProductService(context, repository);
}
