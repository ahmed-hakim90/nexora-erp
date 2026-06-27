import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";
import { updateManufacturingRecordAction } from "@/features/manufacturing/routes/actions/manufacturing.actions";
import { getManufacturingRecord } from "@/features/manufacturing/routes/loaders/manufacturing.loader";

import { ManufacturingFormPage } from "../../../_components/manufacturing-pages";
import { ManufacturingShell } from "../../../_components/manufacturing-shell";

export default async function EditManufacturingResourcePage({
  params,
}: Readonly<{
  params: Promise<{ id: string; resource: string }>;
}>) {
  const { id, resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);
  const record = await getManufacturingRecord(resourceKey, id);
  const action = updateManufacturingRecordAction.bind(null, resourceKey, id);

  return (
    <ManufacturingShell activeKey={resourceKey}>
      <ManufacturingFormPage action={action} definition={definition} record={record} title={`Edit ${definition.singularTitle}`} />
    </ManufacturingShell>
  );
}
