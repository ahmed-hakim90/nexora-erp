import { PRICELIST_PAGE_CONFIG } from "@/features/price-lists/public-api";
import { createPriceListAction } from "@/features/price-lists/routes/actions/price-lists.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewPriceListPage() {
  return (
    <MasterDataShell activeKey="price-lists">
      <MasterDataFormPage action={createPriceListAction} config={PRICELIST_PAGE_CONFIG} title="Create PriceList" />
    </MasterDataShell>
  );
}
