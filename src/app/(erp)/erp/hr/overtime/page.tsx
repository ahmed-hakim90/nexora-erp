import { loadHrOvertimeRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-overtime-runtime.loader";

import { HrOvertimeWorkspace } from "../_components/hr-overtime-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrOvertimePage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrOvertimeRuntimeWorkspace();

  return (
    <HrShell activeKey="overtime" pathname="/erp/hr/overtime">
      <HrOvertimeWorkspace data={data} query={query} />
    </HrShell>
  );
}
