import { CUSTOMER_PAGE_CONFIG } from "@/features/customers/public-api";
import { updateCustomerAction } from "@/features/customers/routes/actions/customers.actions";
import { getCustomer } from "@/features/customers/routes/loaders/customers.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditCustomerPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getCustomer(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="customers">
      <MasterDataFormPage
        action={updateCustomerAction.bind(null, id)}
        config={CUSTOMER_PAGE_CONFIG}
        record={record}
        title="Edit Customer"
      />
    </MasterDataShell>
  );
}
