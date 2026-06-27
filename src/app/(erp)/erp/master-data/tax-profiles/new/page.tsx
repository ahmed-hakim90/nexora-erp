import { TAXPROFILE_PAGE_CONFIG } from "@/features/tax-profiles/public-api";
import { createTaxProfileAction } from "@/features/tax-profiles/routes/actions/tax-profiles.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewTaxProfilePage() {
  return (
    <MasterDataShell activeKey="tax-profiles">
      <MasterDataFormPage action={createTaxProfileAction} config={TAXPROFILE_PAGE_CONFIG} title="Create TaxProfile" />
    </MasterDataShell>
  );
}
