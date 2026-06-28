import "server-only";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";

import { getFinanceEntity } from "../application/entities";
import { FinanceService } from "../application/services/finance.service";
import { SupabaseFinanceRepository } from "../infrastructure/repositories/finance.repository";

export async function createFinanceService(entityKey: string) {
  const descriptor = getFinanceEntity(entityKey);
  const context = await resolveCompanyRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseFinanceRepository(supabase, context, descriptor);

  return new FinanceService(context, repository, descriptor);
}
