import { PRODUCT_PAGE_CONFIG } from "@/features/products/public-api";
import { updateProductAction } from "@/features/products/routes/actions/products.actions";
import { getProduct } from "@/features/products/routes/loaders/products.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditProductPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getProduct(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="products">
      <MasterDataFormPage
        action={updateProductAction.bind(null, id)}
        config={PRODUCT_PAGE_CONFIG}
        record={record}
        title="Edit Product"
      />
    </MasterDataShell>
  );
}
