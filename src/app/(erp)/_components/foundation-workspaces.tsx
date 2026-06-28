import type { FoundationEntity, DashboardMetric } from "../foundation-ux-catalog";
import {
  DashboardTemplate,
  DetailWorkspaceTemplate,
  DocumentLifecycleBar,
  EntityLookup,
  FacetedFilterBar,
  FormGrid,
  FormSection,
  ImportExportActions,
  ListPageTemplate,
  PageContent,
  PageHeader,
  PageContainer,
  StatusChip,
} from "@/shared/ui";

export function FoundationDashboard({
  title,
  description,
  metrics,
}: Readonly<{
  title: string;
  description: string;
  metrics: readonly DashboardMetric[];
}>) {
  return (
    <DashboardTemplate description={description} title={title}>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article className="rounded-lg border bg-[hsl(var(--surface))] p-4" key={metric.key}>
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{metric.description}</p>
          </article>
        ))}
      </div>
    </DashboardTemplate>
  );
}

export function FoundationEntityList({
  title,
  description,
  entities,
}: Readonly<{
  title: string;
  description: string;
  entities: readonly FoundationEntity[];
}>) {
  return (
    <ListPageTemplate
      actions={<ImportExportActions />}
      description={description}
      table={{
        columns: [
          {
            header: "Workspace",
            key: "title",
            render: (entity) => (
              <div>
                <a className="font-medium" href={`#${entity.key}`}>
                  {entity.title}
                </a>
                <p className="text-sm text-muted-foreground">{entity.description}</p>
              </div>
            ),
          },
          {
            header: "Primary Actions",
            key: "actions",
            render: (entity) => entity.primaryActions.join(", "),
          },
          {
            header: "Permissions",
            key: "permissions",
            render: (entity) => (
              <div className="flex flex-wrap gap-1">
                {entity.permissions.map((permission) => (
                  <StatusChip key={permission} status={permission} />
                ))}
              </div>
            ),
          },
        ],
        emptyMessage: "No foundation workspaces defined.",
        getRowId: (entity) => entity.key,
        pagination: {
          mode: "page",
          page: 1,
          pageSize: entities.length,
          totalRows: entities.length,
        },
        records: entities,
        savedViews: [
          { key: "foundation", label: "Foundation Contracts", isActive: true },
          { key: "legacy-gap", label: "Reconciliation" },
        ],
        state: { globalSearch: "Foundation model", selectedRowIds: [] },
      }}
      title={title}
    />
  );
}

export function FoundationEntityDetails({
  entities,
}: Readonly<{ entities: readonly FoundationEntity[] }>) {
  return (
    <div className="space-y-6">
      {entities.map((entity) => (
        <section className="scroll-mt-24 rounded-lg border bg-[hsl(var(--surface))] p-4" id={entity.key} key={entity.key}>
          <PageHeader
            description={entity.description}
            title={entity.title}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <FormSection
              description="Canonical Foundation fields and lookup relationships that the future runtime must support."
              title="Form Architecture"
            >
              <FormGrid>
                <EntityLookup
                  label="Lookup-first relationship"
                  options={entity.relationships.map((relationship) => ({
                    id: relationship,
                    label: relationship,
                  }))}
                />
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Fields</p>
                  <p className="mt-1 text-muted-foreground">{entity.fields.join(", ")}</p>
                </div>
              </FormGrid>
            </FormSection>
            <div className="space-y-3">
              <h3 className="font-medium">Primary Actions</h3>
              <div className="flex flex-wrap gap-2">
                {entity.primaryActions.map((action) => (
                  <StatusChip key={action} status={action} tone="accent" />
                ))}
              </div>
              {entity.reconciliationItems?.length ? (
                <>
                  <h3 className="font-medium">Reconciliation</h3>
                  <div className="flex flex-wrap gap-2">
                    {entity.reconciliationItems.map((item) => (
                      <StatusChip key={item} status={item} tone="warning" />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function DocumentWorkspacePreview({
  title,
  description,
  steps,
}: Readonly<{
  title: string;
  description: string;
  steps: readonly string[];
}>) {
  return (
    <DetailWorkspaceTemplate
      description={description}
      lifecycle={
        <DocumentLifecycleBar
          steps={steps.map((step, index) => ({
            key: step,
            label: step,
            state: index === 0 ? "complete" : index === 1 ? "current" : "pending",
          }))}
        />
      }
      title={title}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border p-4">
          <h3 className="font-medium">Filters</h3>
          <FacetedFilterBar
            filters={[
              { key: "status", label: "Status", value: "All" },
              { key: "branch", label: "Branch", value: "Active" },
              { key: "period", label: "Period", value: "Current" },
            ]}
          />
        </div>
        <div className="rounded-md border p-4">
          <h3 className="font-medium">Bulk Actions</h3>
          <p className="mt-2 text-sm text-muted-foreground">Permission-gated submit, complete, export, print, and archive actions.</p>
        </div>
        <div className="rounded-md border p-4">
          <h3 className="font-medium">Responsive Behavior</h3>
          <p className="mt-2 text-sm text-muted-foreground">Tables collapse to cards, drawers become full-height sheets, and the command palette remains keyboard-first.</p>
        </div>
      </div>
    </DetailWorkspaceTemplate>
  );
}

export function ReconciliationRegister({
  items,
}: Readonly<{
  items: readonly { key: string; title: string; description: string }[];
}>) {
  return (
    <PageContainer id="reconciliation">
      <PageHeader
        description="Legacy implementation mismatches are tracked explicitly. The accepted Foundation Contracts remain canonical."
        title="Reconciliation Register"
      />
      <PageContent>
        <div className="grid gap-3">
          {items.map((item) => (
            <article className="rounded-md border bg-[hsl(var(--surface))] p-4" key={item.key}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={item.key} tone="warning" />
                <h3 className="font-medium">{item.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
}
