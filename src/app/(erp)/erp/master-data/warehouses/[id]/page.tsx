import { WAREHOUSE_PAGE_CONFIG } from "@/features/warehouses/public-api";
import { getWarehouse } from "@/features/warehouses/routes/loaders/warehouses.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function WarehouseDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="warehouses">
      <MasterDataDetailPage config={WAREHOUSE_PAGE_CONFIG} loadRecord={() => getWarehouse(id)} />
    </MasterDataShell>
  );
}
