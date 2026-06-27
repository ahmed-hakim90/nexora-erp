import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { SupplierService } from "../application/services/suppliers.service";
import { SupabaseSupplierRepository } from "../infrastructure/repositories/suppliers.repository";

export async function createSupplierService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseSupplierRepository(supabase, context);

  return new SupplierService(context, repository);
}
