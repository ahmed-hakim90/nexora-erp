import { loadHrOvertimeRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-overtime-runtime.loader";

import { HrOvertimeReportsWorkspace } from "../../_components/hr-overtime-reports-workspace";
import { HrShell } from "../../_components/hr-shell";

export default async function HrOvertimeReportsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const data = await loadHrOvertimeRuntimeWorkspace();

  const departmentSummary = data.requests.reduce<
    Record<string, { approved: number; hours: number; pending: number; requests: number }>
  >((acc, row) => {
    const key = row.overtimeType;
    const bucket = acc[key] ?? { approved: 0, hours: 0, pending: 0, requests: 0 };
    bucket.requests += 1;
    bucket.hours += row.durationMinutes / 60;
    if (row.status.toLowerCase().includes("approved")) bucket.approved += 1;
    if (row.status.toLowerCase().includes("submitted") || row.status.toLowerCase().includes("under review")) {
      bucket.pending += 1;
    }
    acc[key] = bucket;
    return acc;
  }, {});

  const summaryRows = Object.entries(departmentSummary).map(([overtimeType, stats]) => ({
    approved: stats.approved,
    hours: Math.round(stats.hours * 100) / 100,
    id: overtimeType,
    overtimeType,
    pending: stats.pending,
    requests: stats.requests,
  }));

  return (
    <HrShell activeKey="overtime-reports" pathname="/erp/hr/overtime/reports">
      <HrOvertimeReportsWorkspace data={data} query={query} summaryRows={summaryRows} />
    </HrShell>
  );
}
