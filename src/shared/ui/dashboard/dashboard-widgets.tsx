import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "../utils";

export function WidgetContainer({
  title,
  children,
  action,
  className,
}: Readonly<{
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children ?? <p className="text-sm text-muted-foreground">Widget placeholder</p>}
    </section>
  );
}

export type KpiCardProps = Readonly<{
  changeLabel?: string;
  changeTone?: "up" | "down" | "neutral";
  compact?: boolean;
  helperText?: string;
  href?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  label: string;
  onClick?: () => void;
  value: ReactNode;
}>;

export function KpiCard({
  changeLabel,
  changeTone = "neutral",
  compact = false,
  helperText,
  href,
  icon: Icon = Activity,
  isLoading,
  label,
  onClick,
  value,
}: KpiCardProps) {
  const content = (
    <article
      className={cn(
        "relative overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--surface))] transition",
        compact
          ? "rounded-md px-2.5 py-1.5 shadow-none"
          : "rounded-2xl p-5 shadow-sm",
        (href || onClick) &&
          (compact
            ? "hover:border-[hsl(var(--accent))]/35 hover:bg-[hsl(var(--surface-muted))]/40"
            : "hover:-translate-y-0.5 hover:border-[hsl(var(--accent))]/35 hover:shadow-md motion-reduce:hover:translate-y-0"),
      )}
    >
      {isLoading ? (
        <div className={cn("space-y-2", !compact && "space-y-3")}>
          <div className="h-2.5 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className={cn("animate-pulse rounded bg-[hsl(var(--muted))]", compact ? "h-5 w-12" : "h-8 w-20")} />
          <div className="h-2.5 w-full animate-pulse rounded bg-[hsl(var(--muted))]" />
        </div>
      ) : compact ? (
        <>
          <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold leading-tight">{value}</p>
          {changeLabel ? (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 text-[0.68rem] leading-tight",
                changeTone === "up" && "text-[hsl(var(--success))]",
                changeTone === "down" && "text-[hsl(var(--danger))]",
                changeTone === "neutral" && "text-muted-foreground",
              )}
            >
              {changeTone === "up" ? <TrendingUp aria-hidden className="size-3" /> : null}
              {changeTone === "down" ? <TrendingDown aria-hidden className="size-3" /> : null}
              {changeLabel}
            </p>
          ) : null}
          {helperText ? <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-muted-foreground">{helperText}</p> : null}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
            </div>
            <div className="grid size-10 place-items-center rounded-2xl border bg-[hsl(var(--surface-muted))]/70">
              <Icon aria-hidden className="size-4 text-[hsl(var(--accent))]" />
            </div>
          </div>
          {changeLabel ? (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-sm",
                changeTone === "up" && "text-[hsl(var(--success))]",
                changeTone === "down" && "text-[hsl(var(--danger))]",
                changeTone === "neutral" && "text-muted-foreground",
              )}
            >
              {changeTone === "up" ? <TrendingUp aria-hidden className="size-4" /> : null}
              {changeTone === "down" ? <TrendingDown aria-hidden className="size-4" /> : null}
              {changeLabel}
            </p>
          ) : null}
          {helperText ? <p className="mt-2 text-sm text-muted-foreground">{helperText}</p> : null}
        </>
      )}
    </article>
  );

  if (href) {
    return (
      <Link className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" href={href}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className="block w-full text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return content;
}

export function MetricCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <KpiCard label={label} value={value} />;
}

export function StatisticCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <KpiCard label={label} value={value} />;
}

export function ChartContainer({ children, title = "Chart" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}

export function ActivityFeed({ children, title = "Activity Feed" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}

export function ApprovalQueue({ children, title = "Approval Queue" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}

export function QuickActions({ children, title = "Quick Actions" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}

export function RecentItems({ children, title = "Recent Items" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}

export function AlertPanel({ children, title = "Alerts" }: Readonly<{ children?: ReactNode; title?: string }>) {
  return <WidgetContainer title={title}>{children}</WidgetContainer>;
}
