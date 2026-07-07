import { loadHrAttendanceExportWorkspace } from "@/features/hr/routes/loaders/hr-attendance-export.loader";

import { HrAttendanceExportWorkspace } from "../_components/hr-attendance-export";
import { HrShell } from "../_components/hr-shell";

export default async function HrAttendanceExportPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrAttendanceExportWorkspace();

  return (
    <HrShell activeKey="attendance-export" pathname="/erp/hr/attendance-export">
      <HrAttendanceExportWorkspace data={data} query={query} />
    </HrShell>
  );
}
