import Link from "next/link";

import { loadManufacturingOverview, type ManufacturingOverviewData } from "@/features/manufacturing/routes/loaders/manufacturing-overview.loader";
import { DocumentationHomeButton, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { ManufacturingShell } from "./_components/manufacturing-shell";

const workspaceLinks = [
  { href: "/erp/manufacturing/daily-reports", label: "Daily Reports" },
  { href: "/erp/manufacturing/targets", label: "Targets" },
  { href: "/erp/manufacturing/production-lines", label: "Production Lines" },
  { href: "/erp/manufacturing/work-centers", label: "Work Centers" },
  { href: "/erp/manufacturing/boms", label: "BOM" },
  { href: "/erp/manufacturing/routing-plans", label: "Routing" },
] as const;

function MetricCards({ data }: Readonly<{ data: ManufacturingOverviewData }>) {
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

export default async function ManufacturingOverviewPage() {
  let data: ManufacturingOverviewData = { lastUpdated: new Date().toISOString(), metrics: [] };
  let errorMessage: string | undefined;

  try {
    data = await loadManufacturingOverview();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing overview.";
  }

  return (
    <ManufacturingShell activeKey="overview">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Live Manufacturing overview from Supabase manufacturing foundation tables. No static dashboard rows are used here."
          title="Production Dashboard"
        >
          <PageActions>
            <DocumentationHomeButton href="/erp/manufacturing/documentation" />
            <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/manufacturing/daily-reports">Open DPR</Link>
            <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/manufacturing/targets">Open Targets</Link>
          </PageActions>
        </PageHeader>
        <PageContent>
          {errorMessage ? (
            <div className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm" role="alert">{errorMessage}</div>
          ) : data.metrics.length === 0 ? (
            <div className="rounded-md border bg-[hsl(var(--surface))] p-6 text-sm text-muted-foreground">No manufacturing overview data is available.</div>
          ) : (
            <MetricCards data={data} />
          )}
        </PageContent>
        <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
          <h2 className="font-medium">Active Manufacturing Workspaces</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {workspaceLinks.map((item) => (
              <Link className="rounded-md border px-3 py-2 text-sm" href={item.href} key={item.href}>{item.label}</Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last refreshed {new Date(data.lastUpdated).toLocaleString()}.</p>
        </section>
      </PageContainer>
    </ManufacturingShell>
  );
}
