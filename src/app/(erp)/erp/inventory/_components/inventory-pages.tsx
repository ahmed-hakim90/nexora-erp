import type { ReactNode } from "react";

import { EnterpriseDataTable, PageContainer, PageContent, PageFilters, PageFooter, PageHeader } from "@/shared/ui";

type InventoryPageConfig = Readonly<{
  key: string;
  title: string;
  description: string;
  emptyMessage: string;
  columns: readonly { key: string; header: string; field: string }[];
}>;

type ListResult = Readonly<{
  records: readonly object[];
  nextCursor: string | null;
  pageSize: number;
}>;

function valueToText(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export async function InventoryListPage({
  config,
  loadRecords,
  searchParams,
}: Readonly<{
  config: InventoryPageConfig;
  loadRecords: (query: Record<string, string | undefined>) => Promise<ListResult>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: ListResult = { records: [], nextCursor: null, pageSize: 50 };
  let errorMessage: string | undefined;

  try {
    result = await loadRecords(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory records.";
  }

  return (
    <PageContainer>
      <PageHeader description={config.description} title={config.title} />
      <PageFilters>
        <p className="text-sm text-muted-foreground">
          Read-only inventory foundation pages. Search, status filters, soft-delete filtering, and cursor pagination are handled by route loaders.
        </p>
      </PageFilters>
      <PageContent>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={config.columns.map((column) => ({
            key: column.key,
            header: column.header,
            canSort: true,
            canFilter: true,
            render: (record) => valueToText(record[column.field]),
          }))}
          emptyMessage={config.emptyMessage}
          errorMessage={errorMessage}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
          records={result.records as readonly Record<string, unknown>[]}
          state={{ globalSearch: params.search }}
        />
      </PageContent>
      <PageFooter>No posting UI, transfer UI, adjustment UI, production, sales, purchasing, or accounting workflow is implemented.</PageFooter>
    </PageContainer>
  );
}
