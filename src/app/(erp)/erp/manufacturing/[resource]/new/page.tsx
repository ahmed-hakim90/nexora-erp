import { createManufacturingRecordAction } from "@/features/manufacturing/routes/actions/manufacturing.actions";
import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";

import { ManufacturingFormPage } from "../../_components/manufacturing-pages";
import { ManufacturingShell } from "../../_components/manufacturing-shell";

export default async function NewManufacturingResourcePage({
  params,
}: Readonly<{
  params: Promise<{ resource: string }>;
}>) {
  const { resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);
  const action = createManufacturingRecordAction.bind(null, resourceKey);

  return (
    <ManufacturingShell activeKey={resourceKey}>
      <ManufacturingFormPage action={action} definition={definition} title={`Create ${definition.singularTitle}`} />
    </ManufacturingShell>
  );
}
