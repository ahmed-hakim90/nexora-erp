import Link from "next/link";

import { listInventoryTransactions } from "@/features/inventory/routes/loaders/inventory.loader";
import type { InventoryTransactionType } from "@/features/inventory/public-api";
import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { transactionSlugFor } from "../_components/transaction-pages";

export default async function InventoryTransactionsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: Awaited<ReturnType<typeof listInventoryTransactions>> = { nextCursor: null, pageSize: 50, records: [] };
  let errorMessage: string | undefined;

  try {
    result = await listInventoryTransactions(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory transactions.";
  }

  return (
    <InventoryShell activeKey="transactions">
      <PageContainer>
        <PageHeader description="Controlled stock adjustment, transfer, receipt, issue, and cycle count documents." title="Inventory Transactions">
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/stock-adjustment/new">
              New Adjustment
            </Link>
          </PageActions>
        </PageHeader>
        <PageFilters>
          <p className="text-sm text-muted-foreground">Status filters, search, and cursor pagination are loaded through server services.</p>
        </PageFilters>
        <PageContent>
          <EnterpriseDataTable<Record<string, unknown>>
            columns={[
              { key: "title", header: "Title", render: (record) => String(record.title) },
              { key: "transactionType", header: "Type", render: (record) => String(record.transactionType) },
              { key: "status", header: "Status", render: (record) => String(record.status) },
              { key: "transactionDate", header: "Date", render: (record) => String(record.transactionDate) },
              { key: "branchId", header: "Branch", render: (record) => String(record.branchId) },
            ]}
            emptyMessage="No inventory transactions found."
            errorMessage={errorMessage}
            getRowId={(record) => String(record.id)}
            pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
            records={result.records as readonly Record<string, unknown>[]}
            rowActions={(record) => [
              {
                href: `/erp/inventory/${transactionSlugFor(record.transactionType as InventoryTransactionType)}/${record.id}`,
                key: "view",
                label: "View",
              },
            ]}
            state={{ globalSearch: params.search }}
          />
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}
