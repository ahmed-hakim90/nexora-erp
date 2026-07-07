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
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Employee directory with assignment-resolved organization context. Search by name, code, attendance code, phone, email, or national ID."
        help={resolveHrPageHelp("employees")}
        title="Employees"
      >
        <PageActions>
          <Link className={secondaryButtonLinkClassName} href={buildHrEmployeesHref(query, { import: "1" })}>
            Import CSV
          </Link>
          <a className={secondaryButtonLinkClassName} href="/api/hr/employees/import-template">
            Import template
          </a>
          <a className={secondaryButtonLinkClassName} href={buildHrEmployeesExportHref(query)}>
            Export CSV
          </a>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
            href={buildHrEmployeesHref(query, { wizard: "1" })}
          >
            Add Employee
          </Link>
        </PageActions>
      </PageHeader>
      <div className="space-y-4">
        {errorMessage ? <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{errorMessage}</p> : null}

        <PageFilters>
          <form action="/erp/hr/employees" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input defaultValue={query.search ?? ""} name="search" placeholder="Name, code, attendance code, phone, email, national ID" />
            <select className={nativeSelectClassName} defaultValue={query.status ?? ""} name="status">
              <option value="">All statuses</option>
              {data.statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatHrStatusLabel(status)}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.departmentId ?? ""} name="departmentId">
              <option value="">All departments</option>
              {data.departmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} defaultValue={query.positionId ?? ""} name="positionId">
              <option value="">All positions</option>
              {data.positionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
        </PageFilters>

        <HrEmployeesTable data={data} query={query} />

        {data.nextCursor ? (
          <div className="flex justify-end">
            <Link className={secondaryButtonLinkClassName} href={buildHrEmployeesHref(query, { cursor: data.nextCursor })}>
              Load more
            </Link>
          </div>
        ) : null}
      </div>

      {query.wizard === "1" ? <HrEmployeeWizardDialog query={query} /> : null}
      {query.import === "1" ? <HrEmployeesImportDialog query={query} /> : null}
    </PageContainer>
  );
}
