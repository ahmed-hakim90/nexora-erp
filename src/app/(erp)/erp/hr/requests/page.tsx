import { loadHrRequestsWorkspace } from "@/features/hr/routes/loaders/hr-operational.loader";

import { HrRequestsWorkspace } from "../_components/hr-operational-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrRequestsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const records = await loadHrRequestsWorkspace({ employeeId: params.employeeId });
  return (
    <HrShell activeKey="requests">
      <HrRequestsWorkspace defaultEmployeeId={params.employeeId} highlightCreate={params.create === "1"} records={records} />
    </HrShell>
  );
}
