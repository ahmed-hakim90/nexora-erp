import { PRODUCT_PAGE_CONFIG } from "@/features/products/public-api";
import { listProducts } from "@/features/products/routes/loaders/products.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function ProductsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="products">
      <MasterDataListPage config={PRODUCT_PAGE_CONFIG} loadRecords={listProducts} searchParams={searchParams} />
    </MasterDataShell>
  );
}
