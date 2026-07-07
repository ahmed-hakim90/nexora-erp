import Link from "next/link";

import { loadHrLateEarlyRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";
import { DatePicker, EnterpriseDataTable, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

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
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Late report, early leave report, violation ledger, and employee rollup."
          title="Late / Early Reports"
        />
        <div className="mb-4">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early">
            Back to late/early management
          </Link>
        </div>

        <form className="mb-6 grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3" method="get">
          <DatePicker defaultValue={periodStart} name="periodStart" placeholder="Period start" />
          <DatePicker defaultValue={periodEnd} name="periodEnd" placeholder="Period end" />
          <button className={secondaryButtonLinkClassName} type="submit">
            Apply period filter
          </button>
        </form>

        <div className="space-y-6">
          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Late Report</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Late (min)", key: "late", render: (r) => r.lateMinutes },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No late violations."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.violations.length || 1, totalRows: data.violations.length }}
              records={data.violations.filter((r) => r.lateMinutes > 0)}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Early Leave Report</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Early (min)", key: "early", render: (r) => r.earlyLeaveMinutes },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No early leave violations."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.violations.length || 1, totalRows: data.violations.length }}
              records={data.violations.filter((r) => r.earlyLeaveMinutes > 0)}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Employee Rollup</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeGroup },
                { header: "Late (min)", key: "late", render: (r) => r.lateMinutes },
                { header: "Early (min)", key: "early", render: (r) => r.earlyLeaveMinutes },
                { header: "Deduction", key: "deduction", render: (r) => r.deductionMinutes },
              ]}
              emptyMessage="No rollup data for selected period."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: rollupRows.length || 1, totalRows: rollupRows.length }}
              records={rollupRows}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Violation Ledger</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.asOfDate },
                { header: "Movement", key: "movement", render: (r) => r.movementKind },
                { header: "Deduction", key: "deduction", render: (r) => r.deductionMinutes },
              ]}
              emptyMessage="No ledger entries."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.ledger.length || 1, totalRows: data.ledger.length }}
              records={data.ledger}
            />
          </section>
        </div>
      </PageContainer>
    </HrShell>
  );
}
