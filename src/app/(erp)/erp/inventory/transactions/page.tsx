import Link from "next/link";

import { getInventoryTransaction, listInventoryTransactions } from "@/features/inventory/routes/loaders/inventory.loader";
import type { InventoryTransactionType } from "@/features/inventory/public-api";
import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { InventoryTransactionModalLauncher } from "../_components/inventory-transaction-modal";
import { getTransactionTypeConfig, loadTransactionLookups, TRANSACTION_TYPE_CONFIGS, transactionSlugFor } from "../_components/transaction-pages";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/inventory/transactions?${query}` : "/erp/inventory/transactions";
}

export default async function InventoryTransactionsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: Awaited<ReturnType<typeof listInventoryTransactions>> = { nextCursor: null, pageSize: 50, records: [] };
  let lookups: Awaited<ReturnType<typeof loadTransactionLookups>> = { branches: [], locations: [], products: [], units: [], warehouses: [] };
  let selectedDetail: Awaited<ReturnType<typeof getInventoryTransaction>> | undefined;
  let errorMessage: string | undefined;

  try {
    [result, lookups] = await Promise.all([
      listInventoryTransactions(params),
      loadTransactionLookups(),
    ]);
    if (params.edit) selectedDetail = await getInventoryTransaction(params.edit);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory transactions.";
  }
  const createConfig = params.create ? getTransactionTypeConfig(params.create) : undefined;
  const selectedConfig = selectedDetail ? getTransactionTypeConfig(transactionSlugFor(selectedDetail.transaction.transactionType)) : undefined;
  const closeHref = buildHref(params, { create: null, edit: null, transactionType: null });

  return (
    <InventoryShell activeKey="transactions">
      <PageContainer>
        <PageHeader description="Controlled stock adjustment, transfer, receipt, issue, and cycle count documents." title="Inventory Transactions">
          <PageActions>
            {Object.entries(TRANSACTION_TYPE_CONFIGS).map(([slug, config]) => (
              <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { create: slug, edit: null, transactionType: null })} key={slug}>
                New {config.title}
              </Link>
            ))}
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
              {
                href: buildHref(params, { edit: String(record.id), transactionType: transactionSlugFor(record.transactionType as InventoryTransactionType), create: null }),
                key: "edit",
                label: "Edit",
              },
            ]}
            state={{ globalSearch: params.search }}
          />
        </PageContent>
        {createConfig ? (
          <InventoryTransactionModalLauncher
            autoOpen
            closeHref={closeHref}
            config={{ ...createConfig, slug: params.create ?? "stock-adjustment" }}
            lookups={lookups}
          />
        ) : null}
        {selectedDetail && selectedConfig ? (
          <InventoryTransactionModalLauncher
            autoOpen
            closeHref={closeHref}
            config={{ ...selectedConfig, slug: transactionSlugFor(selectedDetail.transaction.transactionType) }}
            detail={selectedDetail}
            lookups={lookups}
          />
        ) : null}
      </PageContainer>
    </InventoryShell>
  );
}
