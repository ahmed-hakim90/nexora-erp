"use client";

import Link from "next/link";

import type { HrEmployeesWorkspaceData } from "@/features/hr/routes/loaders/hr-employees.loader";
import { formatHrStatusLabel, resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  Input,
  PageActions,
  PageContainer,
  PageFilters,
  PageHeader,
  secondaryButtonLinkClassName,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

import { HrEmployeeWizardDialog } from "./hr-employee-wizard";
import { buildHrEmployeesExportHref, buildHrEmployeesHref } from "./hr-employees-href";
import { HrEmployeesImportDialog } from "./hr-employees-import-dialog";
import { HrEmployeesTable } from "./hr-employees-table";

export function HrEmployeesWorkspace({
  data,
  errorMessage,
  query,
}: Readonly<{
  data: HrEmployeesWorkspaceData;
  errorMessage?: string;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.employees.description")}
        help={resolveHrPageHelp("employees")}
        title={t("hr.employees.title")}
      >
        <PageActions>
          <Link className={secondaryButtonLinkClassName} href={buildHrEmployeesHref(query, { import: "1" })}>
            {t("hr.employees.importExcel")}
          </Link>
          <a className={secondaryButtonLinkClassName} href="/api/hr/employees/import-template">
            {t("hr.employees.arabicTemplate")}
          </a>
          <a className={secondaryButtonLinkClassName} href={buildHrEmployeesExportHref(query)}>
            {t("hr.common.exportCsv")}
          </a>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
            href={buildHrEmployeesHref(query, { wizard: "1" })}
          >
            {t("hr.employees.add")}
          </Link>
        </PageActions>
      </PageHeader>
      <div className="space-y-4">
        {errorMessage ? <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{errorMessage}</p> : null}

        <PageFilters>
          {query.unassigned === "1" ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/40 px-3 py-2 text-sm">
              <span>{t("hr.employees.filter.unassignedActive")}</span>
              <Link className="text-[hsl(var(--accent))] hover:underline" href={buildHrEmployeesHref(query, { unassigned: null })}>
                {t("hr.common.clearFilter")}
              </Link>
            </div>
          ) : null}
          <form action="/erp/hr/employees" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input defaultValue={query.search ?? ""} name="search" placeholder={t("hr.employees.filter.search")} />
            <select className={nativeSelectClassName} defaultValue={query.status ?? ""} name="status">
              <option value="">{t("hr.employees.filter.allStatuses")}</option>
              {data.statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatHrStatusLabel(status)}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.departmentId ?? ""} name="departmentId">
              <option value="">{t("hr.employees.filter.allDepartments")}</option>
              {data.departmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.positionId ?? ""} name="positionId">
              <option value="">{t("hr.employees.filter.allPositions")}</option>
              {data.positionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              {t("hr.common.applyFilters")}
            </Button>
          </form>
        </PageFilters>

        <HrEmployeesTable data={data} query={query} />

        {data.nextCursor ? (
          <div className="flex justify-end">
            <Link className={secondaryButtonLinkClassName} href={buildHrEmployeesHref(query, { cursor: data.nextCursor })}>
              {t("hr.employees.loadMore")}
            </Link>
          </div>
        ) : null}
      </div>

      {query.wizard === "1" ? <HrEmployeeWizardDialog query={query} wizardContext={data.wizardContext} /> : null}
      {query.import === "1" ? <HrEmployeesImportDialog query={query} /> : null}
    </PageContainer>
  );
}
