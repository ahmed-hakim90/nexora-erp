import { PRODUCTCATEGORY_PAGE_CONFIG } from "@/features/product-categories/public-api";
import { getProductCategory } from "@/features/product-categories/routes/loaders/product-categories.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function ProductCategoryDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="product-categories">
      <MasterDataDetailPage config={PRODUCTCATEGORY_PAGE_CONFIG} loadRecord={() => getProductCategory(id)} />
    </MasterDataShell>
  );
}
