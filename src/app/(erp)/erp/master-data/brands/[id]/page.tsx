import { BRAND_PAGE_CONFIG } from "@/features/brands/public-api";
import { getBrand } from "@/features/brands/routes/loaders/brands.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function BrandDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="brands">
      <MasterDataDetailPage config={BRAND_PAGE_CONFIG} loadRecord={() => getBrand(id)} />
    </MasterDataShell>
  );
}
