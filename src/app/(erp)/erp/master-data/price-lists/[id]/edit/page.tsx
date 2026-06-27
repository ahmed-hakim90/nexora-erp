import { PRICELIST_PAGE_CONFIG } from "@/features/price-lists/public-api";
import { updatePriceListAction } from "@/features/price-lists/routes/actions/price-lists.actions";
import { getPriceList } from "@/features/price-lists/routes/loaders/price-lists.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditPriceListPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getPriceList(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="price-lists">
      <MasterDataFormPage
        action={updatePriceListAction.bind(null, id)}
        config={PRICELIST_PAGE_CONFIG}
        record={record}
        title="Edit PriceList"
      />
    </MasterDataShell>
  );
}
