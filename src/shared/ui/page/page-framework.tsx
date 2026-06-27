import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../utils";

export function PageContainer({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("mx-auto w-full max-w-[var(--container-page)] space-y-4", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children?: ReactNode;
}>) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function PageActions({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function PageFilters({ children }: Readonly<{ children: ReactNode }>) {
  return <section className="rounded-md border bg-[hsl(var(--surface))] p-4">{children}</section>;
}

export function PageContent({ children }: Readonly<{ children: ReactNode }>) {
  return <section className="min-w-0">{children}</section>;
}

export function PageSidebar({ children }: Readonly<{ children: ReactNode }>) {
  return <aside className="rounded-md border bg-[hsl(var(--surface))] p-4">{children}</aside>;
}

export function PageFooter({ children }: Readonly<{ children: ReactNode }>) {
  return <footer className="border-t pt-4 text-sm text-muted-foreground">{children}</footer>;
}
