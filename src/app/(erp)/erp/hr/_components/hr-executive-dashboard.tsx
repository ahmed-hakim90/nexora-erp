"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  Briefcase,
  Clock3,
  FileWarning,
  Timer,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import type { HrExecutiveDashboardData } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { translateHrStatus } from "@/features/hr/public-api";
import { EmptyState, KpiCard, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

import { resolveHrDashboardActionQueueLabel } from "./hr-dashboard-labels";

type ExecutiveKpi = Readonly<{
  helperText: string;
  href?: string;
  icon: typeof Users;
  label: string;
  value: number;
}>;

function severityClassName(severity: "info" | "warning" | "error") {
  if (severity === "error") return "border-[hsl(var(--danger))]/30 bg-[hsl(var(--danger))]/5 text-[hsl(var(--danger))]";
  if (severity === "warning") return "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 text-[hsl(var(--warning))]";
  return "border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/40 text-foreground";
}

export function HrExecutiveDashboardWorkspace({ data }: Readonly<{ data: HrExecutiveDashboardData }>) {
  const t = useTranslations();

  const workforceKpis: ExecutiveKpi[] = useMemo(
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
        helperText: t("hr.dashboard.kpi.openVacancies.helper"),
        href: "/erp/hr/positions-jobs",
        icon: Briefcase,
        label: t("hr.dashboard.kpi.openVacancies"),
        value: data.metrics.openVacancies,
      },
      {
        helperText: t("hr.dashboard.executive.kpi.payrollRuns.helper"),
        href: "/erp/hr/payroll-readiness",
        icon: Wallet,
        label: t("hr.dashboard.executive.kpi.payrollRuns"),
        value: data.payrollRuns,
      },
    ],
    [data.metrics.activeEmployees, data.metrics.openVacancies, data.metrics.totalEmployees, data.payrollRuns, t],
  );

  const complianceKpis: ExecutiveKpi[] = useMemo(
    () => [
      {
        helperText: t("hr.dashboard.kpi.payrollIssues.helper"),
        href: "/erp/hr/payroll-readiness",
        icon: FileWarning,
        label: t("hr.dashboard.kpi.payrollIssues"),
        value: data.metrics.payrollReadinessIssues,
      },
      {
        helperText: t("hr.dashboard.kpi.hrApprovals.helper"),
        href: "/erp/hr/requests",
        icon: AlertTriangle,
        label: t("hr.dashboard.kpi.hrApprovals"),
        value: data.metrics.pendingApprovals,
      },
      {
        helperText: t("hr.dashboard.kpi.pendingLeave.helper"),
        href: "/erp/hr/leave",
        icon: Clock3,
        label: t("hr.dashboard.kpi.pendingLeave"),
        value: data.metrics.pendingLeaveApprovals,
      },
      {
        helperText: t("hr.dashboard.kpi.otCandidates.helper"),
        href: "/erp/hr/overtime?tab=candidates",
        icon: Timer,
        label: t("hr.dashboard.kpi.otCandidates"),
        value: data.metrics.pendingOvertimeCandidates,
      },
    ],
    [
      data.metrics.payrollReadinessIssues,
      data.metrics.pendingApprovals,
      data.metrics.pendingLeaveApprovals,
      data.metrics.pendingOvertimeCandidates,
      t,
    ],
  );

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.dashboard.executive.description")} title={t("hr.dashboard.executive.title")} />
      <section className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("hr.dashboard.section.workforce")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workforceKpis.map((kpi) => (
              <KpiCard
                helperText={kpi.helperText}
                href={kpi.href}
                icon={kpi.icon}
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("hr.dashboard.section.compliance")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {complianceKpis.map((kpi) => (
              <KpiCard
                helperText={kpi.helperText}
                href={kpi.href}
                icon={kpi.icon}
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
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
        </div>
      </section>
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
