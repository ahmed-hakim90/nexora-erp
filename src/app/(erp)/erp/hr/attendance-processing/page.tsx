import { loadHrAttendanceProcessingWorkspace } from "@/features/hr/routes/loaders/hr-attendance-processing.loader";

import { HrAttendanceProcessingWorkspace } from "../_components/hr-attendance-processing";
import { HrShell } from "../_components/hr-shell";

export default async function HrAttendanceProcessingPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrAttendanceProcessingWorkspace();

  return (
    <HrShell activeKey="attendance-processing" pathname="/erp/hr/attendance-processing">
      <HrAttendanceProcessingWorkspace data={data} query={query} />
    </HrShell>
  );
}
