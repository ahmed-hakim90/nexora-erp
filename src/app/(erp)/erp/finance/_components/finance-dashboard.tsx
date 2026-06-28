import { getFinanceDashboard } from "@/features/finance/routes/loaders/finance.loader";
import { DocumentationHomeButton } from "@/shared/ui";

export async function FinanceDashboard() {
  const dashboard = await getFinanceDashboard();
  const total = dashboard.metrics.reduce((sum, metric) => sum + metric.count, 0);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Foundation definitions for the active company. Posting, invoicing, payments, and tax calculation remain
            disabled by the accepted Finance Foundation contracts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DocumentationHomeButton href="/erp/finance/documentation" />
          <div className="rounded-md border bg-[hsl(var(--surface))] px-4 py-3 text-end">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total definitions</p>
            <p className="text-2xl font-semibold">{total}</p>
          </div>
        </div>
      </header>

      {dashboard.errorMessage ? (
        <div className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-4 text-sm text-[hsl(var(--danger))]" role="alert">
          <p className="font-medium">Live metrics are unavailable.</p>
          <p className="mt-1">{dashboard.errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboard.metrics.map((metric) => (
          <a
            className="group rounded-lg border bg-[hsl(var(--surface))] p-4 transition-colors hover:border-[hsl(var(--accent))]"
            href={metric.href}
            key={metric.key}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">{metric.label}</h2>
              <span className="text-2xl font-semibold tabular-nums">{metric.count}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{metric.description}</p>
            <span className="mt-3 inline-block text-xs font-medium text-[hsl(var(--accent))] opacity-0 transition-opacity group-hover:opacity-100">
              Open workspace →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
