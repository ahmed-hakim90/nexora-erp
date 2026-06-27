import "server-only";

import { createBusinessDocumentServices } from "@/features/business-documents/public-api";
import { resolveTenantRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { OutboxService } from "@/platform/integration/server";

import { PurchasingService } from "../application/services/purchasing.service";
import { SupabasePurchasingRepository } from "../infrastructure/repositories/purchasing.repository";

export async function createPurchasingService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabasePurchasingRepository(supabase, context);
  const outbox = new OutboxService(supabase, context);
  const { documentService } = await createBusinessDocumentServices();

  return new PurchasingService(context, repository, documentService, outbox);
}
