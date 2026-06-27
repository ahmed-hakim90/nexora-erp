import { WAREHOUSELOCATION_PAGE_CONFIG } from "@/features/warehouse-locations/public-api";
import { updateWarehouseLocationAction } from "@/features/warehouse-locations/routes/actions/warehouse-locations.actions";
import { getWarehouseLocation } from "@/features/warehouse-locations/routes/loaders/warehouse-locations.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditWarehouseLocationPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getWarehouseLocation(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="warehouse-locations">
      <MasterDataFormPage
        action={updateWarehouseLocationAction.bind(null, id)}
        config={WAREHOUSELOCATION_PAGE_CONFIG}
        record={record}
        title="Edit WarehouseLocation"
      />
    </MasterDataShell>
  );
}
