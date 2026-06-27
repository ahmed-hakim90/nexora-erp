import { WAREHOUSELOCATION_PAGE_CONFIG } from "@/features/warehouse-locations/public-api";
import { createWarehouseLocationAction } from "@/features/warehouse-locations/routes/actions/warehouse-locations.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewWarehouseLocationPage() {
  return (
    <MasterDataShell activeKey="warehouse-locations">
      <MasterDataFormPage action={createWarehouseLocationAction} config={WAREHOUSELOCATION_PAGE_CONFIG} title="Create WarehouseLocation" />
    </MasterDataShell>
  );
}
