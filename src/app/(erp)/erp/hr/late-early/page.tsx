import { loadHrLateEarlyRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";

import { HrLateEarlyWorkspace } from "../_components/hr-late-early-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrLateEarlyPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrLateEarlyRuntimeWorkspace();

  return (
    <HrShell activeKey="late-early" pathname="/erp/hr/late-early">
      <HrLateEarlyWorkspace data={data} query={query} />
    </HrShell>
  );
}
