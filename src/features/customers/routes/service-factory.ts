import "server-only";

import { createRequestSupabaseClient } from "@/platform/database/server";
import { resolveTenantRequestContext } from "@/platform/auth/server";

import { CustomerService } from "../application/services/customers.service";
import { SupabaseCustomerRepository } from "../infrastructure/repositories/customers.repository";

export async function createCustomerService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseCustomerRepository(supabase, context);

  return new CustomerService(context, repository);
}
