import type { ReactNode } from "react";

export type DataTableColumn<TRecord> = Readonly<{
  key: string;
  header: string;
  render: (record: TRecord) => ReactNode;
  isVisible?: boolean;
  isPinned?: "start" | "end";
  canSort?: boolean;
  canFilter?: boolean;
}>;

export type DataTableCursorPagination = Readonly<{
  mode: "cursor";
  pageSize: number;
  nextCursor?: string | null;
  previousCursor?: string | null;
  totalRows?: number;
}>;

export type DataTablePagePagination = Readonly<{
  mode: "page";
  page: number;
  pageSize: number;
  totalRows: number;
}>;

export type DataTablePagination = DataTableCursorPagination | DataTablePagePagination;

export type DataTableFilter = Readonly<{
  key: string;
  label: string;
  value?: unknown;
  operator?: string;
}>;

export type DataTableSavedView = Readonly<{
  key: string;
  label: string;
  isActive?: boolean;
}>;

export type DataTableAction = Readonly<{
  key: string;
  label: string;
  href?: string;
  isDisabled?: boolean;
  requiredPermission?: string;
}>;

export type DataTableState = Readonly<{
  sorting?: readonly { columnKey: string; direction: "asc" | "desc" }[];
  filters?: readonly DataTableFilter[];
  globalSearch?: string;
  visibleColumnKeys?: readonly string[];
  activeSavedViewKey?: string;
  selectedRowIds?: readonly string[];
}>;

export type EnterpriseDataTableProps<TRecord> = Readonly<{
  columns: readonly DataTableColumn<TRecord>[];
  records: readonly TRecord[];
  getRowId: (record: TRecord) => string;
  pagination: DataTablePagination;
  state?: DataTableState;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  filters?: ReactNode;
  savedViews?: readonly DataTableSavedView[];
  columnVisibilityControls?: ReactNode;
  bulkActions?: readonly DataTableAction[];
  exportAction?: ReactNode;
  printAction?: ReactNode;
  rowActions?: (record: TRecord) => readonly DataTableAction[];
  permissionAwareActions?: readonly DataTableAction[];
}>;

function renderActions(actions: readonly DataTableAction[] | undefined) {
  return actions?.map((action) => {
    const className = "rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50";

    if (action.href && !action.isDisabled) {
      return (
        <a className={className} href={action.href} key={action.key}>
          {action.label}
        </a>
      );
    }

    return (
      <button
        aria-disabled={action.isDisabled}
        className={className}
        disabled={action.isDisabled}
        key={action.key}
        type="button"
      >
        {action.label}
      </button>
    );
  });
}

export function EnterpriseDataTable<TRecord>({
  columns,
  records,
  getRowId,
  pagination,
  state,
  isLoading,
  errorMessage,
  emptyMessage = "No records found.",
  filters,
  savedViews,
  columnVisibilityControls,
  bulkActions,
  exportAction,
  printAction,
  rowActions,
  permissionAwareActions,
}: EnterpriseDataTableProps<TRecord>) {
  const visibleColumnKeys = state?.visibleColumnKeys;
  const visibleColumns = columns.filter((column) => {
    if (column.isVisible === false) {
      return false;
    }

    return visibleColumnKeys ? visibleColumnKeys.includes(column.key) : true;
  });
  const hasRowActions = Boolean(rowActions);
  const selectedCount = state?.selectedRowIds?.length ?? 0;

  if (errorMessage) {
    return (
      <div className="rounded-md border border-[hsl(var(--danger))] p-4" role="alert">
        {errorMessage}
      </div>
    );
  }

  return (
    <section aria-busy={isLoading} className="rounded-md border bg-[hsl(var(--surface))]">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="min-w-52 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {state?.globalSearch ? `Search: ${state.globalSearch}` : "Global search placeholder"}
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          {renderActions(bulkActions)}
          {renderActions(permissionAwareActions)}
          {columnVisibilityControls ?? (
            <button className="rounded-md border px-3 py-2 text-sm" type="button">
              Columns
            </button>
          )}
          {exportAction ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">Export</button>}
          {printAction ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">Print</button>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3 text-sm text-muted-foreground">
        {savedViews && savedViews.length > 0 ? (
          savedViews.map((view) => (
            <button
              aria-pressed={view.isActive || view.key === state?.activeSavedViewKey}
              className="rounded-md border px-3 py-1.5"
              key={view.key}
              type="button"
            >
              {view.label}
            </button>
          ))
        ) : (
          <span>Saved views ready</span>
        )}
        <div className="ms-auto">{filters ?? <span>Filters ready</span>}</div>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-[hsl(var(--muted))] text-start">
            <tr>
              <th className="w-10 p-3">
                <input
                  aria-label={`Select all rows${selectedCount > 0 ? `, ${selectedCount} selected` : ""}`}
                  disabled={isLoading || records.length === 0}
                  type="checkbox"
                />
              </th>
              {visibleColumns.map((column) => (
                <th className="p-3 text-start" key={column.key}>
                  {column.header}
                </th>
              ))}
              {hasRowActions ? <th className="p-3 text-start">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={visibleColumns.length + (hasRowActions ? 2 : 1)}>
                  Loading table data...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={visibleColumns.length + (hasRowActions ? 2 : 1)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr className="border-t" key={getRowId(record)}>
                  <td className="p-3">
                    <input aria-label={`Select row ${getRowId(record)}`} type="checkbox" />
                  </td>
                  {visibleColumns.map((column) => (
                    <td className="p-3" key={column.key}>
                      {column.render(record)}
                    </td>
                  ))}
                  {hasRowActions ? (
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">{renderActions(rowActions?.(record))}</div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t p-3 text-sm text-muted-foreground">
        {pagination.mode === "page" ? (
          <span>
            Page {pagination.page} · {pagination.totalRows} rows · {pagination.pageSize} per page
          </span>
        ) : (
          <span>
            Cursor pagination · {pagination.totalRows ?? "unknown"} rows · {pagination.pageSize} per page
          </span>
        )}
        <span>Server data controls ready</span>
      </footer>
    </section>
  );
}
