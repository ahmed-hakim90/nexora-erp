import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { UnitService } from "../application/services/units.service";
import { SupabaseUnitRepository } from "../infrastructure/repositories/units.repository";

export async function createUnitService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseUnitRepository(supabase, context);

  return new UnitService(context, repository);
}
