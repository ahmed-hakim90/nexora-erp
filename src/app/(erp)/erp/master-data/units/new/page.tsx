import { UNIT_PAGE_CONFIG } from "@/features/units/public-api";
import { createUnitAction } from "@/features/units/routes/actions/units.actions";

import { MasterDataShell } from "../../_components/master-data-shell";
import { MasterDataFormPage } from "../../_components/master-data-pages";

export default function NewUnitPage() {
  return (
    <MasterDataShell activeKey="units">
      <MasterDataFormPage action={createUnitAction} config={UNIT_PAGE_CONFIG} title="Create Unit" />
    </MasterDataShell>
  );
}
