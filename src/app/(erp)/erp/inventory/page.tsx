import { getInventoryOverview } from "@/features/inventory/routes/loaders/inventory.loader";
import { PageContainer, PageContent, PageFooter, PageHeader } from "@/shared/ui";

import { InventoryShell } from "./_components/inventory-shell";

export default async function InventoryOverviewPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let overview: Awaited<ReturnType<typeof getInventoryOverview>> | null = null;
  let errorMessage: string | undefined;

  try {
    overview = await getInventoryOverview(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory events overview.";
  }

  return (
    <InventoryShell activeKey="overview">
      <PageContainer>
        <PageHeader
          description="Sprint 10 adds controlled inventory transactions on top of the immutable Sprint 9 stock ledger and posting service."
          title="Inventory Transactions"
        />
        <PageContent>
          {errorMessage ? <p className="rounded-md border p-4 text-sm text-[hsl(var(--danger))]">{errorMessage}</p> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
              <h2 className="text-sm font-medium">Event Definitions</h2>
              <p className="mt-2 text-3xl font-semibold">{overview?.eventDefinitions.records.length ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">Current page of generic event contracts.</p>
            </section>
            <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
              <h2 className="text-sm font-medium">Endpoints</h2>
              <p className="mt-2 text-3xl font-semibold">{overview?.endpoints.records.length ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">Integration endpoint placeholders only.</p>
            </section>
            <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
              <h2 className="text-sm font-medium">Messages</h2>
              <p className="mt-2 text-3xl font-semibold">{overview?.messages.records.length ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">Message placeholders with no delivery side effects.</p>
            </section>
          </div>
        </PageContent>
        <PageFooter>Inventory quantity changes are posted only through StockPostingService. No sales, purchasing, production, or accounting workflows are implemented.</PageFooter>
      </PageContainer>
    </InventoryShell>
  );
}
