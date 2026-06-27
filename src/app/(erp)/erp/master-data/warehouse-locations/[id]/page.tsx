import { WAREHOUSELOCATION_PAGE_CONFIG } from "@/features/warehouse-locations/public-api";
import { getWarehouseLocation } from "@/features/warehouse-locations/routes/loaders/warehouse-locations.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function WarehouseLocationDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="warehouse-locations">
      <MasterDataDetailPage config={WAREHOUSELOCATION_PAGE_CONFIG} loadRecord={() => getWarehouseLocation(id)} />
    </MasterDataShell>
  );
}
