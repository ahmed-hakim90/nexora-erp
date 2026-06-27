import { PRODUCTCATEGORY_PAGE_CONFIG } from "@/features/product-categories/public-api";
import { createProductCategoryAction } from "@/features/product-categories/routes/actions/product-categories.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewProductCategoryPage() {
  return (
    <MasterDataShell activeKey="product-categories">
      <MasterDataFormPage action={createProductCategoryAction} config={PRODUCTCATEGORY_PAGE_CONFIG} title="Create ProductCategory" />
    </MasterDataShell>
  );
}
