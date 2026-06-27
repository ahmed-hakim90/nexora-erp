import { INVENTORY_PAGE_CONFIGS } from "@/features/inventory/public-api";
import { listInventoryEventDefinitions } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryListPage } from "../_components/inventory-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default function InventoryEventsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <InventoryShell activeKey="events">
      <InventoryListPage config={INVENTORY_PAGE_CONFIGS.events} loadRecords={listInventoryEventDefinitions} searchParams={searchParams} />
    </InventoryShell>
  );
}
