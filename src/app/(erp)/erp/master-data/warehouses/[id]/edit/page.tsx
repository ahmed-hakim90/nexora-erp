import { WAREHOUSE_PAGE_CONFIG } from "@/features/warehouses/public-api";
import { updateWarehouseAction } from "@/features/warehouses/routes/actions/warehouses.actions";
import { getWarehouse } from "@/features/warehouses/routes/loaders/warehouses.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditWarehousePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getWarehouse(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="warehouses">
      <MasterDataFormPage
        action={updateWarehouseAction.bind(null, id)}
        config={WAREHOUSE_PAGE_CONFIG}
        record={record}
        title="Edit Warehouse"
      />
    </MasterDataShell>
  );
}
