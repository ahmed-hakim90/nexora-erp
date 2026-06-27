import { BRAND_PAGE_CONFIG } from "@/features/brands/public-api";
import { listBrands } from "@/features/brands/routes/loaders/brands.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function BrandsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="brands">
      <MasterDataListPage config={BRAND_PAGE_CONFIG} loadRecords={listBrands} searchParams={searchParams} />
    </MasterDataShell>
  );
}
