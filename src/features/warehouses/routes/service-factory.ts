import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { WarehouseService } from "../application/services/warehouses.service";
import { SupabaseWarehouseRepository } from "../infrastructure/repositories/warehouses.repository";

export async function createWarehouseService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseWarehouseRepository(supabase, context);

  return new WarehouseService(context, repository);
}
