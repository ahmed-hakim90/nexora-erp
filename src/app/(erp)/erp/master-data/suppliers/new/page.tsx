import { SUPPLIER_PAGE_CONFIG } from "@/features/suppliers/public-api";
import { createSupplierAction } from "@/features/suppliers/routes/actions/suppliers.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewSupplierPage() {
  return (
    <MasterDataShell activeKey="suppliers">
      <MasterDataFormPage action={createSupplierAction} config={SUPPLIER_PAGE_CONFIG} title="Create Supplier" />
    </MasterDataShell>
  );
}
