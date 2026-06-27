import { SUPPLIER_PAGE_CONFIG } from "@/features/suppliers/public-api";
import { getSupplier } from "@/features/suppliers/routes/loaders/suppliers.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function SupplierDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="suppliers">
      <MasterDataDetailPage config={SUPPLIER_PAGE_CONFIG} loadRecord={() => getSupplier(id)} />
    </MasterDataShell>
  );
}
