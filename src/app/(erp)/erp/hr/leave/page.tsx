import {
  approveEncashmentAction,
  createHolidayAction,
  executeCarryForwardAction,
  previewCarryForwardAction,
  createEncashmentAction,
} from "@/features/hr/routes/actions/hr-leave-runtime.actions";
import { loadHrLeaveRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  nativeSelectClassName,
  PageContainer,
  PageHeader,
} from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

function MetricCard({ detail, label, value }: Readonly<{ detail: string; label: string; value: number | string }>) {
  return (
    <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export default async function HrLeaveManagementPage() {
  const data = await loadHrLeaveRuntimeWorkspace();
  const { balances, carryForwardRuns, dashboard, encashments, holidays, leaveTypes, ledger, teamCalendar } = data;

  return (
    <HrShell activeKey="leave-management" pathname="/erp/hr/leave">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Leave policy engine, balances, carry forward, encashment, team calendar, and payroll input runtime."
          help={resolveHrPageHelp("attendanceLeave")}
          title="Leave Management"
        />

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <MetricCard detail="Awaiting manager/HR action" label="Pending Approvals" value={dashboard.pendingApprovals} />
            <MetricCard detail="On approved leave today" label="Currently Away" value={dashboard.employeesCurrentlyAway} />
            <MetricCard detail="Balances at risk (≤2 days)" label="Balance Risk" value={dashboard.leaveBalanceRisk} />
            <MetricCard detail="Draft carry-forward previews" label="Carry Forward Due" value={dashboard.carryForwardDue} />
            <MetricCard detail="Submitted encashment requests" label="Encashment Pending" value={dashboard.encashmentPending} />
            <MetricCard detail="Planning horizon" label="Upcoming Window" value={dashboard.upcomingLeaveWindowEnd} />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Carry Forward</h2>
            <form action={previewCarryForwardAction} className="mb-4 grid gap-3 md:grid-cols-4">
              <select className={nativeSelectClassName} defaultValue="company_closing" name="scope">
                <option value="company_closing">Company closing</option>
                <option value="policy_closing">Policy closing</option>
                <option value="employee_anniversary">Employee anniversary</option>
                <option value="manual">Manual</option>
              </select>
              <DatePicker name="sourcePeriodEnd" placeholder="Source period end" required />
              <DatePicker name="targetPeriodStart" placeholder="Target period start" required />
              <Button type="submit" variant="secondary">
                Preview carry forward
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Scope", key: "scope", render: (r) => r.scope },
                { header: "Period", key: "period", render: (r) => `${r.sourcePeriodEnd} → ${r.targetPeriodStart}` },
                { header: "Employees", key: "employees", render: (r) => r.employeeCount },
                { header: "Carried", key: "carried", render: (r) => r.totalQuantityCarried },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Execute",
                  key: "execute",
                  render: (r) =>
                    r.status.toLowerCase().includes("draft") ? (
                      <form action={executeCarryForwardAction}>
                        <input name="runId" type="hidden" value={r.id} />
                        <input name="scope" type="hidden" value="company_closing" />
                        <input name="sourcePeriodEnd" type="hidden" value={r.sourcePeriodEnd} />
                        <input name="targetPeriodStart" type="hidden" value={r.targetPeriodStart} />
                        <Button size="sm" type="submit" variant="primary">
                          Execute
                        </Button>
                      </form>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage="No carry-forward runs yet."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: carryForwardRuns.length || 1, totalRows: carryForwardRuns.length }}
              records={carryForwardRuns}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Encashment</h2>
            <form action={createEncashmentAction} className="mb-4 grid gap-3 md:grid-cols-5">
              <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
              <select className={nativeSelectClassName} name="leaveTypeId" required>
                <option value="">Leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <Input min="0.5" name="requestedQuantity" placeholder="Days to encash" required step="0.5" type="number" />
              <select className={nativeSelectClassName} defaultValue="partial" name="encashmentKind">
                <option value="partial">Partial</option>
                <option value="full">Full</option>
              </select>
              <Button type="submit" variant="primary">
                Submit encashment
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Quantity", key: "qty", render: (r) => r.requestedQuantity },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Approve",
                  key: "approve",
                  render: (r) =>
                    r.status.toLowerCase().includes("submitted") ? (
                      <form action={approveEncashmentAction}>
                        <input name="encashmentId" type="hidden" value={r.id} />
                        <Button size="sm" type="submit" variant="primary">
                          Approve
                        </Button>
                      </form>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage="No encashment requests."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: encashments.length || 1, totalRows: encashments.length }}
              records={encashments}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Team Calendar</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employee },
                { header: "Leave type", key: "type", render: (r) => r.leaveType },
                { header: "From", key: "from", render: (r) => r.startsOn },
                { header: "To", key: "to", render: (r) => r.endsOn },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No team leave scheduled."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: teamCalendar.length || 1, totalRows: teamCalendar.length }}
              records={teamCalendar}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Leave Balances</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Type", key: "type", render: (r) => r.leaveType },
                { header: "Available", key: "available", render: (r) => r.available },
                { header: "Pending", key: "pending", render: (r) => r.pending },
                { header: "Consumed", key: "consumed", render: (r) => r.consumed },
                { header: "Carried", key: "carried", render: (r) => r.carriedForward },
                { header: "Projected", key: "projected", render: (r) => r.projected },
              ]}
              emptyMessage="No leave balances."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: balances.length || 1, totalRows: balances.length }}
              records={balances}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Balance Ledger</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Movement", key: "movement", render: (r) => r.movementKind },
                { header: "Qty", key: "qty", render: (r) => r.quantity },
                { header: "Balance after", key: "after", render: (r) => r.balanceAfter },
                { header: "Date", key: "date", render: (r) => r.asOfDate },
              ]}
              emptyMessage="No ledger entries yet."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: ledger.length || 1, totalRows: ledger.length }}
              records={ledger}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Holiday Calendar</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Date", key: "date", render: (r) => r.holidayDate },
                { header: "Name", key: "name", render: (r) => r.name },
                { header: "Type", key: "type", render: (r) => r.type },
              ]}
              emptyMessage="No holidays configured."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: holidays.length || 1, totalRows: holidays.length }}
              records={holidays}
            />
          </section>
        </div>
      </PageContainer>
    </HrShell>
  );
}
