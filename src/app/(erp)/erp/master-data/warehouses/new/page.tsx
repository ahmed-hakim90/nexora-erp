import { WAREHOUSE_PAGE_CONFIG } from "@/features/warehouses/public-api";
import { createWarehouseAction } from "@/features/warehouses/routes/actions/warehouses.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewWarehousePage() {
  return (
    <MasterDataShell activeKey="warehouses">
      <MasterDataFormPage action={createWarehouseAction} config={WAREHOUSE_PAGE_CONFIG} title="Create Warehouse" />
    </MasterDataShell>
  );
}
