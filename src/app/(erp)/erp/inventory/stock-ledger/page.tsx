import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listStockLedgerEntries } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function StockLedgerPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="stockLedger">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.stockLedger} loadRecords={listStockLedgerEntries} searchParams={searchParams} />
    </InventoryShell>
  );
}
