import type {
  CursorPage,
  InventoryEventDefinitionRecord,
  InventoryEventRouteRecord,
  InventoryIntegrationEndpointRecord,
  InventoryIntegrationMessageRecord,
  InventoryListQuery,
  StockBalanceRecord,
  StockLedgerEntryRecord,
  StockPostingBatchRecord,
  StockPostingRpcInput,
  StockPostingValidationContext,
} from "../types";

export type InventoryFoundationRepository = Readonly<{
  listEventDefinitions(query: InventoryListQuery): Promise<CursorPage<InventoryEventDefinitionRecord>>;
  listIntegrationEndpoints(query: InventoryListQuery): Promise<CursorPage<InventoryIntegrationEndpointRecord>>;
  listEventRoutes(query: InventoryListQuery): Promise<CursorPage<InventoryEventRouteRecord>>;
  listIntegrationMessages(query: InventoryListQuery): Promise<CursorPage<InventoryIntegrationMessageRecord>>;
  listStockLedgerEntries(query: InventoryListQuery): Promise<CursorPage<StockLedgerEntryRecord>>;
  listStockBalances(query: InventoryListQuery): Promise<CursorPage<StockBalanceRecord>>;
  listStockPostingBatches(query: InventoryListQuery): Promise<CursorPage<StockPostingBatchRecord>>;
  loadPostingValidationContext(input: { documentId: string; branchId?: string | null }): Promise<StockPostingValidationContext>;
  validatePostingLineScope(input: {
    branchId?: string | null;
    productId: string;
    warehouseId: string;
    locationId: string;
    unitId: string;
  }): Promise<void>;
  readQuantityOnHand(input: {
    productId: string;
    warehouseId: string;
    locationId: string;
    lotId?: string | null;
    serialId?: string | null;
    unitId: string;
  }): Promise<number>;
  postStockEntries(input: StockPostingRpcInput): Promise<StockPostingBatchRecord>;
  listLedgerEntriesForBatch(postingBatchId: string): Promise<readonly StockLedgerEntryRecord[]>;
}>;
