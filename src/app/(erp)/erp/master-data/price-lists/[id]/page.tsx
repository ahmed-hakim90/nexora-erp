import { PRICELIST_PAGE_CONFIG } from "@/features/price-lists/public-api";
import { getPriceList } from "@/features/price-lists/routes/loaders/price-lists.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function PriceListDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="price-lists">
      <MasterDataDetailPage config={PRICELIST_PAGE_CONFIG} loadRecord={() => getPriceList(id)} />
    </MasterDataShell>
  );
}
