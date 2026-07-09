"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Building2, Clock3, Timer, UserCheck, UserX, Users } from "lucide-react";

import type { HrDepartmentDashboardData } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { EmptyState, KpiCard, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

function employeesHref(options?: Readonly<{ departmentId?: string; unassigned?: boolean }>): string {
  const params = new URLSearchParams({ status: "active" });
  if (options?.departmentId) {
    params.set("departmentId", options.departmentId);
  }
  if (options?.unassigned) {
    params.set("unassigned", "1");
  }
  return `/erp/hr/employees?${params.toString()}`;
}

export function HrDepartmentDashboardWorkspace({ data }: Readonly<{ data: HrDepartmentDashboardData }>) {
  const t = useTranslations();

  const summaryKpis = useMemo(
    () =>
      [
        {
          helperText: t("hr.dashboard.kpi.activeEmployees.helper"),
          href: "/erp/hr/employees?status=active",
          icon: UserCheck,
          label: t("hr.dashboard.department.kpi.companyActive"),
          value: data.activeEmployees,
        },
        {
          helperText: t("hr.dashboard.department.kpi.unassigned.helper"),
          href: employeesHref({ unassigned: true }),
          icon: UserX,
          label: t("hr.dashboard.department.kpi.unassigned"),
          value: data.unassignedActiveEmployees,
        },
        {
          helperText: t("hr.dashboard.kpi.pendingLeave.helper"),
          href: "/erp/hr/leave",
          icon: Clock3,
          label: t("hr.dashboard.kpi.pendingLeave"),
          value: data.pendingLeaveApprovals,
        },
        {
          helperText: t("hr.dashboard.kpi.otCandidates.helper"),
          href: "/erp/hr/overtime?tab=candidates",
          icon: Timer,
          label: t("hr.dashboard.kpi.otCandidates"),
          value: data.pendingOvertimeCandidates,
        },
        {
          helperText: t("hr.dashboard.kpi.lateEarlyPending.helper"),
          href: "/erp/hr/late-early",
          icon: Users,
          label: t("hr.dashboard.kpi.lateEarlyPending"),
          value: data.pendingLateEarlyViolations,
        },
      ] as const,
    [
      data.activeEmployees,
      data.pendingLateEarlyViolations,
      data.pendingLeaveApprovals,
      data.pendingOvertimeCandidates,
      data.unassignedActiveEmployees,
      t,
    ],
  );

  const sortedDepartments = useMemo(
    () => [...data.departments].sort((left, right) => right.headcount - left.headcount || left.label.localeCompare(right.label)),
    [data.departments],
  );

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.dashboard.department.description")} title={t("hr.dashboard.department.title")} />
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryKpis.map((kpi) => (
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

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-4 py-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{t("hr.dashboard.department.widget.headcount")}</h2>
          </div>
          {sortedDepartments.length === 0 ? (
            <div className="p-6">
              <EmptyState description={t("hr.dashboard.department.empty.departments")} title={t("hr.dashboard.department.empty.departmentsTitle")} />
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border))]">
              {data.unassignedActiveEmployees > 0 ? (
                <li>
                  <Link
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-[hsl(var(--muted))]/40"
                    href={employeesHref({ unassigned: true })}
                  >
                    <span className="font-medium text-foreground">{t("hr.dashboard.department.kpi.unassigned")}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {data.unassignedActiveEmployees} {t("hr.dashboard.department.headcountLabel")}
                    </span>
                  </Link>
                </li>
              ) : null}
              {sortedDepartments.map((department) => (
                <li key={department.departmentId}>
                  <Link
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-[hsl(var(--muted))]/40"
                    href={employeesHref({ departmentId: department.departmentId })}
                  >
                    <span className="font-medium text-foreground">{department.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {department.headcount} {t("hr.dashboard.department.headcountLabel")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageContainer>
  );
}
