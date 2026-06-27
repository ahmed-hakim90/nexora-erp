import type { ReactNode } from "react";

export function WidgetContainer({
  title,
  children,
}: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children ?? <p className="text-sm text-muted-foreground">Widget placeholder</p>}
    </section>
  );
}

export function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <WidgetContainer title={label}><p className="text-3xl font-semibold">{value}</p></WidgetContainer>;
}

export function StatisticCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <MetricCard label={label} value={value} />;
}

export function ChartContainer({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Chart">{children}</WidgetContainer>;
}

export function ActivityFeed({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Activity Feed">{children}</WidgetContainer>;
}

export function ApprovalQueue({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Approval Queue">{children}</WidgetContainer>;
}

export function QuickActions({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Quick Actions">{children}</WidgetContainer>;
}

export function RecentItems({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Recent Items">{children}</WidgetContainer>;
}

export function AlertPanel({ children }: Readonly<{ children?: ReactNode }>) {
  return <WidgetContainer title="Alerts">{children}</WidgetContainer>;
}
