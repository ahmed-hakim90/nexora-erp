import Link from "next/link";

import { loadHrOvertimeRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-overtime-runtime.loader";
import { EnterpriseDataTable, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

import { HrShell } from "../../_components/hr-shell";

export default async function HrOvertimeReportsPage() {
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
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Overtime register, summary by type, and approval history for payroll export readiness."
          title="Overtime Reports"
        />
        <div className="mb-4">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/overtime">
            Back to overtime management
          </Link>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Overtime Register</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Hours", key: "hours", render: (r) => (r.durationMinutes / 60).toFixed(2) },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Rate", key: "rate", render: (r) => `${r.rateMultiplier}x` },
                { header: "Payroll eligible", key: "payroll", render: (r) => (r.payrollEligible ? "Yes" : "No") },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No overtime requests."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.requests.length || 1, totalRows: data.requests.length }}
              records={data.requests}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Summary by Overtime Type</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Requests", key: "requests", render: (r) => r.requests },
                { header: "Approved", key: "approved", render: (r) => r.approved },
                { header: "Pending", key: "pending", render: (r) => r.pending },
                { header: "Total hours", key: "hours", render: (r) => r.hours },
              ]}
              emptyMessage="No overtime summary data."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: summaryRows.length || 1, totalRows: summaryRows.length }}
              records={summaryRows}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Attendance Candidates</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Minutes", key: "minutes", render: (r) => r.candidateMinutes },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No candidates."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.candidates.length || 1, totalRows: data.candidates.length }}
              records={data.candidates}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Approval History</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Event", key: "event", render: (r) => r.eventKind },
                { header: "Reason", key: "reason", render: (r) => r.reason ?? "—" },
                { header: "When", key: "when", render: (r) => r.occurredAt },
              ]}
              emptyMessage="No approval history."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.approvalEvents.length || 1, totalRows: data.approvalEvents.length }}
              records={data.approvalEvents}
            />
          </section>
        </div>
      </PageContainer>
    </HrShell>
  );
}
