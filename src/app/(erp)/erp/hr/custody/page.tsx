import { loadHrCustodyWorkspace } from "@/features/hr/routes/loaders/hr-operational.loader";

import { HrCustodyWorkspace } from "../_components/hr-operational-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrCustodyPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const records = await loadHrCustodyWorkspace({ employeeId: params.employeeId });
  return (
    <HrShell activeKey="custody">
      <HrCustodyWorkspace defaultEmployeeId={params.employeeId} highlightCreate={params.create === "1"} records={records} />
    </HrShell>
  );
}
