import { BRAND_PAGE_CONFIG } from "@/features/brands/public-api";
import { updateBrandAction } from "@/features/brands/routes/actions/brands.actions";
import { getBrand } from "@/features/brands/routes/loaders/brands.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditBrandPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getBrand(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="brands">
      <MasterDataFormPage
        action={updateBrandAction.bind(null, id)}
        config={BRAND_PAGE_CONFIG}
        record={record}
        title="Edit Brand"
      />
    </MasterDataShell>
  );
}
