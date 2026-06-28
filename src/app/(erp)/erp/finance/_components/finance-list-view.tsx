"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/ui";
import { displayBusinessCode, type BusinessCodeConfig } from "@/shared/business-codes";
import type { FinanceFieldDescriptor } from "@/features/finance/public-api";
import { archiveFinanceRecordAction } from "@/features/finance/routes/actions/finance.actions";

import { FinanceEntityDrawer, type FinanceRelationOptions } from "./finance-entity-drawer";

export type FinanceListColumn = Readonly<{
  key: string;
  header: string;
  field: string;
  type: FinanceFieldDescriptor["type"];
  autoCode?: BusinessCodeConfig;
}>;

export type FinanceListQueryState = Readonly<{
  create?: string;
  edit?: string;
  search?: string;
  status?: string;
  isActive?: string;
  cursor?: string;
  view?: string;
}>;

type FinanceRecord = Record<string, unknown>;

type FinanceListViewProps = Readonly<{
  entityKey: string;
  title: string;
  singular: string;
  description: string;
  basePath: string;
  columns: readonly FinanceListColumn[];
  fields: readonly FinanceFieldDescriptor[];
  relationOptions?: FinanceRelationOptions;
  records: readonly FinanceRecord[];
  pageSize: number;
  nextCursor: string | null;
  query: FinanceListQueryState;
  statusField: "status" | "is_active";
  statusValues?: readonly string[];
  canManage: boolean;
  errorMessage?: string;
  selectedRecord?: FinanceRecord;
  modalCloseHref?: string;
  supportsTree?: boolean;
  treeParentField?: string;
}>;

function formatValue(value: unknown, column: FinanceListColumn): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (column.autoCode) {
    return displayBusinessCode(value, column.autoCode);
  }

  if (column.type === "checkbox" || typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }

  if (column.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }

  return String(value);
}

function StatusBadge({ value }: Readonly<{ value: unknown }>) {
  const text = typeof value === "boolean" ? (value ? "Active" : "Inactive") : String(value ?? "—");
  const tone =
    text === "active" || text === "Active"
      ? "border-[hsl(var(--success))] text-[hsl(var(--success))]"
      : text === "archived" || text === "Inactive" || text === "locked"
        ? "border-[hsl(var(--danger))] text-[hsl(var(--danger))]"
        : "border-[hsl(var(--border))] text-muted-foreground";

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>{text}</span>;
}

export function FinanceListView({
  entityKey,
  title,
  singular,
  description,
  basePath,
  columns,
  fields,
  relationOptions,
  records,
  pageSize,
  nextCursor,
  query,
  statusField,
  statusValues,
  canManage,
  errorMessage,
  selectedRecord,
  modalCloseHref,
  supportsTree,
  treeParentField,
}: FinanceListViewProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const isTreeView = supportsTree === true && query.view === "tree";

  const allSelected = records.length > 0 && records.every((record) => selected.has(String(record.id)));

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(() => (allSelected ? new Set() : new Set(records.map((record) => String(record.id)))));
  }

  function buildHref(overrides: Partial<FinanceListQueryState>): string {
    const params = new URLSearchParams();
    const merged: FinanceListQueryState = { ...query, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, String(value));
    }
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  function archiveSelected() {
    if (selected.size === 0) return;
    setBulkError(null);
    const ids = [...selected];
    startTransition(async () => {
      try {
        for (const id of ids) {
          await archiveFinanceRecordAction(entityKey, id);
        }
        setSelected(new Set());
        router.refresh();
      } catch (error) {
        setBulkError(error instanceof Error ? error.message : "Could not archive the selected records.");
      }
    });
  }

  function archiveOne(id: string) {
    setBulkError(null);
    startTransition(async () => {
      try {
        await archiveFinanceRecordAction(entityKey, id);
        router.refresh();
      } catch (error) {
        setBulkError(error instanceof Error ? error.message : "Could not archive the record.");
      }
    });
  }

  const tree = useMemo(() => {
    if (!isTreeView || !treeParentField) return [];
    const byParent = new Map<string, FinanceRecord[]>();
    for (const record of records) {
      const parent = record[treeParentField] ? String(record[treeParentField]) : "root";
      const bucket = byParent.get(parent) ?? [];
      bucket.push(record);
      byParent.set(parent, bucket);
    }
    return byParent.get("root") ?? [];
  }, [isTreeView, treeParentField, records]);

  const childrenOf = useMemo(() => {
    const map = new Map<string, FinanceRecord[]>();
    if (!treeParentField) return map;
    for (const record of records) {
      const parent = record[treeParentField] ? String(record[treeParentField]) : null;
      if (!parent) continue;
      const bucket = map.get(parent) ?? [];
      bucket.push(record);
      map.set(parent, bucket);
    }
    return map;
  }, [records, treeParentField]);

  function renderTreeNodes(nodes: readonly FinanceRecord[], depth = 0): ReactNode {
    return nodes.map((record) => {
      const id = String(record.id);
      const kids = childrenOf.get(id) ?? [];
      const label = String(record.accountCode ?? record.name ?? id);
      return (
        <li key={id}>
          <div className="flex items-center justify-between rounded-md border px-3 py-2" style={{ marginInlineStart: depth * 16 }}>
            <a className="text-sm font-medium hover:underline" href={`${basePath}/${id}`}>
              {label} <span className="font-normal text-muted-foreground">· {String(record.name ?? "")}</span>
            </a>
            {canManage ? (
              <a className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-[hsl(var(--muted))]" href={buildHref({ edit: id, create: undefined })}>
                Edit
              </a>
            ) : null}
          </div>
          {kids.length > 0 ? <ul className="mt-1 space-y-1">{renderTreeNodes(kids, depth + 1)}</ul> : null}
        </li>
      );
    });
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {supportsTree ? (
            <a
              className="rounded-md border px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
              href={buildHref({ view: isTreeView ? undefined : "tree", cursor: undefined })}
            >
              {isTreeView ? "Table view" : "Tree view"}
            </a>
          ) : null}
          {canManage ? (
            <a href={buildHref({ create: "1", edit: undefined })}>
              <Button type="button" variant="primary">
                Create {singular}
              </Button>
            </a>
          ) : null}
        </div>
      </header>

      <form action={basePath} className="flex flex-wrap items-end gap-3 rounded-md border bg-[hsl(var(--surface))] p-4" method="get">
        <div className="min-w-56 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="finance-search">
            Search
          </label>
          <input
            className="h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm"
            defaultValue={query.search ?? ""}
            id="finance-search"
            name="search"
            placeholder={`Search ${title.toLowerCase()}…`}
            type="search"
          />
        </div>
        {statusField === "status" && statusValues ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="finance-status">
              Status
            </label>
            <select className="h-10 rounded-md border bg-[hsl(var(--surface))] px-3 text-sm" defaultValue={query.status ?? ""} id="finance-status" name="status">
              <option value="">All statuses</option>
              {statusValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="finance-active">
              Active
            </label>
            <select className="h-10 rounded-md border bg-[hsl(var(--surface))] px-3 text-sm" defaultValue={query.isActive ?? ""} id="finance-active" name="isActive">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary">
            Apply
          </Button>
          <a className="rounded-md border px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]" href={basePath}>
            Reset
          </a>
        </div>
      </form>

      {bulkError ? (
        <p className="rounded-md border border-[hsl(var(--danger))] px-3 py-2 text-sm text-[hsl(var(--danger))]" role="alert">
          {bulkError}
        </p>
      ) : null}

      {selected.size > 0 && canManage ? (
        <div className="flex items-center justify-between rounded-md border bg-[hsl(var(--muted))] px-4 py-2 text-sm">
          <span>{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button disabled={isPending} onClick={archiveSelected} size="sm" variant="danger">
              {isPending ? "Archiving…" : "Archive selected"}
            </Button>
            <Button onClick={() => setSelected(new Set())} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-4 text-sm text-[hsl(var(--danger))]" role="alert">
          <p className="font-medium">Could not load {title.toLowerCase()}.</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : isTreeView ? (
        records.length === 0 ? (
          <EmptyState canManage={canManage} singular={singular} />
        ) : (
          <ul className="space-y-1 rounded-md border bg-[hsl(var(--surface))] p-3">{renderTreeNodes(tree)}</ul>
        )
      ) : (
        <div className="overflow-auto rounded-md border bg-[hsl(var(--surface))]">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-[hsl(var(--muted))]">
              <tr>
                {canManage ? (
                  <th className="w-10 p-3">
                    <input aria-label="Select all" checked={allSelected} disabled={records.length === 0} onChange={toggleAll} type="checkbox" />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th className="p-3 text-start font-medium" key={column.key}>
                    {column.header}
                  </th>
                ))}
                <th className="p-3 text-start font-medium">Status</th>
                <th className="p-3 text-end font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td className="p-0" colSpan={columns.length + (canManage ? 3 : 2)}>
                    <EmptyState canManage={canManage} singular={singular} />
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const id = String(record.id);
                  return (
                    <tr className="border-t hover:bg-[hsl(var(--muted))]/40" key={id}>
                      {canManage ? (
                        <td className="p-3">
                          <input aria-label={`Select ${id}`} checked={selected.has(id)} onChange={() => toggleRow(id)} type="checkbox" />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td className="p-3" key={column.key}>
                          {column.field === "name" || column.key === columns[0]?.key ? (
                            <a className="font-medium hover:underline" href={`${basePath}/${id}`}>
                              {formatValue(record[column.field], column)}
                            </a>
                          ) : (
                            formatValue(record[column.field], column)
                          )}
                        </td>
                      ))}
                      <td className="p-3">
                        <StatusBadge value={statusField === "status" ? record.status : record.isActive} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <a className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-[hsl(var(--muted))]" href={`${basePath}/${id}`}>
                            View
                          </a>
                          {canManage ? (
                            <>
                              <a className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-[hsl(var(--muted))]" href={buildHref({ edit: id, create: undefined })}>
                                Edit
                              </a>
                              <Button disabled={isPending} onClick={() => archiveOne(id)} size="sm" variant="ghost">
                                Archive
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isTreeView ? (
        <footer className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {records.length} record{records.length === 1 ? "" : "s"} · {pageSize} per page
          </span>
          <div className="flex items-center gap-2">
            <a
              className={`rounded-md border px-3 py-1.5 ${query.cursor ? "hover:bg-[hsl(var(--muted))]" : "pointer-events-none opacity-50"}`}
              href={buildHref({ cursor: undefined })}
            >
              First
            </a>
            <a
              className={`rounded-md border px-3 py-1.5 ${nextCursor ? "hover:bg-[hsl(var(--muted))]" : "pointer-events-none opacity-50"}`}
              href={nextCursor ? buildHref({ cursor: nextCursor }) : "#"}
            >
              Next
            </a>
          </div>
        </footer>
      ) : null}
      {canManage && query.create ? (
        <FinanceEntityDrawer
          autoOpen
          closeHref={modalCloseHref}
          entityKey={entityKey}
          fields={fields}
          mode="create"
          relationOptions={relationOptions}
          singular={singular}
        />
      ) : null}
      {canManage && selectedRecord ? (
        <FinanceEntityDrawer
          autoOpen
          closeHref={modalCloseHref}
          entityKey={entityKey}
          fields={fields}
          mode="edit"
          record={selectedRecord}
          recordId={String(selectedRecord.id)}
          relationOptions={relationOptions}
          singular={singular}
        />
      ) : null}
    </section>
  );
}

function EmptyState({ canManage, singular }: Readonly<{ canManage: boolean; singular: string }>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="text-sm font-medium">No {singular.toLowerCase()} records yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {canManage
          ? `Create your first ${singular.toLowerCase()} to populate this list. Records are scoped to the active company and exclude archived items.`
          : `No records are available for your current company scope.`}
      </p>
    </div>
  );
}
