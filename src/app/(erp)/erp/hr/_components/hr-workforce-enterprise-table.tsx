"use client";

import { EnterpriseDataTable, type EnterpriseDataTableProps } from "@/shared/ui";

export function HrWorkforceEnterpriseTable<TRecord>(props: EnterpriseDataTableProps<TRecord>) {
  return (
    <EnterpriseDataTable
      stickyFirstColumn
      stickyHeader
      {...props}
      columns={props.columns.map((column, index) => ({
        ...column,
        isPinned: column.isPinned ?? (index === 0 ? "start" : column.isPinned),
      }))}
    />
  );
}
