import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listInventoryIntegrationEndpoints } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function InventoryEndpointsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="endpoints">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.endpoints} loadRecords={listInventoryIntegrationEndpoints} searchParams={searchParams} />
    </InventoryShell>
  );
}
