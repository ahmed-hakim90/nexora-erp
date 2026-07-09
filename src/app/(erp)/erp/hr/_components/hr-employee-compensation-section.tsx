"use client";

import Link from "next/link";
import { useState } from "react";

import {
  clearEmployeeBasicSalaryAction,
  upsertEmployeeBasicSalaryAction,
} from "@/features/hr/routes/actions/hr-compensation.actions";
import type { HrEmployeeProfileData } from "@/features/hr/routes/loaders/hr-employee-profile.loader";
import {
  Button,
  EditableSectionCard,
  Input,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

function formatAmount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function HrEmployeeCompensationSection({
  compensation,
  employeeId,
  employeeName,
  financialSummary,
}: Readonly<{
  compensation: HrEmployeeProfileData["compensation"];
  employeeId: string;
  employeeName: string;
  financialSummary: HrEmployeeProfileData["financialSummary"];
}>) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [draftBasicSalary, setDraftBasicSalary] = useState(
    compensation.basicSalaryOverride !== null ? String(compensation.basicSalaryOverride) : "",
  );

  const sourceLabel =
    compensation.basicSalarySource === "profile"
      ? t("hr.employees.compensation.source.profile")
      : compensation.basicSalarySource === "package"
        ? t("hr.employees.compensation.source.package")
        : t("hr.employees.compensation.source.none");

  const allowanceLines = compensation.packageLines.filter(
    (line) => line.categoryKey !== "basic_salary" && line.source === "package",
  );

  return (
    <div className="space-y-4">
      {compensation.hasConflict && compensation.conflictMessage ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {compensation.conflictMessage}
        </p>
      ) : null}

      {compensation.missingCompensation ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          {t("hr.employees.compensation.missing")}
        </p>
      ) : null}

      <EditableSectionCard
        actions={
          compensation.canEdit && isEditing ? (
            <Button onClick={() => setIsEditing(false)} size="sm" type="button" variant="secondary">
              {t("hr.common.cancel")}
            </Button>
          ) : undefined
        }
        description={t("hr.employees.compensation.description")}
        onEdit={compensation.canEdit && !isEditing ? () => setIsEditing(true) : undefined}
        title={t("hr.employees.compensation.title")}
      >
        {isEditing && compensation.canEdit ? (
          <form action={upsertEmployeeBasicSalaryAction} className="space-y-4">
            <input name="employeeId" type="hidden" value={employeeId} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t("hr.employees.compensation.basicSalary")}</span>
                <Input
                  min="0"
                  name="basicSalary"
                  onChange={(event) => setDraftBasicSalary(event.target.value)}
                  placeholder={t("hr.employees.compensation.basicSalaryPlaceholder")}
                  step="0.01"
                  type="number"
                  value={draftBasicSalary}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary">
                {t("hr.common.saveChanges")}
              </Button>
              {compensation.basicSalaryOverride !== null ? (
                <Button
                  formAction={clearEmployeeBasicSalaryAction.bind(null, employeeId)}
                  type="submit"
                  variant="secondary"
                >
                  {t("hr.employees.compensation.clearOverride")}
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <InfoRow
              label={t("hr.employees.compensation.basicSalary")}
              value={formatAmount(compensation.resolvedBasicSalary)}
            />
            <InfoRow label={t("hr.employees.compensation.source")} value={sourceLabel} />
            <InfoRow
              label={t("hr.employees.compensation.salaryPackage")}
              value={compensation.salaryPackageLabel ?? t("hr.employees.compensation.noPackage")}
            />
            <InfoRow
              label={t("hr.employees.compensation.packageAllowances")}
              value={formatAmount(compensation.packageAllowanceTotal)}
            />
            <InfoRow
              label={t("hr.employees.compensation.resolvedMonthlyTotal")}
              value={formatAmount(compensation.resolvedMonthlyTotal)}
            />
            <InfoRow
              label={t("hr.employees.compensation.hourlyRate")}
              value={formatAmount(compensation.hourlyRate)}
            />
          </div>
        )}

        {allowanceLines.length > 0 ? (
          <div className="mt-4 space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">{t("hr.employees.compensation.packageLines")}</p>
            {allowanceLines.map((line) => (
              <div className="flex items-center justify-between text-sm" key={`${line.code}-${line.name}`}>
                <span>
                  {line.code} — {line.name}
                </span>
                <span>{formatAmount(line.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </EditableSectionCard>

      <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
        <div className="space-y-2">
          <InfoRow label={t("hr.employees.profile.activeAdvances")} value={String(financialSummary.activeAdvances)} />
          <InfoRow label={t("hr.employees.profile.activeLoans")} value={String(financialSummary.activeLoans)} />
          <InfoRow label={t("hr.employees.profile.pendingBonuses")} value={String(financialSummary.pendingBonuses)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className={secondaryButtonLinkClassName} href={`/erp/hr/advances?search=${encodeURIComponent(employeeName)}`}>
            {t("hr.advances.title")}
          </Link>
          <Link className={secondaryButtonLinkClassName} href={`/erp/hr/loans?search=${encodeURIComponent(employeeName)}`}>
            {t("hr.loans.title")}
          </Link>
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/compensation?tab=assignments">
            {t("hr.employees.profile.assignSalaryPackage")}
          </Link>
        </div>
      </article>
    </div>
  );
}
