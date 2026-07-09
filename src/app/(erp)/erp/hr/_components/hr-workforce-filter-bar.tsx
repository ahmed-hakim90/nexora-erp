"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { translateHrStatus } from "@/features/hr/public-api";
import { Button, DatePicker, EntityLookup, Input, nativeSelectClassName, useTranslations } from "@/shared/ui";

export function HrWorkforceFilterBar({
  action,
  basePath,
  children,
  query,
  resetHref,
}: Readonly<{
  action?: string;
  basePath: string;
  children?: ReactNode;
  query?: Record<string, string | undefined>;
  resetHref?: string;
}>) {
  const t = useTranslations();
  const resolvedAction = action ?? basePath;
  const resolvedReset = resetHref ?? basePath;

  return (
    <form action={resolvedAction} className="space-y-3" method="get">
      {query?.tab ? <input name="tab" type="hidden" value={query.tab} /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">{children}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary">
          {t("hr.common.applyFilters")}
        </Button>
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href={resolvedReset}>
          {t("hr.common.resetFilters")}
        </Link>
      </div>
    </form>
  );
}

export function HrWorkforceEmployeeFilter({
  defaultValue,
  name = "employeeId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  const t = useTranslations();
  return <EntityLookup label={t("hr.common.employee")} name={name} providerKey="hr.employees.lookup" value={defaultValue} />;
}

export function HrWorkforceDepartmentFilter({
  defaultValue,
  name = "departmentId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  const t = useTranslations();
  return <EntityLookup label={t("hr.common.department")} name={name} providerKey="hr.org-units.lookup" value={defaultValue} />;
}

export function HrWorkforceBranchFilter({
  defaultValue,
  name = "branchId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  const t = useTranslations();
  return <EntityLookup label={t("hr.common.branch")} name={name} providerKey="hr.branches.lookup" value={defaultValue} />;
}

export function HrWorkforceStatusFilter({
  defaultValue,
  name = "status",
  options,
}: Readonly<{
  defaultValue?: string;
  name?: string;
  options: readonly { label: string; value: string }[];
}>) {
  const t = useTranslations();
  return (
    <select className={nativeSelectClassName} defaultValue={defaultValue ?? ""} name={name}>
      <option value="">{t("hr.common.allStatuses")}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {translateHrStatus(t, option.label)}
        </option>
      ))}
    </select>
  );
}

export function HrWorkforceDateRangeFilters({
  endName = "periodEnd",
  endValue,
  startName = "periodStart",
  startValue,
}: Readonly<{
  endName?: string;
  endValue?: string;
  startName?: string;
  startValue?: string;
}>) {
  const t = useTranslations();
  return (
    <>
      <DatePicker defaultValue={startValue} name={startName} placeholder={t("hr.common.fromDate")} />
      <DatePicker defaultValue={endValue} name={endName} placeholder={t("hr.common.toDate")} />
    </>
  );
}

export function HrWorkforceSearchFilter({
  defaultValue,
  name = "search",
  placeholder,
}: Readonly<{ defaultValue?: string; name?: string; placeholder?: string }>) {
  const t = useTranslations();
  return <Input defaultValue={defaultValue ?? ""} name={name} placeholder={placeholder ?? t("hr.common.search")} />;
}
