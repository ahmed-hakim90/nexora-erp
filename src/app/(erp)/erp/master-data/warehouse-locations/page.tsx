import { WAREHOUSELOCATION_PAGE_CONFIG } from "@/features/warehouse-locations/public-api";
import { listWarehouseLocations } from "@/features/warehouse-locations/routes/loaders/warehouse-locations.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function WarehouseLocationsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="warehouse-locations">
      <MasterDataListPage config={WAREHOUSELOCATION_PAGE_CONFIG} loadRecords={listWarehouseLocations} searchParams={searchParams} />
    </MasterDataShell>
  );
}
