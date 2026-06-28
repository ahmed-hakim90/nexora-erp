import Link from "next/link";

import { loadInventoryOverview, type InventoryOverviewData } from "@/features/inventory/routes/loaders/inventory-overview.loader";
import { DocumentationHomeButton, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "./_components/inventory-shell";

const workspaceLinks = [
  { href: "/erp/inventory/products", label: "Products" },
  { href: "/erp/inventory/stock-balances", label: "Stock Balances" },
  { href: "/erp/inventory/transactions", label: "Transactions" },
  { href: "/erp/inventory/stock-ledger", label: "Stock Ledger" },
  { href: "/erp/inventory/posting-batches", label: "Posting Batches" },
  { href: "/erp/inventory/events", label: "Event Definitions" },
] as const;

function MetricCards({ data }: Readonly<{ data: InventoryOverviewData }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {data.metrics.map((metric) => (
        <article className="rounded-lg border bg-[hsl(var(--surface))] p-4" key={metric.key}>
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{metric.value.toLocaleString("en")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{metric.description}</p>
        </article>
      ))}
    </div>
  );
}

export default async function InventoryOverviewPage() {
  let data: InventoryOverviewData = { lastUpdated: new Date().toISOString(), metrics: [] };
  let errorMessage: string | undefined;

  try {
    data = await loadInventoryOverview();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory overview.";
  }

  return (
    <InventoryShell activeKey="overview">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Live Inventory overview from Supabase inventory foundation tables. No static catalog data is used here."
          title="Inventory Dashboard"
        >
          <PageActions>
            <DocumentationHomeButton href="/erp/inventory/documentation" />
            <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/products">Open Products</Link>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/transactions">Open Transactions</Link>
          </PageActions>
        </PageHeader>
        <PageContent>
          {errorMessage ? (
            <div className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm" role="alert">{errorMessage}</div>
          ) : data.metrics.length === 0 ? (
            <div className="rounded-md border bg-[hsl(var(--surface))] p-6 text-sm text-muted-foreground">No inventory overview data is available.</div>
          ) : (
            <MetricCards data={data} />
          )}
        </PageContent>
        <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
          <h2 className="font-medium">Active Inventory Workspaces</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {workspaceLinks.map((item) => (
              <Link className="rounded-md border px-3 py-2 text-sm" href={item.href} key={item.href}>{item.label}</Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last refreshed {new Date(data.lastUpdated).toLocaleString()}.</p>
        </section>
      </PageContainer>
    </InventoryShell>
  );
}
