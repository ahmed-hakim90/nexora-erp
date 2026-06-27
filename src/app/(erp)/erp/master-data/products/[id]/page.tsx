import { PRODUCT_PAGE_CONFIG } from "@/features/products/public-api";
import { getProduct } from "@/features/products/routes/loaders/products.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function ProductDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="products">
      <MasterDataDetailPage config={PRODUCT_PAGE_CONFIG} loadRecord={() => getProduct(id)} />
    </MasterDataShell>
  );
}
