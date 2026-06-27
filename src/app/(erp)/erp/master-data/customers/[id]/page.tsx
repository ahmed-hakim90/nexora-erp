import { CUSTOMER_PAGE_CONFIG } from "@/features/customers/public-api";
import { getCustomer } from "@/features/customers/routes/loaders/customers.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function CustomerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="customers">
      <MasterDataDetailPage config={CUSTOMER_PAGE_CONFIG} loadRecord={() => getCustomer(id)} />
    </MasterDataShell>
  );
}
