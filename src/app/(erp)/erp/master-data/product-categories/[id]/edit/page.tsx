import { PRODUCTCATEGORY_PAGE_CONFIG } from "@/features/product-categories/public-api";
import { updateProductCategoryAction } from "@/features/product-categories/routes/actions/product-categories.actions";
import { getProductCategory } from "@/features/product-categories/routes/loaders/product-categories.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditProductCategoryPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getProductCategory(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="product-categories">
      <MasterDataFormPage
        action={updateProductCategoryAction.bind(null, id)}
        config={PRODUCTCATEGORY_PAGE_CONFIG}
        record={record}
        title="Edit ProductCategory"
      />
    </MasterDataShell>
  );
}
