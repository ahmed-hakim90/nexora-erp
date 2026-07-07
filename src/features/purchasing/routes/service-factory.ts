import "server-only";

import { createBusinessDocumentServices } from "@/features/business-documents/public-api";
import { resolveBranchRequestContext, resolveTenantRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { OutboxService } from "@/platform/integration/server";

import { PurchasingService } from "../application/services/purchasing.service";
import { PurchasingCatalogLookupService } from "../application/services/purchasing-catalog-lookup.service";
import { SupabasePurchasingRepository } from "../infrastructure/repositories/purchasing.repository";
import { SupabasePurchasingCatalogLookupRepository } from "../infrastructure/repositories/purchasing-catalog-lookup.repository";

export async function createPurchasingService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabasePurchasingRepository(supabase, context);
  const outbox = new OutboxService(supabase, context);
  const { documentService } = await createBusinessDocumentServices();

  return new PurchasingService(context, repository, documentService, outbox);
}

export async function createPurchasingCatalogLookupService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabasePurchasingCatalogLookupRepository(supabase, context);

  return new PurchasingCatalogLookupService(context, repository);
}
