import Link from "next/link";

import { loadManufacturingWorkspace } from "@/features/manufacturing/routes/loaders/manufacturing-workspace.loader";
import { DocumentationHomeButton, EmptyState, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { ManufacturingShell } from "./_components/manufacturing-shell";

function WorkspaceSection({
  section,
}: Readonly<{
  section: Awaited<ReturnType<typeof loadManufacturingWorkspace>>["sections"][number];
}>) {
  return (
    <article className="rounded-lg border bg-[hsl(var(--surface))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{section.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>
        <span className="rounded-md border px-2 py-1 text-sm tabular-nums">{section.count.toLocaleString("en")}</span>
      </div>
      {section.count === 0 ? (
        <div className="mt-4">
          <EmptyState message={section.emptyMessage} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{section.count.toLocaleString("en")} record(s) available in this branch scope.</p>
      )}
    </article>
  );
}

function QuickActionsPanel({
  quickActions,
}: Readonly<{
  quickActions: Awaited<ReturnType<typeof loadManufacturingWorkspace>>["quickActions"];
}>) {
  return (
    <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
      <h2 className="font-medium">Quick Actions</h2>
      <p className="mt-1 text-sm text-muted-foreground">Readiness-only actions for future shop-floor workflows. No runtime execution is enabled in Sprint 3.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            className="cursor-not-allowed rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-sm text-muted-foreground opacity-80"
            disabled
            key={action.key}
            title={action.disabledReason}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

const workspaceLinks = [
  { href: "/erp/manufacturing/manufacturing-orders", label: "Manufacturing Orders" },
  { href: "/erp/manufacturing/boms", label: "BOM" },
  { href: "/erp/manufacturing/routing-plans", label: "Routing" },
  { href: "/erp/manufacturing/reports", label: "Reports & KPIs" },
  { href: "/erp/manufacturing/documentation", label: "Documentation" },
] as const;

export default async function ManufacturingWorkspacePage() {
  let data: Awaited<ReturnType<typeof loadManufacturingWorkspace>> | undefined;
  let errorMessage: string | undefined;

  try {
    data = await loadManufacturingWorkspace();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing workspace.";
  }

  return (
    <ManufacturingShell activeKey="overview">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Manufacturing workspace shell for operation planning, crew assignment, and production report readiness. Counts come from Supabase only; no demo or fake rows are rendered."
          title="Manufacturing Workspace"
        >
          <PageActions>
            <DocumentationHomeButton href="/erp/manufacturing/documentation" />
            <Link className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]" href="/erp/manufacturing/contracts">
              Open Contracts
            </Link>
          </PageActions>
        </PageHeader>
        <PageContent>
          <div className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm" role="alert">
              {errorMessage}
            </div>
          ) : data ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {data.sections.map((section) => (
                  <WorkspaceSection key={section.key} section={section} />
                ))}
              </div>
              <QuickActionsPanel quickActions={data.quickActions} />
            </>
          ) : null}
          </div>
        </PageContent>
        <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
          <h2 className="font-medium">Foundation Workspaces</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {workspaceLinks.map((item) => (
              <Link className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          {data ? <p className="mt-3 text-xs text-muted-foreground">Last refreshed {new Date(data.lastUpdated).toLocaleString()}.</p> : null}
        </section>
      </PageContainer>
    </ManufacturingShell>
  );
}
