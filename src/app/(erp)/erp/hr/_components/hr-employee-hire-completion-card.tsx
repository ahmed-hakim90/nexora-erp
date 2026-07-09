"use client";

import Link from "next/link";

import type { HrEmployeeHireReadiness } from "@/features/hr/application/services/hr-employee-hire-readiness.service";
import { cn, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";
import { CheckCircle2, Circle, CircleAlert } from "lucide-react";

export function HrEmployeeHireCompletionCard({
  employeeId,
  hireReadiness,
}: Readonly<{
  employeeId: string;
  hireReadiness: HrEmployeeHireReadiness;
}>) {
  const t = useTranslations();

  if (hireReadiness.mandatoryComplete && hireReadiness.lifecycleState !== "onboarding") {
    return null;
  }

  const pendingItems = hireReadiness.items.filter((item) => item.mandatory && !item.complete);
  const profileItems = hireReadiness.items.filter((item) => item.phase === "profile" && !item.complete);

  return (
    <article
      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm"
      id="hire-completion-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("hr.employees.hireReadiness.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("hr.employees.hireReadiness.description")}</p>
        </div>
        <div className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-sm font-medium">
          {t("hr.employees.hireReadiness.progress", { percent: hireReadiness.completionPercent })}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {pendingItems.map((item) => (
          <li className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--border))]/70 px-3 py-2 text-sm" key={item.key}>
            <span className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-amber-500" />
              {t(item.titleKey)}
            </span>
            {item.href ? (
              <Link className={cn("text-sm", secondaryButtonLinkClassName)} href={item.href}>
                {t("hr.employees.hireReadiness.completeAction")}
              </Link>
            ) : null}
          </li>
        ))}
        {pendingItems.length === 0 ? (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t("hr.employees.hireReadiness.allMandatoryComplete")}
          </li>
        ) : null}
      </ul>

      {profileItems.length > 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-[hsl(var(--border))] p-3">
          <p className="text-sm font-medium">{t("hr.employees.hireReadiness.profileFollowUps")}</p>
          <ul className="mt-2 space-y-1">
            {profileItems.map((item) => (
              <li className="flex items-center justify-between gap-3 text-sm text-muted-foreground" key={item.key}>
                <span className="flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5" />
                  {t(item.titleKey)}
                </span>
                {item.href ? (
                  <Link className="text-[hsl(var(--accent))] hover:underline" href={item.href}>
                    {t("hr.common.openAction")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)}
        href={`/erp/hr/onboarding?employeeId=${employeeId}`}
      >
        {t("hr.employees.hireReadiness.openOnboarding")}
      </Link>
    </article>
  );
}
