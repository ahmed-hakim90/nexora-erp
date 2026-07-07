"use client";

import type { ReactNode } from "react";

import { cn } from "../utils";

export function ProfileLayout({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function ProfileHeader({
  actions,
  avatar,
  badges,
  className,
  description,
  metrics,
  sticky = false,
  subtitle,
  title,
}: Readonly<{
  actions?: ReactNode;
  avatar?: ReactNode;
  badges?: ReactNode;
  className?: string;
  description?: string;
  metrics?: ReactNode;
  sticky?: boolean;
  subtitle?: string;
  title: ReactNode;
}>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 shadow-sm",
        sticky && "sticky top-[calc(var(--shell-topbar-height,64px)+0.75rem)] z-[var(--z-sticky,20)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {avatar}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
              {badges}
            </div>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
            {description ? <p className="max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p> : null}
            {metrics}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function ProfileSummaryStrip({
  children,
  className,
  sticky = false,
}: Readonly<{
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-muted))]/60 p-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        sticky && "sticky top-[calc(var(--shell-topbar-height,64px)+7.5rem)] z-[calc(var(--z-sticky,20)-1)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProfileSummaryMetric({
  helper,
  label,
  value,
}: Readonly<{
  helper?: string;
  label: string;
  value: ReactNode;
}>) {
  return (
    <div className="min-w-0 rounded-md border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface))] px-2.5 py-1.5">
      <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold leading-tight">{value}</p>
      {helper ? <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function ProfileQuickActions({
  children,
  className,
  sticky = false,
  title = "Quick actions",
}: Readonly<{
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  title?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4",
        sticky && "sticky top-[calc(var(--shell-topbar-height,64px)+11rem)]",
        className,
      )}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function ProfileBody({
  children,
  className,
  sidebar,
}: Readonly<{
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
}>) {
  return (
    <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]", className)}>
      <main className="min-w-0 space-y-4">{children}</main>
      {sidebar ? (
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--shell-topbar-height,64px)+7.5rem)] xl:self-start">
          {sidebar}
        </aside>
      ) : null}
    </div>
  );
}

export function ProfileSidebar({
  children,
  className,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  title?: string;
}>) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? <h2 className="text-sm font-medium text-muted-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}

export function ProfileActivityRail({
  children,
  emptyMessage = "No recent activity.",
  title = "Activity",
}: Readonly<{
  children?: ReactNode;
  emptyMessage?: string;
  title?: string;
}>) {
  return (
    <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children ?? <p className="text-sm text-muted-foreground">{emptyMessage}</p>}</div>
    </article>
  );
}

export function ProfileRelatedRecords({
  children,
  emptyMessage = "No related records.",
  title = "Related records",
}: Readonly<{
  children?: ReactNode;
  emptyMessage?: string;
  title?: string;
}>) {
  return (
    <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3 space-y-2">{children ?? <p className="text-sm text-muted-foreground">{emptyMessage}</p>}</div>
    </article>
  );
}

export function ProfileStatusBadge({
  label,
  tone = "neutral",
}: Readonly<{
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 text-foreground",
        tone === "success" && "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        tone === "warning" && "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
        tone === "danger" && "border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]",
        tone === "info" && "border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
      )}
    >
      {label}
    </span>
  );
}
