import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";
import { getManufacturingRecord } from "@/features/manufacturing/routes/loaders/manufacturing.loader";

import { ManufacturingDetailPage } from "../../_components/manufacturing-pages";
import { ManufacturingShell } from "../../_components/manufacturing-shell";

export default async function ManufacturingResourceDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; resource: string }>;
}>) {
  const { id, resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);

  return (
    <ManufacturingShell activeKey={resourceKey}>
      <ManufacturingDetailPage definition={definition} loadRecord={() => getManufacturingRecord(resourceKey, id)} />
    </ManufacturingShell>
  );
}
