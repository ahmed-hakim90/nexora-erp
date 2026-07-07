"use client";

import { useMemo, useState, type ReactNode } from "react";

import { nativeSelectClassName } from "../tokens";
import { cn } from "../utils";

export type DataTableDensity = "compact" | "default" | "comfortable";

export type DataTableColumn<TRecord> = Readonly<{
  key: string;
  header: string;
  render: (record: TRecord) => ReactNode;
  isVisible?: boolean;
  isPinned?: "start" | "end";
  canSort?: boolean;
  canFilter?: boolean;
  minWidth?: string;
  width?: string;
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
  href?: string;
  onSelect?: () => void;
}>;

export type DataTableAction = Readonly<{
  key: string;
  label: string;
  href?: string;
  isDisabled?: boolean;
  onClick?: () => void;
  requiredPermission?: string;
}>;

export type DataTableState = Readonly<{
  sorting?: readonly { columnKey: string; direction: "asc" | "desc" }[];
  filters?: readonly DataTableFilter[];
  globalSearch?: string;
  visibleColumnKeys?: readonly string[];
  activeSavedViewKey?: string;
  selectedRowIds?: readonly string[];
  density?: DataTableDensity;
}>;

export type EnterpriseDataTableProps<TRecord> = Readonly<{
  columns: readonly DataTableColumn<TRecord>[];
  records: readonly TRecord[];
  getRowId: (record: TRecord) => string;
  pagination: DataTablePagination;
  state?: DataTableState;
  density?: DataTableDensity;
  stickyFirstColumn?: boolean;
  stickyHeader?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  emptyState?: ReactNode;
  searchSlot?: ReactNode;
  skeletonRowCount?: number;
  filters?: ReactNode;
  savedViews?: readonly DataTableSavedView[];
  columnVisibilityControls?: ReactNode;
  bulkActions?: readonly DataTableAction[];
  exportAction?: ReactNode;
  printAction?: ReactNode;
  rowActions?: (record: TRecord) => readonly DataTableAction[];
  permissionAwareActions?: readonly DataTableAction[];
  enableRowSelection?: boolean;
  selectedRowIds?: readonly string[];
  onDensityChange?: (density: DataTableDensity) => void;
  onSelectedRowIdsChange?: (selectedRowIds: readonly string[]) => void;
  onRowOpen?: (record: TRecord) => void;
}>;

const DENSITY_CELL: Record<DataTableDensity, string> = {
  compact: "px-3 py-2",
  default: "px-3 py-3",
  comfortable: "px-4 py-4",
};

function renderActions(actions: readonly DataTableAction[] | undefined) {
  return actions?.map((action) => {
    const className =
      "rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-50";

    if (action.href && !action.isDisabled) {
      return (
        <a className={className} href={action.href} key={action.key}>
          {action.label}
        </a>
      );
    }

    if (action.onClick && !action.isDisabled) {
      return (
        <button className={className} key={action.key} onClick={action.onClick} type="button">
          {action.label}
        </button>
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

function TableSkeletonRows({
  cellClassName,
  columnCount,
  rowCount,
}: Readonly<{
  cellClassName: string;
  columnCount: number;
  rowCount: number;
}>) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr className="border-t" key={`skeleton-row-${rowIndex}`}>
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <td className={cellClassName} key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
              <div className="h-4 animate-pulse rounded bg-[hsl(var(--muted))]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableEmptyState({
  colSpan,
  message,
  slot,
}: Readonly<{
  colSpan: number;
  message: string;
  slot?: ReactNode;
}>) {
  return (
    <tr>
      <td className="p-0" colSpan={colSpan}>
        {slot ?? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">Adjust filters or create a new record to get started.</p>
          </div>
        )}
      </td>
    </tr>
  );
}

export function EnterpriseDataTable<TRecord>({
  columns,
  records,
  getRowId,
  pagination,
  state,
  density: densityProp = "default",
  stickyFirstColumn = true,
  stickyHeader = true,
  isLoading,
  errorMessage,
  emptyMessage = "No records found.",
  emptyState,
  searchSlot,
  skeletonRowCount = 6,
  filters,
  savedViews,
  columnVisibilityControls,
  bulkActions,
  exportAction,
  printAction,
  rowActions,
  permissionAwareActions,
  enableRowSelection = false,
  selectedRowIds,
  onDensityChange,
  onSelectedRowIdsChange,
  onRowOpen,
}: EnterpriseDataTableProps<TRecord>) {
  const [internalDensity, setInternalDensity] = useState<DataTableDensity>(densityProp);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<readonly string[]>([]);
  const density = state?.density ?? internalDensity;
  const cellClassName = DENSITY_CELL[density];

  const visibleColumnKeys = state?.visibleColumnKeys;
  const visibleColumns = columns.filter((column) => {
    if (column.isVisible === false || hiddenColumnKeys.includes(column.key)) return false;
    return visibleColumnKeys ? visibleColumnKeys.includes(column.key) : true;
  });

  const orderedColumns = useMemo(() => {
    const startPinned = visibleColumns.filter((column) => column.isPinned === "start");
    const endPinned = visibleColumns.filter((column) => column.isPinned === "end");
    const regular = visibleColumns.filter((column) => column.isPinned !== "start" && column.isPinned !== "end");
    return [...startPinned, ...regular, ...endPinned];
  }, [visibleColumns]);

  const hasRowActions = Boolean(rowActions);
  const selectionEnabled = enableRowSelection && Boolean(onSelectedRowIdsChange);
  const activeSelectedRowIds = selectionEnabled ? (selectedRowIds ?? []) : (state?.selectedRowIds ?? []);
  const selectedCount = activeSelectedRowIds.length;
  const pageRowIds = records.map((record) => getRowId(record));
  const allPageRowsSelected =
    selectionEnabled && pageRowIds.length > 0 && pageRowIds.every((rowId) => activeSelectedRowIds.includes(rowId));
  const somePageRowsSelected =
    selectionEnabled && pageRowIds.some((rowId) => activeSelectedRowIds.includes(rowId));
  const selectionColumnCount = selectionEnabled ? 1 : 0;
  const totalColumnCount = orderedColumns.length + (hasRowActions ? 1 : 0) + selectionColumnCount;

  const handleDensityChange = (nextDensity: DataTableDensity) => {
    setInternalDensity(nextDensity);
    onDensityChange?.(nextDensity);
  };

  const toggleRowSelection = (rowId: string, checked: boolean) => {
    if (!selectionEnabled || !onSelectedRowIdsChange) return;
    if (checked) {
      onSelectedRowIdsChange([...new Set([...activeSelectedRowIds, rowId])]);
      return;
    }
    onSelectedRowIdsChange(activeSelectedRowIds.filter((id) => id !== rowId));
  };

  const toggleAllPageRows = (checked: boolean) => {
    if (!selectionEnabled || !onSelectedRowIdsChange) return;
    if (checked) {
      onSelectedRowIdsChange([...new Set([...activeSelectedRowIds, ...pageRowIds])]);
      return;
    }
    onSelectedRowIdsChange(activeSelectedRowIds.filter((rowId) => !pageRowIds.includes(rowId)));
  };

  if (errorMessage) {
    return (
      <div className="rounded-md border border-[hsl(var(--danger))] p-4" role="alert">
        {errorMessage}
      </div>
    );
  }

  return (
    <section aria-busy={isLoading} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] p-3">
        <div className="min-w-52 flex-1">{searchSlot ?? (
          <div className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm text-muted-foreground">
            {state?.globalSearch ? `Search: ${state.globalSearch}` : "Search records"}
          </div>
        )}</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="data-table-density">Table density</label>
          <select
            className={nativeSelectClassName}
            id="data-table-density"
            onChange={(event) => handleDensityChange(event.target.value as DataTableDensity)}
            value={density}
          >
            <option value="comfortable">Comfortable</option>
            <option value="default">Default</option>
            <option value="compact">Compact</option>
          </select>
          {renderActions(bulkActions)}
          {renderActions(permissionAwareActions)}
          {columnVisibilityControls ?? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]">
                Columns
              </summary>
              <div className="absolute end-0 z-10 mt-2 min-w-[12rem] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-md">
                {columns.map((column) => {
                  const hidden = hiddenColumnKeys.includes(column.key);
                  return (
                    <label className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[hsl(var(--muted))]" key={column.key}>
                      <input
                        checked={!hidden}
                        onChange={() =>
                          setHiddenColumnKeys((current) =>
                            hidden ? current.filter((key) => key !== column.key) : [...current, column.key],
                          )
                        }
                        type="checkbox"
                      />
                      {column.header}
                    </label>
                  );
                })}
              </div>
            </details>
          )}
          {exportAction}
          {printAction}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] p-3 text-sm">
        {savedViews && savedViews.length > 0 ? (
          savedViews.map((view) => {
            const active = view.isActive || view.key === state?.activeSavedViewKey;
            const className = cn(
              "rounded-md border px-3 py-1.5 transition-colors",
              active
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]"
                : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
            );
            if (view.href) {
              return (
                <a aria-current={active ? "true" : undefined} className={className} href={view.href} key={view.key}>
                  {view.label}
                </a>
              );
            }
            return (
              <button
                aria-pressed={active}
                className={className}
                key={view.key}
                onClick={view.onSelect}
                type="button"
              >
                {view.label}
              </button>
            );
          })
        ) : null}
        <div className="ms-auto">{filters}</div>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
          <thead className={cn("bg-[hsl(var(--muted))]/80 text-start", stickyHeader && "sticky top-0 z-[1]")}>
            <tr>
              {selectionEnabled ? (
                <th className={cn("w-10 bg-[hsl(var(--muted))]/80", cellClassName, stickyFirstColumn && "sticky start-0 z-[2]")}>
                  <input
                    aria-label={`Select all rows${selectedCount > 0 ? `, ${selectedCount} selected` : ""}`}
                    checked={allPageRowsSelected}
                    disabled={isLoading || records.length === 0}
                    onChange={(event) => toggleAllPageRows(event.target.checked)}
                    ref={(input) => {
                      if (input) input.indeterminate = somePageRowsSelected && !allPageRowsSelected;
                    }}
                    type="checkbox"
                  />
                </th>
              ) : null}
              {orderedColumns.map((column, index) => (
                <th
                  className={cn(
                    "bg-[hsl(var(--muted))]/80 text-start",
                    cellClassName,
                    stickyFirstColumn && index === 0 && !selectionEnabled && "sticky start-0 z-[2]",
                    stickyFirstColumn && selectionEnabled && index === 0 && "sticky start-10 z-[2]",
                  )}
                  key={column.key}
                  style={{ minWidth: column.minWidth, width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {hasRowActions ? <th className={cn("bg-[hsl(var(--muted))]/80 text-start", cellClassName)}>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeletonRows cellClassName={cellClassName} columnCount={totalColumnCount} rowCount={skeletonRowCount} />
            ) : records.length === 0 ? (
              <TableEmptyState colSpan={totalColumnCount} message={emptyMessage} slot={emptyState} />
            ) : (
              records.map((record) => {
                const rowId = getRowId(record);
                return (
                  <tr
                    className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/35 focus-within:bg-[hsl(var(--muted))]/35"
                    key={rowId}
                    onDoubleClick={onRowOpen ? () => onRowOpen(record) : undefined}
                    tabIndex={onRowOpen ? 0 : undefined}
                  >
                    {selectionEnabled ? (
                      <td className={cn("bg-[hsl(var(--surface))]", cellClassName, stickyFirstColumn && "sticky start-0 z-[1]")}>
                        <input
                          aria-label={`Select row ${rowId}`}
                          checked={activeSelectedRowIds.includes(rowId)}
                          onChange={(event) => toggleRowSelection(rowId, event.target.checked)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    {orderedColumns.map((column, index) => (
                      <td
                        className={cn(
                          "bg-[hsl(var(--surface))]",
                          cellClassName,
                          stickyFirstColumn && index === 0 && !selectionEnabled && "sticky start-0 z-[1]",
                          stickyFirstColumn && selectionEnabled && index === 0 && "sticky start-10 z-[1]",
                        )}
                        key={column.key}
                      >
                        {column.render(record)}
                      </td>
                    ))}
                    {hasRowActions ? (
                      <td className={cellClassName}>
                        <div className="flex flex-wrap gap-2">{renderActions(rowActions?.(record))}</div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border))] p-3 text-sm text-muted-foreground">
        {pagination.mode === "page" ? (
          <span>
            Page {pagination.page} · {pagination.totalRows} rows · {pagination.pageSize} per page
          </span>
        ) : (
          <span>
            Cursor pagination · {pagination.totalRows ?? "unknown"} rows · {pagination.pageSize} per page
          </span>
        )}
        {selectedCount > 0 ? <span>{selectedCount} selected</span> : null}
      </footer>
    </section>
  );
}
