import { BRAND_PAGE_CONFIG } from "@/features/brands/public-api";
import { createBrandAction } from "@/features/brands/routes/actions/brands.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewBrandPage() {
  return (
    <MasterDataShell activeKey="brands">
      <MasterDataFormPage action={createBrandAction} config={BRAND_PAGE_CONFIG} title="Create Brand" />
    </MasterDataShell>
  );
}
