import { CUSTOMER_PAGE_CONFIG } from "@/features/customers/public-api";
import { listCustomers } from "@/features/customers/routes/loaders/customers.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function CustomersPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="customers">
      <MasterDataListPage config={CUSTOMER_PAGE_CONFIG} loadRecords={listCustomers} searchParams={searchParams} />
    </MasterDataShell>
  );
}
