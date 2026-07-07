"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button, DatePicker, EntityLookup, Input, nativeSelectClassName } from "@/shared/ui";

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
  const resolvedAction = action ?? basePath;
  const resolvedReset = resetHref ?? basePath;

  return (
    <form action={resolvedAction} className="space-y-3" method="get">
      {query?.tab ? <input name="tab" type="hidden" value={query.tab} /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">{children}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary">
          Apply filters
        </Button>
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href={resolvedReset}>
          Reset filters
        </Link>
      </div>
    </form>
  );
}

export function HrWorkforceEmployeeFilter({
  defaultValue,
  name = "employeeId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  return <EntityLookup label="Employee" name={name} providerKey="hr.employees.lookup" value={defaultValue} />;
}

export function HrWorkforceDepartmentFilter({
  defaultValue,
  name = "departmentId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  return <EntityLookup label="Department" name={name} providerKey="hr.org-units.lookup" value={defaultValue} />;
}

export function HrWorkforceBranchFilter({
  defaultValue,
  name = "branchId",
}: Readonly<{ defaultValue?: string; name?: string }>) {
  return <EntityLookup label="Branch" name={name} providerKey="hr.branches.lookup" value={defaultValue} />;
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
  return (
    <select className={nativeSelectClassName} defaultValue={defaultValue ?? ""} name={name}>
      <option value="">All statuses</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
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
  return (
    <>
      <DatePicker defaultValue={startValue} name={startName} placeholder="From date" />
      <DatePicker defaultValue={endValue} name={endName} placeholder="To date" />
    </>
  );
}

export function HrWorkforceSearchFilter({
  defaultValue,
  name = "search",
  placeholder = "Search",
}: Readonly<{ defaultValue?: string; name?: string; placeholder?: string }>) {
  return <Input defaultValue={defaultValue ?? ""} name={name} placeholder={placeholder} />;
}
