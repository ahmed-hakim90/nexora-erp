import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listStockBalances } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function StockBalancesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="stockBalances">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.stockBalances} loadRecords={listStockBalances} searchParams={searchParams} />
    </InventoryShell>
  );
}
