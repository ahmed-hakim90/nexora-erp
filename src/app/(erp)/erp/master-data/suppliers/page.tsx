import { SUPPLIER_PAGE_CONFIG } from "@/features/suppliers/public-api";
import { listSuppliers } from "@/features/suppliers/routes/loaders/suppliers.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function SuppliersPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="suppliers">
      <MasterDataListPage config={SUPPLIER_PAGE_CONFIG} loadRecords={listSuppliers} searchParams={searchParams} />
    </MasterDataShell>
  );
}
