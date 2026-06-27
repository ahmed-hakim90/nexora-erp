import "server-only";

import { inventoryListQuerySchema } from "../../application/schemas/inventory.schema";
import { inventoryTransactionListQuerySchema } from "../../application/schemas/inventory-transactions.schema";
import { createInventoryFoundationService, createInventoryTransactionServices } from "../service-factory";

export async function getInventoryOverview(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.overview(inventoryListQuerySchema.parse(query));
}

export async function listInventoryEventDefinitions(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listEventDefinitions(inventoryListQuerySchema.parse(query));
}

export async function listInventoryIntegrationEndpoints(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listIntegrationEndpoints(inventoryListQuerySchema.parse(query));
}

export async function listInventoryEventRoutes(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listEventRoutes(inventoryListQuerySchema.parse(query));
}

export async function listInventoryIntegrationMessages(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listIntegrationMessages(inventoryListQuerySchema.parse(query));
}

export async function listStockLedgerEntries(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listStockLedgerEntries(inventoryListQuerySchema.parse(query));
}

export async function listStockBalances(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listStockBalances(inventoryListQuerySchema.parse(query));
}

export async function listStockPostingBatches(query: unknown = {}) {
  const service = await createInventoryFoundationService();
  return service.listStockPostingBatches(inventoryListQuerySchema.parse(query));
}

export async function listInventoryTransactions(query: unknown = {}) {
  const { transactionService } = await createInventoryTransactionServices();
  return transactionService.list(inventoryTransactionListQuerySchema.parse(query));
}

export async function getInventoryTransaction(id: string) {
  const { transactionService } = await createInventoryTransactionServices();
  return transactionService.read(id);
}
