import Link from "next/link";

import {
  approveLateEarlyViolationAction,
  cancelLateEarlyViolationAction,
  createLateEarlyPolicyAction,
  createLateEarlyPolicyAssignmentAction,
  rejectLateEarlyViolationAction,
} from "@/features/hr/routes/actions/hr-late-early-runtime.actions";
import { loadHrLateEarlyRuntimeWorkspace } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  Input,
  PageContainer,
  PageHeader,
  PlatformTimeline,
  secondaryButtonLinkClassName,
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

export default async function HrLateEarlyPage() {
  const data = await loadHrLateEarlyRuntimeWorkspace();
  const { approvalEvents, dashboard, ledger, managerScopeActive, policyAssignments, policies, teamViolations, timelineEvents, violations } = data;

  return (
    <HrShell activeKey="late-early" pathname="/erp/hr/late-early">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Late arrival and early leave policy engine, violation workflow, and payroll input runtime."
          title="Late / Early"
        />
        <div className="mb-4 flex flex-wrap gap-3">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early/reports">
            Open late/early reports
          </Link>
          {managerScopeActive ? <span className="text-sm text-muted-foreground">Manager team scope active</span> : null}
        </div>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard detail="Employees late today" label="Today's Late" value={dashboard.todayLate} />
            <MetricCard detail="Early leave today" label="Today's Early Leave" value={dashboard.todayEarlyLeave} />
            <MetricCard detail="Awaiting approval" label="Pending Approvals" value={dashboard.pendingApprovals} />
            <MetricCard detail="Pattern violations" label="Repeated Violations" value={dashboard.repeatedViolations} />
          </section>

          {teamViolations.length > 0 ? (
            <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
              <h2 className="mb-4 text-lg font-medium">Team Pending Violations</h2>
              <EnterpriseDataTable
                columns={[
                  { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                  { header: "Date", key: "date", render: (r) => r.workDate },
                  { header: "Kind", key: "kind", render: (r) => r.violationKind },
                  { header: "Deduction", key: "deduction", render: (r) => r.deductionMinutes },
                  { header: "Status", key: "status", render: (r) => r.status },
                ]}
                emptyMessage="No pending team violations."
                getRowId={(r) => r.id}
                pagination={{ mode: "page", page: 1, pageSize: teamViolations.length || 1, totalRows: teamViolations.length }}
                records={teamViolations}
              />
            </section>
          ) : null}

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Create Policy</h2>
            <form action={createLateEarlyPolicyAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="code" placeholder="Policy code" required />
              <Input name="name" placeholder="Policy name" required />
              <DatePicker name="effectiveFrom" placeholder="Effective from" required />
              <Input defaultValue="15" min={0} name="graceMinutes" placeholder="Grace minutes" type="number" />
              <Input defaultValue="1" min={0} name="lateThresholdMinutes" placeholder="Late threshold (min)" type="number" />
              <Input defaultValue="120" min={0} name="monthlyLimitMinutes" placeholder="Monthly limit (min)" type="number" />
              <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" defaultValue="minutes" name="deductionMethod">
                <option value="minutes">Deduction: minutes</option>
                <option value="half_day">Deduction: half day</option>
                <option value="full_day">Deduction: full day</option>
                <option value="none">Deduction: none</option>
              </select>
              <Button type="submit" variant="primary">
                Create policy
              </Button>
            </form>
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Policy Assignments</h2>
            <form action={createLateEarlyPolicyAssignmentAction} className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" name="policyId" required>
                <option value="">Select policy</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.code} — {policy.name}
                  </option>
                ))}
              </select>
              <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" defaultValue="company" name="assignmentScope" required>
                <option value="employee">Employee</option>
                <option value="contract">Contract</option>
                <option value="shift">Shift</option>
                <option value="department">Department</option>
                <option value="branch">Branch</option>
                <option value="company">Company</option>
              </select>
              <Input name="referenceEntityId" placeholder="Reference entity ID (optional)" />
              <DatePicker name="effectiveFrom" placeholder="Effective from" required />
              <Button type="submit" variant="primary">
                Assign policy
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Policy", key: "policy", render: (r) => r.policyName },
                { header: "Scope", key: "scope", render: (r) => r.assignmentScope },
                { header: "Reference", key: "reference", render: (r) => r.referenceEntityId ?? "—" },
                { header: "Effective", key: "effective", render: (r) => r.effectiveFrom },
              ]}
              emptyMessage="No policy assignments."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: policyAssignments.length || 1, totalRows: policyAssignments.length }}
              records={policyAssignments}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Violations</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Kind", key: "kind", render: (r) => r.violationKind },
                { header: "Late (min)", key: "late", render: (r) => r.lateMinutes },
                { header: "Early (min)", key: "early", render: (r) => r.earlyLeaveMinutes },
                { header: "Deduction", key: "deduction", render: (r) => r.deductionMinutes },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (r) =>
                    r.status.toLowerCase().includes("submitted") ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={approveLateEarlyViolationAction}>
                          <input name="violationId" type="hidden" value={r.id} />
                          <Button size="sm" type="submit" variant="primary">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectLateEarlyViolationAction}>
                          <input name="violationId" type="hidden" value={r.id} />
                          <input name="reason" type="hidden" value="Rejected by manager" />
                          <Button size="sm" type="submit" variant="secondary">
                            Reject
                          </Button>
                        </form>
                        <form action={cancelLateEarlyViolationAction}>
                          <input name="violationId" type="hidden" value={r.id} />
                          <input name="reason" type="hidden" value="Cancelled by HR" />
                          <Button size="sm" type="submit" variant="secondary">
                            Cancel
                          </Button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage="No violations recorded."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: violations.length || 1, totalRows: violations.length }}
              records={violations}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Active Policies</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Code", key: "code", render: (r) => r.code },
                { header: "Name", key: "name", render: (r) => r.name },
                { header: "Grace", key: "grace", render: (r) => `${r.graceMinutes} min` },
                { header: "Effective", key: "effective", render: (r) => r.effectiveFrom },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No policies configured."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: policies.length || 1, totalRows: policies.length }}
              records={policies}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Violation Ledger</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.asOfDate },
                { header: "Movement", key: "movement", render: (r) => r.movementKind },
                { header: "Late", key: "late", render: (r) => r.lateMinutes },
                { header: "Early", key: "early", render: (r) => r.earlyLeaveMinutes },
                { header: "Deduction", key: "deduction", render: (r) => r.deductionMinutes },
              ]}
              emptyMessage="No ledger movements."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: ledger.length || 1, totalRows: ledger.length }}
              records={ledger}
            />
          </section>

          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="mb-4 text-lg font-medium">Approval History</h2>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Event", key: "event", render: (r) => r.eventKind },
                { header: "When", key: "when", render: (r) => r.occurredAt },
                { header: "Reason", key: "reason", render: (r) => r.reason ?? "—" },
              ]}
              emptyMessage="No approval events."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: approvalEvents.length || 1, totalRows: approvalEvents.length }}
              records={approvalEvents}
            />
          </section>

          <PlatformTimeline events={timelineEvents} title="Late/Early approval timeline" />
        </div>
      </PageContainer>
    </HrShell>
  );
}
