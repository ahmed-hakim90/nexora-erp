import { WAREHOUSE_PAGE_CONFIG } from "@/features/warehouses/public-api";
import { listWarehouses } from "@/features/warehouses/routes/loaders/warehouses.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function WarehousesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="warehouses">
      <MasterDataListPage config={WAREHOUSE_PAGE_CONFIG} loadRecords={listWarehouses} searchParams={searchParams} />
    </MasterDataShell>
  );
}
