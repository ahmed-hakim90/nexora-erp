import { PRICELIST_PAGE_CONFIG } from "@/features/price-lists/public-api";
import { listPriceLists } from "@/features/price-lists/routes/loaders/price-lists.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function PriceListsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="price-lists">
      <MasterDataListPage config={PRICELIST_PAGE_CONFIG} loadRecords={listPriceLists} searchParams={searchParams} />
    </MasterDataShell>
  );
}
