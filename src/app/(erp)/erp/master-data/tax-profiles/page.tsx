import { TAXPROFILE_PAGE_CONFIG } from "@/features/tax-profiles/public-api";
import { listTaxProfiles } from "@/features/tax-profiles/routes/loaders/tax-profiles.loader";

import { MasterDataShell } from "../_components/master-data-shell";
import { MasterDataListPage } from "../_components/master-data-pages";

export default function TaxProfilesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  return (
    <MasterDataShell activeKey="tax-profiles">
      <MasterDataListPage config={TAXPROFILE_PAGE_CONFIG} loadRecords={listTaxProfiles} searchParams={searchParams} />
    </MasterDataShell>
  );
}
