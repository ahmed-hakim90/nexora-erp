import { UNIT_PAGE_CONFIG } from "@/features/units/public-api";
import { getUnit } from "@/features/units/routes/loaders/units.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function UnitDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="units">
      <MasterDataDetailPage config={UNIT_PAGE_CONFIG} loadRecord={() => getUnit(id)} />
    </MasterDataShell>
  );
}
