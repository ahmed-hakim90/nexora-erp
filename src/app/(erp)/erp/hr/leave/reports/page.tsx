import Link from "next/link";

import { loadHrLeaveRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";
import { EnterpriseDataTable, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

import { HrShell } from "../../_components/hr-shell";

export default async function HrLeaveReportsPage() {
  const data = await loadHrLeaveRuntimeWorkspace();

  return (
    <HrShell activeKey="leave-reports" pathname="/erp/hr/leave/reports">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Leave balance, ledger, liability indicators, carry forward and encashment reports."
          title="Leave Reports"
        />
        <div className="mb-4">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/leave">
            Back to leave management
          </Link>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Leave Balance Report</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Type", key: "type", render: (r) => r.leaveType },
                { header: "Available", key: "available", render: (r) => r.available },
                { header: "Pending", key: "pending", render: (r) => r.pending },
                { header: "Negative", key: "negative", render: (r) => r.negative },
              ]}
              emptyMessage="No balances."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.balances.length || 1, totalRows: data.balances.length }}
              records={data.balances}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Leave Ledger</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Movement", key: "movement", render: (r) => r.movementKind },
                { header: "Quantity", key: "qty", render: (r) => r.quantity },
                { header: "Balance After", key: "after", render: (r) => r.balanceAfter },
              ]}
              emptyMessage="No ledger entries."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.ledger.length || 1, totalRows: data.ledger.length }}
              records={data.ledger}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Carry Forward Report</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Scope", key: "scope", render: (r) => r.scope },
                { header: "Employees", key: "employees", render: (r) => r.employeeCount },
                { header: "Total carried", key: "total", render: (r) => r.totalQuantityCarried },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No carry-forward runs."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.carryForwardRuns.length || 1, totalRows: data.carryForwardRuns.length }}
              records={data.carryForwardRuns}
            />
          </section>

          <section className="rounded-lg border p-5">
            <h2 className="mb-3 font-medium">Encashment Report</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Quantity", key: "qty", render: (r) => r.requestedQuantity },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No encashment records."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: data.encashments.length || 1, totalRows: data.encashments.length }}
              records={data.encashments}
            />
          </section>
        </div>
      </PageContainer>
    </HrShell>
  );
}
