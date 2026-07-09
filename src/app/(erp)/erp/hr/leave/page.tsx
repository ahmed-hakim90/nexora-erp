import { loadHrLeaveRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";

import { HrLeaveWorkspace } from "../_components/hr-leave-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrLeaveManagementPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrLeaveRuntimeWorkspace();

  return (
    <HrShell activeKey="leave-management" pathname="/erp/hr/leave">
      <HrLeaveWorkspace data={data} query={query} />
    </HrShell>
  );
}
