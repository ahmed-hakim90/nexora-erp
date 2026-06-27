import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../utils";

export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export function Stack({
  gap = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  gap?: "sm" | "md" | "lg";
}) {
  const gapClass = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-8" : "gap-4";
  return <div className={cn("flex flex-col", gapClass, className)} {...props} />;
}

export function Grid({
  columns = 2,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  columns?: 1 | 2 | 3 | 4;
}) {
  const columnsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  }[columns];

  return <div className={cn("grid gap-4", columnsClass, className)} {...props} />;
}

export function SplitView({
  sidebar,
  children,
}: Readonly<{
  sidebar: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside>{sidebar}</aside>
      <section>{children}</section>
    </div>
  );
}

export function ResizablePanels({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2" data-resizable-placeholder>
      {children}
    </div>
  );
}

export function Tabs({
  tabs,
  activeKey,
}: Readonly<{
  tabs: readonly { key: string; label: string; content: ReactNode }[];
  activeKey: string;
}>) {
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <div>
      <div aria-label="Tabs" className="flex gap-2 border-b" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={tab.key === activeTab?.key}
            className="px-3 py-2 text-sm"
            key={tab.key}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4" role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}

export function Accordion({
  items,
}: Readonly<{
  items: readonly { key: string; title: string; content: ReactNode }[];
}>) {
  return (
    <div className="divide-y rounded-md border">
      {items.map((item) => (
        <details key={item.key} className="group">
          <summary className="cursor-pointer px-4 py-3 font-medium">{item.title}</summary>
          <div className="px-4 pb-4 text-sm text-muted-foreground">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function Drawer({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <aside aria-label={title} className="rounded-md border bg-[hsl(var(--surface))] p-4 shadow-sm">
      {children}
    </aside>
  );
}

export function Dialog({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section aria-label={title} className="rounded-md border bg-[hsl(var(--surface))] p-6 shadow-md">
      {children}
    </section>
  );
}

export function Popover({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="rounded-md border bg-[hsl(var(--surface))] p-3 shadow-sm">{children}</div>;
}

export function Tooltip({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="rounded bg-[hsl(var(--foreground))] px-2 py-1 text-xs text-[hsl(var(--background))]">{children}</span>;
}

export function ScrollableArea({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="overflow-auto">{children}</div>;
}

export function StickyToolbar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sticky top-0 z-[var(--z-sticky)] border-b bg-[hsl(var(--background))] p-3">{children}</div>;
}

export function StickyActions({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sticky bottom-0 z-[var(--z-sticky)] border-t bg-[hsl(var(--background))] p-3">{children}</div>;
}
