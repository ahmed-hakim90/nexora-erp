import { TAXPROFILE_PAGE_CONFIG } from "@/features/tax-profiles/public-api";
import { updateTaxProfileAction } from "@/features/tax-profiles/routes/actions/tax-profiles.actions";
import { getTaxProfile } from "@/features/tax-profiles/routes/loaders/tax-profiles.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditTaxProfilePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getTaxProfile(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="tax-profiles">
      <MasterDataFormPage
        action={updateTaxProfileAction.bind(null, id)}
        config={TAXPROFILE_PAGE_CONFIG}
        record={record}
        title="Edit TaxProfile"
      />
    </MasterDataShell>
  );
}
