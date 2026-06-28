"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, MoreHorizontal, PanelsTopLeft, X } from "lucide-react";

import { DropdownMenu } from "../primitives";
import { Tooltip } from "../layout";
import { cn } from "../utils";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type WorkspaceNavItem = Readonly<{
  key: string;
  label: string;
  fullLabel?: string;
  href: string;
  isActive?: boolean;
}>;

export type WorkspaceIdentity = Readonly<{
  key: string;
  name: string;
  icon?: ReactNode;
}>;

export type WorkspaceNavProps = Readonly<{
  workspace: WorkspaceIdentity;
  items: readonly WorkspaceNavItem[];
}>;

export function WorkspaceNav({ workspace, items }: WorkspaceNavProps) {
  return (
    <nav
      aria-label={`${workspace.name} navigation`}
      className="sticky top-14 z-[45] border-b border-white/10 bg-[hsl(var(--shell-topbar))]/80 backdrop-blur-xl"
    >
      <div className="flex h-11 items-center gap-2 px-4 lg:px-6">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
          <span className="text-[hsl(var(--accent))]">{workspace.icon ?? <PanelsTopLeft className="size-4" />}</span>
          <span className="max-w-[9rem] truncate">{workspace.name}</span>
        </span>
        <span aria-hidden className="h-5 w-px bg-[hsl(var(--border))]" />
        <DesktopNav items={items} />
        <MobileNav items={items} workspaceName={workspace.name} />
      </div>
    </nav>
  );
}

function DesktopNav({ items }: Readonly<{ items: readonly WorkspaceNavItem[] }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) {
      return;
    }

    const available = container.clientWidth;
    const measuredItems = Array.from(measure.children) as HTMLElement[];
    const moreWidth = 92; // reserved space for the "More" trigger
    const gap = 6;

    let used = 0;
    let count = 0;
    for (let index = 0; index < measuredItems.length; index += 1) {
      const itemWidth = measuredItems[index].offsetWidth;
      const projected = used + (count > 0 ? gap : 0) + itemWidth;
      const needsMore = index < measuredItems.length - 1;
      if (projected + (needsMore ? moreWidth : 0) > available && count > 0) {
        break;
      }
      used = projected;
      count += 1;
    }

    setVisibleCount(Math.max(1, Math.min(count, measuredItems.length)));
  }, []);

  useIsomorphicLayoutEffect(() => {
    recompute();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    return () => observer.disconnect();
  }, [items, recompute]);

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = items.slice(visibleCount);

  return (
    <div className="relative hidden min-w-0 flex-1 lg:block" ref={containerRef}>
      {/* Hidden measurement row keeps natural item widths available for overflow math. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex gap-1.5 opacity-0"
        ref={measureRef}
      >
        {items.map((item) => (
          <NavLink item={item} key={`measure-${item.key}`} tabIndex={-1} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {visibleItems.map((item) => (
          <NavLink item={item} key={item.key} />
        ))}
        {overflowItems.length > 0 ? (
          <DropdownMenu
            align="end"
            items={overflowItems.map((item) => ({
              href: item.href,
              key: item.key,
              label: item.label,
            }))}
            trigger={
              <button
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 text-xs shadow-sm backdrop-blur transition hover:bg-[hsl(var(--muted))]",
                  overflowItems.some((item) => item.isActive) &&
                    "border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))]",
                )}
                type="button"
                aria-label="Open more workspace pages"
              >
                <MoreHorizontal aria-hidden className="size-4" />
                More
                <ChevronDown aria-hidden className="size-3.5" />
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function MobileNav({
  items,
  workspaceName,
}: Readonly<{ items: readonly WorkspaceNavItem[]; workspaceName: string }>) {
  const [open, setOpen] = useState(false);
  const activeItem = items.find((item) => item.isActive);

  return (
    <div className="lg:hidden">
      <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
        <DialogPrimitive.Trigger asChild>
          <button
            aria-label={`Open ${workspaceName} pages`}
            className="inline-flex h-8 items-center gap-2 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 text-xs shadow-sm backdrop-blur"
            type="button"
          >
            <span className="max-w-[9rem] truncate">{activeItem?.label ?? "Menu"}</span>
            <ChevronDown className="size-4" />
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
          <DialogPrimitive.Content className="fixed inset-y-0 start-0 z-[var(--z-modal)] flex h-dvh w-[min(20rem,calc(100vw-3rem))] flex-col border-e bg-[hsl(var(--surface))] shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between border-b p-4">
              <DialogPrimitive.Title className="font-semibold">{workspaceName}</DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-xl border bg-[hsl(var(--surface-glass))] shadow-sm"
              >
                <X aria-hidden className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {items.map((item) => (
                <li key={item.key}>
                  <a
                    aria-current={item.isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-xl px-3 py-2.5 text-sm transition hover:bg-[hsl(var(--muted))]",
                      item.isActive &&
                        "bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]",
                    )}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function NavLink({
  item,
  tabIndex,
}: Readonly<{ item: WorkspaceNavItem; tabIndex?: number }>) {
  return (
    <Tooltip content={item.fullLabel ?? item.label}>
      <a
        aria-current={item.isActive ? "page" : undefined}
        className={cn(
          "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
          item.isActive &&
            "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] shadow-sm hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--accent))]",
        )}
        href={item.href}
        tabIndex={tabIndex}
      >
        {item.label}
      </a>
    </Tooltip>
  );
}
