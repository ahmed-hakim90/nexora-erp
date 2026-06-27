import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";
import { listManufacturingRecords } from "@/features/manufacturing/routes/loaders/manufacturing.loader";

import { ManufacturingShell } from "../_components/manufacturing-shell";
import { ManufacturingListPage } from "../_components/manufacturing-pages";

export default async function ManufacturingResourcePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ resource: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const { resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);

  return (
    <ManufacturingShell activeKey={resourceKey}>
      <ManufacturingListPage definition={definition} loadRecords={(query) => listManufacturingRecords(resourceKey, query)} searchParams={searchParams} />
    </ManufacturingShell>
  );
}
