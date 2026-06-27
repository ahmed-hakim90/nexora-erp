import { UNIT_PAGE_CONFIG } from "@/features/units/public-api";
import { updateUnitAction } from "@/features/units/routes/actions/units.actions";
import { getUnit } from "@/features/units/routes/loaders/units.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditUnitPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getUnit(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="units">
      <MasterDataFormPage
        action={updateUnitAction.bind(null, id)}
        config={UNIT_PAGE_CONFIG}
        record={record}
        title="Edit Unit"
      />
    </MasterDataShell>
  );
}
