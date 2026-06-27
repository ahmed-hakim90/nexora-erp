import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { WarehouseLocationService } from "../application/services/warehouse-locations.service";
import { SupabaseWarehouseLocationRepository } from "../infrastructure/repositories/warehouse-locations.repository";

export async function createWarehouseLocationService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseWarehouseLocationRepository(supabase, context);

  return new WarehouseLocationService(context, repository);
}
