import { loadHrLeaveRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";

import { HrLeaveReportsWorkspace } from "../../_components/hr-leave-reports-workspace";
import { HrShell } from "../../_components/hr-shell";

export default async function HrLeaveReportsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrLeaveRuntimeWorkspace();

  return (
    <HrShell activeKey="leave-reports" pathname="/erp/hr/leave/reports">
      <HrLeaveReportsWorkspace data={data} query={query} />
    </HrShell>
  );
}
