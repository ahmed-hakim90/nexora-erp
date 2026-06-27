import { TAXPROFILE_PAGE_CONFIG } from "@/features/tax-profiles/public-api";
import { getTaxProfile } from "@/features/tax-profiles/routes/loaders/tax-profiles.loader";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataDetailPage } from "../../_components/master-data-pages";

export default async function TaxProfileDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return (
    <MasterDataShell activeKey="tax-profiles">
      <MasterDataDetailPage config={TAXPROFILE_PAGE_CONFIG} loadRecord={() => getTaxProfile(id)} />
    </MasterDataShell>
  );
}
