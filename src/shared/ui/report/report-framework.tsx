import type { ReactNode } from "react";

function ReportSection({
  title,
  children,
}: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children ?? <p className="text-sm text-muted-foreground">Placeholder</p>}
    </section>
  );
}

export function ReportFilterPanel({ children }: Readonly<{ children?: ReactNode }>) {
  return <ReportSection title="Filters">{children}</ReportSection>;
}

export function SavedViews({ children }: Readonly<{ children?: ReactNode }>) {
  return <ReportSection title="Saved Views">{children}</ReportSection>;
}

export function ReportExportPlaceholder() {
  return <button type="button">Export</button>;
}

export function ReportPrintPlaceholder() {
  return <button type="button">Print</button>;
}

export function ChartArea({ children }: Readonly<{ children?: ReactNode }>) {
  return <ReportSection title="Chart Area">{children}</ReportSection>;
}

export function PivotPlaceholder() {
  return <ReportSection title="Pivot">Pivot placeholder</ReportSection>;
}

export function ReportTableArea({ children }: Readonly<{ children?: ReactNode }>) {
  return <ReportSection title="Table Area">{children}</ReportSection>;
}

export function ReportSummaryCards({ children }: Readonly<{ children?: ReactNode }>) {
  return <ReportSection title="Summary Cards">{children}</ReportSection>;
}

export function SchedulePlaceholder() {
  return <ReportSection title="Schedule">Schedule placeholder</ReportSection>;
}
