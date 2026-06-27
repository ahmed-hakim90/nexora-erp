import { CUSTOMER_PAGE_CONFIG } from "@/features/customers/public-api";
import { createCustomerAction } from "@/features/customers/routes/actions/customers.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewCustomerPage() {
  return (
    <MasterDataShell activeKey="customers">
      <MasterDataFormPage action={createCustomerAction} config={CUSTOMER_PAGE_CONFIG} title="Create Customer" />
    </MasterDataShell>
  );
}
