export { inventoryModuleManifest } from "./module.manifest";
export { INVENTORY_PERMISSIONS, INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";
export { INVENTORY_PAGE_CONFIGS } from "./presentation/view-models/page-config";
export {
  createInventoryFoundationService,
  createInventoryTransactionServices,
  createStockPostingService,
} from "./routes/service-factory";
export type {
  CursorPage,
  InventoryEventDefinitionRecord,
  InventoryEventRouteRecord,
  InventoryIntegrationEndpointRecord,
  InventoryIntegrationMessageRecord,
  InventoryListQuery,
  PostStockInput,
  ReverseStockPostingInput,
  StockBalanceRecord,
  StockLedgerDirection,
  StockLedgerEntryRecord,
  StockMovementTypeKey,
  StockPostingBatchRecord,
  StockPostingLineInput,
} from "./application/types";
export type {
  InventoryTransactionDetail,
  InventoryTransactionType,
} from "./application/types/inventory-transactions";
