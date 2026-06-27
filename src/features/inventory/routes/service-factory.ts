import "server-only";

import { resolveTenantRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { OutboxService } from "@/platform/integration/server";
import { createBusinessDocumentServices } from "@/features/business-documents/public-api";

import { InventoryFoundationService } from "../application/services/inventory-foundation.service";
import {
  CycleCountService,
  GoodsIssueService,
  GoodsReceiptService,
  InventoryTransactionService,
  StockAdjustmentService,
  WarehouseTransferService,
} from "../application/services/inventory-transaction.service";
import { StockPostingService } from "../application/services/stock-posting.service";
import { SupabaseInventoryRepository } from "../infrastructure/repositories/inventory.repository";
import { SupabaseInventoryTransactionRepository } from "../infrastructure/repositories/inventory-transactions.repository";

export async function createInventoryFoundationService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseInventoryRepository(supabase, context);

  return new InventoryFoundationService(context, repository);
}

export async function createStockPostingService() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseInventoryRepository(supabase, context);
  const outbox = new OutboxService(supabase, context);

  return new StockPostingService(context, repository, outbox);
}

export async function createInventoryTransactionServices() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const foundationRepository = new SupabaseInventoryRepository(supabase, context);
  const transactionRepository = new SupabaseInventoryTransactionRepository(supabase, context);
  const outbox = new OutboxService(supabase, context);
  const stockPostingService = new StockPostingService(context, foundationRepository, outbox);
  const { documentService } = await createBusinessDocumentServices();

  const args = [context, transactionRepository, stockPostingService, documentService, outbox] as const;

  return {
    cycleCountService: new CycleCountService(...args),
    goodsIssueService: new GoodsIssueService(...args),
    goodsReceiptService: new GoodsReceiptService(...args),
    stockAdjustmentService: new StockAdjustmentService(...args),
    transactionService: new InventoryTransactionService(...args),
    warehouseTransferService: new WarehouseTransferService(...args),
  };
}
