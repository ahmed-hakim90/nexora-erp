import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listStockPostingBatches } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function PostingBatchesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="postingBatches">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.postingBatches} loadRecords={listStockPostingBatches} searchParams={searchParams} />
    </InventoryShell>
  );
}
