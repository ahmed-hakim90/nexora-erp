import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listInventoryEventRoutes } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function InventoryRoutesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="routes">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.routes} loadRecords={listInventoryEventRoutes} searchParams={searchParams} />
    </InventoryShell>
  );
}
