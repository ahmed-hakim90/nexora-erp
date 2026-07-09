"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  Briefcase,
  Cake,
  CalendarClock,
  Clock3,
  FileWarning,
  PartyPopper,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";

import type { HrDashboardData } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { resolveHrPageHelp, translateHrStatus, translateHrTimelineEvent } from "@/features/hr/public-api";
import { EmptyState, KpiCard, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

import { resolveHrDashboardActionQueueLabel } from "./hr-dashboard-labels";

type DashboardKpi = Readonly<{
  helperText: string;
  href?: string;
  icon: typeof Users;
  label: string;
  value: number;
}>;

function DashboardKpiCard({ helperText, href, icon, label, value }: DashboardKpi) {
  return <KpiCard helperText={helperText} href={href} icon={icon} label={label} value={value} />;
}

function severityClassName(severity: "info" | "warning" | "error") {
  if (severity === "error") return "border-[hsl(var(--danger))]/30 bg-[hsl(var(--danger))]/5 text-[hsl(var(--danger))]";
  if (severity === "warning") return "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 text-[hsl(var(--warning))]";
  return "border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/40 text-foreground";
}

export function HrDashboardWorkspace({ data }: Readonly<{ data: HrDashboardData }>) {
  const t = useTranslations();

  const quickActions = useMemo(
    () =>
      [
        { href: "/erp/hr/employees?wizard=1", label: t("hr.dashboard.quick.addEmployee") },
        { href: "/erp/hr/leave?create=1", label: t("hr.dashboard.quick.submitLeave") },
        { href: "/erp/hr/attendance-live", label: t("hr.dashboard.quick.attendanceLive") },
        { href: "/erp/hr/overtime?tab=candidates", label: t("hr.dashboard.quick.processOvertime") },
        { href: "/erp/hr/late-early", label: t("hr.dashboard.quick.lateEarly") },
        { href: "/erp/hr/payroll-readiness", label: t("hr.dashboard.quick.payrollReadiness") },
        { href: "/erp/hr/contracts?create=1", label: t("hr.dashboard.quick.createContract") },
        { href: "/erp/hr/documents?upload=1", label: t("hr.dashboard.quick.uploadDocument") },
        { href: "/erp/hr/requests?create=1", label: t("hr.dashboard.quick.createHrRequest") },
      ] as const,
    [t],
  );

  const workforceKpis: DashboardKpi[] = useMemo(
    () => [
      {
        helperText: t("hr.dashboard.kpi.totalEmployees.helper"),
        href: "/erp/hr/employees",
        icon: Users,
        label: t("hr.dashboard.kpi.totalEmployees"),
        value: data.metrics.totalEmployees,
      },
      {
        helperText: t("hr.dashboard.kpi.activeEmployees.helper"),
        href: "/erp/hr/employees",
        icon: UserCheck,
        label: t("hr.dashboard.kpi.activeEmployees"),
        value: data.metrics.activeEmployees,
      },
      {
        helperText: t("hr.dashboard.kpi.newHires.helper"),
        href: "/erp/hr/employees",
        icon: Users,
        label: t("hr.dashboard.kpi.newHires"),
        value: data.metrics.newHires,
      },
      {
        helperText: t("hr.dashboard.kpi.onProbation.helper"),
        href: "/erp/hr/employees",
        icon: Clock3,
        label: t("hr.dashboard.kpi.onProbation"),
        value: data.metrics.onProbation,
      },
      {
        helperText: t("hr.dashboard.kpi.openVacancies.helper"),
        href: "/erp/hr/positions-jobs",
        icon: Briefcase,
        label: t("hr.dashboard.kpi.openVacancies"),
        value: data.metrics.openVacancies,
      },
    ],
    [data.metrics, t],
  );

  const operationsKpis: DashboardKpi[] = useMemo(
    () => [
      {
        helperText: t("hr.dashboard.kpi.pendingLeave.helper"),
        href: "/erp/hr/leave",
        icon: CalendarClock,
        label: t("hr.dashboard.kpi.pendingLeave"),
        value: data.metrics.pendingLeaveApprovals,
      },
      {
        helperText: t("hr.dashboard.kpi.onLeaveToday.helper"),
        href: "/erp/hr/leave",
        icon: Users,
        label: t("hr.dashboard.kpi.onLeaveToday"),
        value: data.metrics.employeesOnLeaveToday,
      },
      {
        helperText: t("hr.dashboard.kpi.attendanceExceptions.helper"),
        href: "/erp/hr/attendance-live",
        icon: AlertTriangle,
        label: t("hr.dashboard.kpi.attendanceExceptions"),
        value: data.metrics.openAttendanceExceptionsToday,
      },
      {
        helperText: t("hr.dashboard.kpi.otCandidates.helper"),
        href: "/erp/hr/overtime?tab=candidates",
        icon: Timer,
        label: t("hr.dashboard.kpi.otCandidates"),
        value: data.metrics.pendingOvertimeCandidates,
      },
      {
        helperText: t("hr.dashboard.kpi.lateEarlyPending.helper"),
        href: "/erp/hr/late-early",
        icon: Clock3,
        label: t("hr.dashboard.kpi.lateEarlyPending"),
        value: data.metrics.pendingLateEarlyViolations,
      },
    ],
    [data.metrics, t],
  );

  const complianceKpis: DashboardKpi[] = useMemo(
    () => [
      {
        helperText: t("hr.dashboard.kpi.contractsExpiring.helper"),
        href: "/erp/hr/contracts",
        icon: FileWarning,
        label: t("hr.dashboard.kpi.contractsExpiring"),
        value: data.metrics.contractsExpiringSoon,
      },
      {
        helperText: t("hr.dashboard.kpi.documentsExpiring.helper"),
        href: "/erp/hr/documents",
        icon: FileWarning,
        label: t("hr.dashboard.kpi.documentsExpiring"),
        value: data.metrics.documentsExpiringSoon,
      },
      {
        helperText: t("hr.dashboard.kpi.missingDocuments.helper"),
        href: "/erp/hr/documents?tab=compliance&complianceStatus=incomplete",
        icon: FileWarning,
        label: t("hr.dashboard.kpi.missingDocuments"),
        value: data.metrics.employeesWithMissingDocuments,
      },
      {
        helperText: t("hr.dashboard.kpi.payrollIssues.helper"),
        href: "/erp/hr/payroll-readiness",
        icon: AlertTriangle,
        label: t("hr.dashboard.kpi.payrollIssues"),
        value: data.metrics.payrollReadinessIssues,
      },
      {
        helperText: t("hr.dashboard.kpi.openPayrollPeriods.helper"),
        href: "/erp/hr/payroll-readiness",
        icon: CalendarClock,
        label: t("hr.dashboard.kpi.openPayrollPeriods"),
        value: data.metrics.openPayrollPeriods,
      },
      {
        helperText: t("hr.dashboard.kpi.tempAssignments.helper"),
        href: "/erp/hr/assignments",
        icon: Briefcase,
        label: t("hr.dashboard.kpi.tempAssignments"),
        value: data.metrics.temporaryAssignmentsActive,
      },
      {
        helperText: t("hr.dashboard.kpi.anniversaries.helper"),
        icon: PartyPopper,
        label: t("hr.dashboard.kpi.anniversaries"),
        value: data.metrics.workAnniversariesThisMonth,
      },
      {
        helperText: t("hr.dashboard.kpi.birthdays.helper"),
        icon: Cake,
        label: t("hr.dashboard.kpi.birthdays"),
        value: data.metrics.upcomingBirthdays,
      },
      {
        helperText: t("hr.dashboard.kpi.pendingHrRequests.helper"),
        href: "/erp/hr/requests",
        icon: FileWarning,
        label: t("hr.dashboard.kpi.pendingHrRequests"),
        value: data.metrics.pendingHrRequests,
      },
      {
        helperText: t("hr.dashboard.kpi.hrApprovals.helper"),
        href: "/erp/hr/requests",
        icon: UserCheck,
        label: t("hr.dashboard.kpi.hrApprovals"),
        value: data.metrics.pendingApprovals,
      },
    ],
    [data.metrics, t],
  );

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.dashboard.description")}
        help={resolveHrPageHelp("dashboard")}
        title={t("hr.dashboard.title")}
      />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("hr.dashboard.section.workforce")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {workforceKpis.map((kpi) => (
              <DashboardKpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("hr.dashboard.section.operations")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {operationsKpis.map((kpi) => (
              <DashboardKpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("hr.dashboard.section.compliance")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {complianceKpis.map((kpi) => (
              <DashboardKpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <WidgetContainer title={t("hr.dashboard.widget.quickActions")}>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
                  href={action.href}
                  key={action.href}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </WidgetContainer>

          <WidgetContainer title={t("hr.dashboard.widget.alerts")}>
            <div className="space-y-2">
              {data.alerts.length === 0 ? (
                <EmptyState message={t("hr.dashboard.empty.alerts")} />
              ) : (
                data.alerts.map((alert) => (
                  <Link
                    className={`block rounded-md border px-3 py-2 text-sm transition hover:opacity-90 ${severityClassName(alert.severity)}`}
                    href={alert.href}
                    key={alert.id}
                  >
                    {t(alert.labelKey, alert.labelParams)}
                  </Link>
                ))
              )}
            </div>
          </WidgetContainer>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <WidgetContainer title={t("hr.dashboard.widget.actionQueue")}>
            <ul className="space-y-2">
              {data.actionQueue.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("hr.dashboard.empty.actionQueue")}</li>
              ) : (
                data.actionQueue.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]/50"
                      href={item.href}
                    >
                      <span>{resolveHrDashboardActionQueueLabel(t, item)}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{translateHrStatus(t, item.status)}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </WidgetContainer>

          <WidgetContainer title={t("hr.dashboard.widget.birthdays")}>
            <ul className="space-y-2">
              {data.upcomingBirthdays.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("hr.dashboard.empty.birthdays")}</li>
              ) : (
                data.upcomingBirthdays.map((entry) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={entry.id}>
                    <Link className="hover:underline" href={`/erp/hr/employees/${entry.id}`}>
                      {entry.label}
                    </Link>
                    <span className="text-muted-foreground">
                      {entry.daysUntil === 0
                        ? t("hr.dashboard.birthday.today")
                        : t("hr.dashboard.birthday.inDays", { count: entry.daysUntil })}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </WidgetContainer>

          <WidgetContainer title={t("hr.dashboard.widget.anniversaries")}>
            <ul className="space-y-2">
              {data.workAnniversaries.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("hr.dashboard.empty.anniversaries")}</li>
              ) : (
                data.workAnniversaries.map((entry) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={entry.id}>
                    <Link className="hover:underline" href={`/erp/hr/employees/${entry.id}`}>
                      {entry.label}
                    </Link>
                    <span className="text-muted-foreground">{new Date(entry.hireDate).toLocaleDateString()}</span>
                  </li>
                ))
              )}
            </ul>
          </WidgetContainer>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <WidgetContainer title={t("hr.dashboard.widget.recentChanges")}>
            <ul className="space-y-2">
              {data.recentChanges.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("hr.dashboard.empty.recentChanges")}</li>
              ) : (
                data.recentChanges.map((entry) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={entry.id}>
                    <span>{translateHrTimelineEvent(t, entry.label)}</span>
                    <span className="text-muted-foreground">{new Date(entry.occurredAt).toLocaleDateString()}</span>
                  </li>
                ))
              )}
            </ul>
          </WidgetContainer>

          <WidgetContainer title={t("hr.dashboard.widget.pendingApprovals")}>
            <ul className="space-y-2">
              {data.pendingApprovals.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("hr.dashboard.empty.pendingApprovals")}</li>
              ) : (
                data.pendingApprovals.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]/50"
                      href={`/erp/hr/requests?edit=${item.id}`}
                    >
                      <span>{translateHrActionType(t, item.label)}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{translateHrStatus(t, item.status)}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </WidgetContainer>
        </section>
      </div>
    </PageContainer>
  );
}

function WidgetContainer({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--surface))] p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}
