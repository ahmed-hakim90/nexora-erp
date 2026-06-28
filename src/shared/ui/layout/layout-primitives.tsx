"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";

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
  onValueChange,
}: Readonly<{
  tabs: readonly { key: string; label: string; content: ReactNode }[];
  activeKey: string;
  onValueChange?: (value: string) => void;
}>) {
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <TabsPrimitive.Root
      onValueChange={onValueChange}
      value={activeTab?.key}
    >
      <TabsPrimitive.List aria-label="Tabs" className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            className="border-b-2 border-transparent px-3 py-2 text-sm data-[state=active]:border-[hsl(var(--accent))] data-[state=active]:font-medium"
            key={tab.key}
            value={tab.key}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content className="pt-4" key={tab.key} value={tab.key}>
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
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
  trigger,
  open,
  onOpenChange,
  side = "end",
}: Readonly<{
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "start" | "end";
}>) {
  if (!trigger && open === undefined && !onOpenChange) {
    return (
      <aside aria-label={title} className="rounded-md border bg-[hsl(var(--surface))] p-4 shadow-sm">
        {children}
      </aside>
    );
  }

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 z-[var(--z-modal)] h-dvh w-full max-w-xl overflow-auto border bg-[hsl(var(--surface))] p-6 shadow-md",
            side === "start" ? "start-0 border-e" : "end-0 border-s",
          )}
        >
          <DialogPrimitive.Title className="mb-4 text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          {children}
          <DialogPrimitive.Close
            aria-label="Close panel"
            className="absolute end-4 top-4 grid size-9 place-items-center rounded-md border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
          >
            <X aria-hidden className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Dialog({
  title,
  children,
  trigger,
  open,
  onOpenChange,
}: Readonly<{
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  if (!trigger && open === undefined && !onOpenChange) {
    return (
      <section aria-label={title} className="rounded-md border bg-[hsl(var(--surface))] p-6 shadow-md">
        {children}
      </section>
    );
  }

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border bg-[hsl(var(--surface))] p-6 shadow-md">
          <DialogPrimitive.Title className="mb-4 text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          {children}
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute end-4 top-4 grid size-9 place-items-center rounded-md border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
          >
            <X aria-hidden className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Popover({
  children,
  trigger,
}: Readonly<{ children: ReactNode; trigger?: ReactNode }>) {
  if (!trigger) {
    return <div className="rounded-md border bg-[hsl(var(--surface))] p-3 shadow-sm">{children}</div>;
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="z-[var(--z-dropdown)] min-w-64 rounded-md border bg-[hsl(var(--surface))] p-3 shadow-md"
          sideOffset={8}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 10,
  avoidCollisions = true,
}: Readonly<{
  children: ReactNode;
  content?: ReactNode;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  align?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["align"];
  sideOffset?: number;
  avoidCollisions?: boolean;
}>) {
  if (!content) {
    return <span className="rounded bg-[hsl(var(--foreground))] px-2 py-1 text-xs text-[hsl(var(--background))]">{children}</span>;
  }

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            align={align}
            avoidCollisions={avoidCollisions}
            className="z-[calc(var(--z-modal)+20)] rounded-md bg-[hsl(var(--foreground))] px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--background))] shadow-lg"
            side={side}
            sideOffset={sideOffset}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function ScrollableArea({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ScrollAreaPrimitive.Root className="overflow-hidden">
      <ScrollAreaPrimitive.Viewport className="h-full w-full">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" />
      <ScrollAreaPrimitive.Scrollbar orientation="horizontal" />
    </ScrollAreaPrimitive.Root>
  );
}

export function StickyToolbar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sticky top-0 z-[var(--z-sticky)] border-b bg-[hsl(var(--background))] p-3">{children}</div>;
}

export function StickyActions({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sticky bottom-0 z-[var(--z-sticky)] border-t bg-[hsl(var(--background))] p-3">{children}</div>;
}
