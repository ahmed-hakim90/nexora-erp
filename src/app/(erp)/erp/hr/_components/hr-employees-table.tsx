"use client";

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
          <span className="text-muted-foreground">{selectedRowIds.length} selected</span>
          <Button disabled={isPending} onClick={handleBulkArchive} size="sm" type="button" variant="secondary">
            Archive selected
          </Button>
          <Button disabled={isPending} onClick={handleBulkExport} size="sm" type="button" variant="secondary">
            Export selected (CSV)
          </Button>
          <Button disabled={isPending} onClick={() => setSelectedRowIds([])} size="sm" type="button" variant="secondary">
            Clear selection
          </Button>
        </div>
      ) : null}

      <EnterpriseDataTable
        bulkActions={[
          { href: buildHrEmployeesExportHref(query), isDisabled: isPending, key: "export", label: "Export filtered list (CSV)" },
        ]}
        columns={[
          {
            header: "Employee",
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
            header: "Attendance Code / رمز الحضور",
            key: "attendanceCode",
            render: (record) => record.attendanceCode ?? "—",
          },
          { header: "Position", key: "position", render: (record) => record.assignment.position?.label ?? "—" },
          { header: "Department", key: "department", render: (record) => record.assignment.department?.label ?? "—" },
          { header: "Manager", key: "manager", render: (record) => record.assignment.manager?.label ?? "—" },
          { header: "Branch", key: "branch", render: (record) => record.branchLabel ?? "—" },
          { header: "Employment Status", key: "status", render: (record) => formatHrStatusLabel(record.employmentStatus) },
          {
            header: "Contract Status",
            key: "contractStatus",
            render: (record) => (record.contractStatus ? formatHrStatusLabel(record.contractStatus) : "—"),
          },
        ]}
        enableRowSelection
        emptyMessage="No employees found. Start by adding your first employee."
        exportAction={
          <a className={secondaryButtonLinkClassName} href={buildHrEmployeesExportHref(query)}>
            Export CSV
          </a>
        }
        getRowId={(record) => record.id}
        onRowOpen={(record) => router.push(`/erp/hr/employees/${record.id}`)}
        onSelectedRowIdsChange={(ids) => setSelectedRowIds([...ids])}
        pagination={{ mode: "cursor", nextCursor: data.nextCursor, pageSize: data.pageSize }}
        records={data.records}
        rowActions={(record) => [
          { href: `/erp/hr/employees/${record.id}`, key: "view", label: "View" },
          { href: buildHrEmployeesHref(query, { edit: record.id }), key: "edit", label: "Edit" },
          { href: `/erp/hr/assignments?employeeId=${record.id}&create=1`, key: "assignment", label: "Assignment" },
          ...(record.employmentStatus !== "archived"
            ? [{
                isDisabled: isPending,
                key: "archive",
                label: "Archive",
                onClick: () => runRowAction(() => archiveEmployeeAction(record.id)),
              }]
            : [{
                isDisabled: isPending,
                key: "restore",
                label: "Restore",
                onClick: () => runRowAction(() => restoreEmployeeAction(record.id)),
              }]),
          {
            isDisabled: isPending,
            key: "duplicate",
            label: "Duplicate",
            onClick: () => runRowAction(() => duplicateEmployeeAction(record.id)),
          },
        ]}
        savedViews={[
          { href: buildHrEmployeesHref(query, { status: null }), isActive: !query.status, key: "all", label: "All employees" },
          { href: buildHrEmployeesHref(query, { status: "active" }), isActive: query.status === "active", key: "active", label: "Active" },
          { href: buildHrEmployeesHref(query, { status: "archived" }), isActive: query.status === "archived", key: "archived", label: "Archived" },
        ]}
        searchSlot={
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <Input
              aria-label="Search employees"
              className="min-w-0 flex-1"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search employees"
              value={searchValue}
            />
            <Button type="submit" variant="secondary">
              Search
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
