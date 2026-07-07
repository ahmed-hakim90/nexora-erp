import Link from "next/link";

import type { HrDashboardData } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { hrMetricHelp, resolveHrPageHelp, type HrMetricHelpKey } from "@/features/hr/public-api";
import { EmptyState, HelpHint, PageContainer, PageHeader } from "@/shared/ui";

const quickActions = [
  { href: "/erp/hr/employees?wizard=1", label: "Add Employee" },
  { href: "/erp/hr/contracts?create=1", label: "Create Contract" },
  { href: "/erp/hr/employees", label: "Change Assignment" },
  { href: "/erp/hr/attendance-leave?action=leave&create=1", label: "Submit Leave" },
  { href: "/erp/hr/compensation?create=1", label: "Add Salary Component" },
  { href: "/erp/hr/documents?upload=1", label: "Upload Document" },
  { href: "/erp/hr/requests?create=1", label: "Create HR Request" },
] as const;

function MetricCard({
  detail,
  helpKey,
  label,
  value,
}: Readonly<{ detail: string; helpKey: HrMetricHelpKey; label: string; value: number }>) {
  return (
    <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>{label}</span>
        <HelpHint help={hrMetricHelp[helpKey]} />
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export function HrDashboardWorkspace({ data }: Readonly<{ data: HrDashboardData }>) {
  const cards = [
    { detail: "All employee records", helpKey: "totalEmployees" as const, label: "Total Employees", value: data.metrics.totalEmployees },
    { detail: "Currently active", helpKey: "activeEmployees" as const, label: "Active Employees", value: data.metrics.activeEmployees },
    { detail: "Hired this month", helpKey: "newHires" as const, label: "New Hires", value: data.metrics.newHires },
    { detail: "Lifecycle probation", helpKey: "onProbation" as const, label: "On Probation", value: data.metrics.onProbation },
    { detail: "Within 60 days", helpKey: "contractsExpiringSoon" as const, label: "Contracts Expiring Soon", value: data.metrics.contractsExpiringSoon },
    { detail: "Document expiry alerts", helpKey: "documentsExpiringSoon" as const, label: "Documents Expiring Soon", value: data.metrics.documentsExpiringSoon },
    { detail: "Open HR action documents", helpKey: "pendingHrRequests" as const, label: "Pending HR Requests", value: data.metrics.pendingHrRequests },
    { detail: "Awaiting approval", helpKey: "pendingApprovals" as const, label: "Pending Approvals", value: data.metrics.pendingApprovals },
    { detail: "Vacant or partially filled", helpKey: "openVacancies" as const, label: "Open Vacancies", value: data.metrics.openVacancies },
    { detail: "Validation and draft payslip issues", helpKey: "payrollReadinessIssues" as const, label: "Payroll Readiness Issues", value: data.metrics.payrollReadinessIssues },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Employee-centric HR operations dashboard with quick actions, tasks, and alerts."
        help={resolveHrPageHelp("dashboard")}
        title="HR Dashboard"
      />
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <MetricCard detail={card.detail} helpKey={card.helpKey} key={card.label} label={card.label} value={card.value} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="font-medium">Quick Actions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  className="rounded-md border bg-[hsl(var(--background))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="font-medium">Alerts</h2>
            <div className="mt-4 space-y-2">
              {data.alerts.length === 0 ? (
                <EmptyState message="No active alerts." />
              ) : (
                data.alerts.map((alert) => (
                  <p className="rounded-md border px-3 py-2 text-sm" key={alert.id}>
                    {alert.label}
                  </p>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="font-medium">Recent Employee Changes</h2>
            <ul className="mt-4 space-y-2">
              {data.recentChanges.length === 0 ? (
                <li className="text-sm text-muted-foreground">No recent timeline events.</li>
              ) : (
                data.recentChanges.map((entry) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={entry.id}>
                    <span>{entry.label}</span>
                    <span className="text-muted-foreground">{new Date(entry.occurredAt).toLocaleDateString()}</span>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="font-medium">Pending Approvals</h2>
            <ul className="mt-4 space-y-2">
              {data.pendingApprovals.length === 0 ? (
                <li className="text-sm text-muted-foreground">No pending approvals.</li>
              ) : (
                data.pendingApprovals.map((item) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={item.id}>
                    <span>{item.label}</span>
                    <span className="rounded-full border px-2 py-0.5 text-xs">{item.status}</span>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      </div>
    </PageContainer>
  );
}
