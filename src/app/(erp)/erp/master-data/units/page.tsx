import { UNIT_PAGE_CONFIG } from "@/features/units/public-api";
import { listUnits } from "@/features/units/routes/loaders/units.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function UnitsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="units">
      <MasterDataListPage config={UNIT_PAGE_CONFIG} loadRecords={listUnits} searchParams={searchParams} />
    </MasterDataShell>
  );
}
