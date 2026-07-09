"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { HrEmployeesWorkspaceData } from "@/features/hr/routes/loaders/hr-employees.loader";
import { formatHrStatusLabel } from "@/features/hr/public-api";
import {
  archiveEmployeeAction,
  duplicateEmployeeAction,
  restoreEmployeeAction,
} from "@/features/hr/routes/actions/hr-operational.actions";
import {
  bulkArchiveEmployeesAction,
  bulkExportEmployeesAction,
} from "@/features/hr/routes/actions/hr-employees.actions";
import {
  Button,
  EnterpriseDataTable,
  Input,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

import { buildHrEmployeesExportHref, buildHrEmployeesHref } from "./hr-employees-href";

function EmployeeAvatar({ name }: Readonly<{ name: string }>) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-full border bg-[hsl(var(--muted))] text-xs font-medium">
      {initials || "HR"}
    </span>
  );
}

function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HrEmployeesTable({
  data,
  query,
}: Readonly<{
  data: HrEmployeesWorkspaceData;
  query: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(query.search ?? "");

  const handleBulkArchive = () => {
    if (selectedRowIds.length === 0) return;
    startTransition(async () => {
      try {
        setActionError(null);
        await bulkArchiveEmployeesAction(selectedRowIds);
        setSelectedRowIds([]);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not archive selected employees.");
      }
    });
  };

  const handleBulkExport = () => {
    if (selectedRowIds.length === 0) return;
    startTransition(async () => {
      try {
        setActionError(null);
        const csv = await bulkExportEmployeesAction(selectedRowIds);
        downloadCsv(csv, `hr-employees-selected-${new Date().toISOString().slice(0, 10)}.csv`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not export selected employees.");
      }
    });
  };

  const applySearch = () => {
    router.push(buildHrEmployeesHref(query, { search: searchValue || undefined }));
  };

  const runRowAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        setActionError(null);
        await action();
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Action failed.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {actionError ? <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{actionError}</p> : null}
      {selectedRowIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {t("hr.employees.bulk.selected", { count: selectedRowIds.length })}
          </span>
          <Button disabled={isPending} onClick={handleBulkArchive} size="sm" type="button" variant="secondary">
            {t("hr.employees.bulk.archiveSelected")}
          </Button>
          <Button disabled={isPending} onClick={handleBulkExport} size="sm" type="button" variant="secondary">
            {t("hr.employees.bulk.exportSelected")}
          </Button>
          <Button disabled={isPending} onClick={() => setSelectedRowIds([])} size="sm" type="button" variant="secondary">
            {t("hr.employees.bulk.clearSelection")}
          </Button>
        </div>
      ) : null}

      <EnterpriseDataTable
        bulkActions={[
          {
            href: buildHrEmployeesExportHref(query),
            isDisabled: isPending,
            key: "export",
            label: t("hr.employees.bulk.exportFiltered"),
          },
        ]}
        columns={[
          {
            header: t("hr.employees.column.employee"),
            isPinned: "start",
            key: "employee",
            minWidth: "16rem",
            render: (record) => (
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={record.fullName} />
                <div>
                  <p className="font-medium">{record.fullName}</p>
                  <p className="text-xs text-muted-foreground">{record.employeeNumber}</p>
                </div>
              </div>
            ),
          },
          {
            header: t("hr.employees.column.employeeCode"),
            key: "employeeNumber",
            render: (record) => record.employeeNumber || "—",
          },
          {
            header: t("hr.employees.column.position"),
            key: "position",
            render: (record) => record.assignment.position?.label ?? "—",
          },
          {
            header: t("hr.employees.column.department"),
            key: "department",
            render: (record) => record.assignment.department?.label ?? "—",
          },
          {
            header: t("hr.employees.column.manager"),
            key: "manager",
            render: (record) => record.assignment.manager?.label ?? "—",
          },
          {
            header: t("hr.employees.column.branch"),
            key: "branch",
            render: (record) => record.branchLabel ?? "—",
          },
          {
            header: t("hr.employees.column.employmentStatus"),
            key: "status",
            render: (record) => formatHrStatusLabel(record.employmentStatus),
          },
          {
            header: t("hr.employees.column.contractStatus"),
            key: "contractStatus",
            render: (record) => (record.contractStatus ? formatHrStatusLabel(record.contractStatus) : "—"),
          },
        ]}
        enableRowSelection
        emptyMessage={t("hr.employees.empty")}
        exportAction={
          <a className={secondaryButtonLinkClassName} href={buildHrEmployeesExportHref(query)}>
            {t("hr.common.exportCsv")}
          </a>
        }
        getRowId={(record) => record.id}
        onRowOpen={(record) => router.push(`/erp/hr/employees/${record.id}`)}
        onSelectedRowIdsChange={(ids) => setSelectedRowIds([...ids])}
        pagination={{ mode: "cursor", nextCursor: data.nextCursor, pageSize: data.pageSize }}
        records={data.records}
        rowActions={(record) => [
          { href: `/erp/hr/employees/${record.id}`, key: "view", label: t("hr.common.view") },
          { href: buildHrEmployeesHref(query, { edit: record.id }), key: "edit", label: t("hr.common.edit") },
          {
            href: `/erp/hr/assignments?employeeId=${record.id}&create=1`,
            key: "assignment",
            label: t("hr.employees.row.assignment"),
          },
          ...(record.employmentStatus !== "archived"
            ? [{
                isDisabled: isPending,
                key: "archive",
                label: t("hr.employees.row.archive"),
                onClick: () => runRowAction(() => archiveEmployeeAction(record.id)),
              }]
            : [{
                isDisabled: isPending,
                key: "restore",
                label: t("hr.employees.row.restore"),
                onClick: () => runRowAction(() => restoreEmployeeAction(record.id)),
              }]),
          {
            isDisabled: isPending,
            key: "duplicate",
            label: t("hr.employees.row.duplicate"),
            onClick: () => runRowAction(() => duplicateEmployeeAction(record.id)),
          },
        ]}
        savedViews={[
          {
            href: buildHrEmployeesHref(query, { status: null }),
            isActive: !query.status,
            key: "all",
            label: t("hr.employees.view.all"),
          },
          {
            href: buildHrEmployeesHref(query, { status: "active" }),
            isActive: query.status === "active",
            key: "active",
            label: t("hr.employees.view.active"),
          },
          {
            href: buildHrEmployeesHref(query, { status: "archived" }),
            isActive: query.status === "archived",
            key: "archived",
            label: t("hr.employees.view.archived"),
          },
        ]}
        searchSlot={
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <Input
              aria-label={t("hr.employees.search.aria")}
              className="h-9 min-w-0 flex-1 rounded-lg"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("hr.employees.search.placeholder")}
              value={searchValue}
            />
            <Button
              aria-label={t("hr.common.search")}
              className="size-9 shrink-0 rounded-lg p-0"
              size="sm"
              title={t("hr.common.search")}
              type="submit"
              variant="secondary"
            >
              <Search aria-hidden className="size-4" />
            </Button>
          </form>
        }
        selectedRowIds={selectedRowIds}
        state={{ globalSearch: query.search }}
        stickyFirstColumn
        stickyHeader
      />
    </div>
  );
}
