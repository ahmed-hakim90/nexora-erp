import { PRODUCT_PAGE_CONFIG } from "@/features/products/public-api";
import { createProductAction } from "@/features/products/routes/actions/products.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewProductPage() {
  return (
    <MasterDataShell activeKey="products">
      <MasterDataFormPage action={createProductAction} config={PRODUCT_PAGE_CONFIG} title="Create Product" />
    </MasterDataShell>
  );
}
