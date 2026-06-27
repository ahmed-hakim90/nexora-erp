import { PRODUCTCATEGORY_PAGE_CONFIG } from "@/features/product-categories/public-api";
import { listProductCategories } from "@/features/product-categories/routes/loaders/product-categories.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function ProductCategoriesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="product-categories">
      <MasterDataListPage config={PRODUCTCATEGORY_PAGE_CONFIG} loadRecords={listProductCategories} searchParams={searchParams} />
    </MasterDataShell>
  );
}
