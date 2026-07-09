import { loadHrLateEarlyRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";

import { HrLateEarlyReportsWorkspace } from "../../_components/hr-late-early-reports-workspace";
import { HrShell } from "../../_components/hr-shell";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HrLateEarlyReportsPage({ searchParams }: Readonly<{ searchParams?: Promise<SearchParams> }>) {
  const params = (await searchParams) ?? {};
  const periodStart = readParam(params.periodStart);
  const periodEnd = readParam(params.periodEnd);
  const data = await loadHrLateEarlyRuntimeWorkspace({ periodEnd, periodStart });

  const departmentRollup = new Map<string, { deduction: number; early: number; late: number }>();
  for (const row of data.violations) {
    const key = row.employeeLabel.split(" (")[0] ?? row.employeeLabel;
    const bucket = departmentRollup.get(key) ?? { deduction: 0, early: 0, late: 0 };
    bucket.late += row.lateMinutes;
    bucket.early += row.earlyLeaveMinutes;
    bucket.deduction += row.deductionMinutes;
    departmentRollup.set(key, bucket);
  }

  const rollupRows = [...departmentRollup.entries()].map(([label, totals]) => ({
    deductionMinutes: totals.deduction,
    earlyLeaveMinutes: totals.early,
    employeeGroup: label,
    id: label,
    lateMinutes: totals.late,
  }));

  return (
    <HrShell activeKey="late-early-reports" pathname="/erp/hr/late-early/reports">
      <HrLateEarlyReportsWorkspace
        data={data}
        periodEnd={periodEnd}
        periodStart={periodStart}
        query={{
          periodEnd,
          periodStart,
          tab: readParam(params.tab),
        }}
        rollupRows={rollupRows}
      />
    </HrShell>
  );
}
