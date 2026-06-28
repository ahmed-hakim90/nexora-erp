import type { ReactNode } from "react";

import { EnterpriseDataTable, type EnterpriseDataTableProps } from "../data-table";
import { PageContainer, PageContent, PageHeader } from "../page";
import { Button } from "../primitives";
import { cn } from "../utils";

export type LifecycleStep = Readonly<{
  key: string;
  label: string;
  state: "complete" | "current" | "pending" | "blocked";
}>;

export function StatusChip({
  status,
  tone = "neutral",
}: Readonly<{
  status: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "success" && "border-[hsl(var(--success))] text-[hsl(var(--success))]",
        tone === "warning" && "border-[hsl(var(--warning))] text-[hsl(var(--warning))]",
        tone === "danger" && "border-[hsl(var(--danger))] text-[hsl(var(--danger))]",
        tone === "accent" && "border-[hsl(var(--accent))] text-[hsl(var(--accent))]",
      )}
    >
      {status}
    </span>
  );
}

export function DocumentLifecycleBar({
  steps,
}: Readonly<{ steps: readonly LifecycleStep[] }>) {
  return (
    <ol className="flex flex-wrap items-center gap-2 rounded-md border bg-[hsl(var(--surface))] p-3">
      {steps.map((step, index) => (
        <li className="inline-flex items-center gap-2 text-sm" key={step.key}>
          {index > 0 ? <span className="text-muted-foreground">/</span> : null}
          <span
            className={cn(
              "rounded-full border px-3 py-1",
              step.state === "complete" && "border-[hsl(var(--success))] text-[hsl(var(--success))]",
              step.state === "current" && "border-[hsl(var(--accent))] bg-[hsl(var(--muted))] font-medium",
              step.state === "blocked" && "border-[hsl(var(--danger))] text-[hsl(var(--danger))]",
              step.state === "pending" && "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FacetedFilterBar({
  filters,
}: Readonly<{
  filters: readonly { key: string; label: string; value?: string }[];
}>) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button key={filter.key} size="sm" type="button" variant="secondary">
          {filter.label}
          {filter.value ? <span className="text-muted-foreground">{filter.value}</span> : null}
        </Button>
      ))}
    </div>
  );
}

export function ImportExportActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" type="button" variant="secondary">
        Import
      </Button>
      <Button size="sm" type="button" variant="secondary">
        Export
      </Button>
    </div>
  );
}

export function ListPageTemplate<TRecord>({
  title,
  description,
  table,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  table: EnterpriseDataTableProps<TRecord>;
  actions?: ReactNode;
}>) {
  return (
    <PageContainer>
      <PageHeader description={description} title={title}>
        {actions}
      </PageHeader>
      <PageContent>
        <EnterpriseDataTable {...table} />
      </PageContent>
    </PageContainer>
  );
}

export function DetailWorkspaceTemplate({
  title,
  description,
  lifecycle,
  children,
}: Readonly<{
  title: string;
  description?: string;
  lifecycle?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <PageContainer>
      <PageHeader description={description} title={title} />
      {lifecycle}
      <PageContent>{children}</PageContent>
    </PageContainer>
  );
}

export function DashboardTemplate({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <PageContainer>
      <PageHeader description={description} title={title} />
      <PageContent>{children}</PageContent>
    </PageContainer>
  );
}
