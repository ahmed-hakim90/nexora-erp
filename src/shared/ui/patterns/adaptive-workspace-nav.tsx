"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Star } from "lucide-react";

import { Button } from "../primitives";
import { Popover } from "../layout";
import { cn } from "../utils";
import { navTabTriggerClassName } from "./nav-tabs";

export type AdaptiveWorkspaceNavItem = Readonly<{
  favorite?: boolean;
  href: string;
  key: string;
  label: ReactNode;
  onToggleFavorite?: () => void;
}>;

export function AdaptiveWorkspaceNav({
  activeKey,
  className,
  favoriteKeys = [],
  items,
  label = "Workspace sections",
  onToggleFavorite,
  recentKeys = [],
}: Readonly<{
  activeKey: string;
  className?: string;
  favoriteKeys?: readonly string[];
  items: readonly AdaptiveWorkspaceNavItem[];
  label?: string;
  onToggleFavorite?: (key: string) => void;
  recentKeys?: readonly string[];
}>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowKeys, setOverflowKeys] = useState<readonly string[]>([]);

  const orderedItems = useMemo(() => {
    const favoriteSet = new Set(favoriteKeys);
    const recentSet = new Set(recentKeys);
    const favorites = items.filter((item) => favoriteSet.has(item.key));
    const recent = items.filter((item) => recentSet.has(item.key) && !favoriteSet.has(item.key));
    const rest = items.filter((item) => !favoriteSet.has(item.key) && !recentSet.has(item.key));
    return [...favorites, ...recent, ...rest];
  }, [favoriteKeys, items, recentKeys]);

  const visibleItems = orderedItems.filter((item) => !overflowKeys.includes(item.key));
  const hiddenItems = orderedItems.filter((item) => overflowKeys.includes(item.key));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const measure = () => {
      const children = Array.from(container.querySelectorAll<HTMLElement>("[data-nav-item]"));
      if (children.length === 0) {
        setOverflowKeys([]);
        return;
      }

      const containerRight = container.getBoundingClientRect().right - 96;
      const nextOverflow: string[] = [];
      let activeVisible = false;

      for (const child of children) {
        const key = child.dataset.navItem;
        if (!key) continue;
        const rect = child.getBoundingClientRect();
        const fits = rect.right <= containerRight;
        if (key === activeKey) {
          activeVisible = fits || nextOverflow.length === 0;
        }
        if (!fits) {
          nextOverflow.push(key);
        }
      }

      if (activeKey && !activeVisible && !nextOverflow.includes(activeKey)) {
        const withoutActive = nextOverflow.filter((key) => key !== activeKey);
        const widest = withoutActive[withoutActive.length - 1];
        if (widest) {
          setOverflowKeys([...withoutActive.slice(0, -1), activeKey, widest].filter((key, index, array) => array.indexOf(key) === index));
          return;
        }
      }

      setOverflowKeys(nextOverflow);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeKey, orderedItems]);

  return (
    <nav aria-label={label} className={cn("relative", className)}>
      <div
        className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-sm [scrollbar-width:thin]"
        ref={scrollRef}
      >
        {visibleItems.map((item) => (
          <AdaptiveWorkspaceNavLink
            active={item.key === activeKey}
            favorite={favoriteKeys.includes(item.key)}
            href={item.href}
            itemKey={item.key}
            key={item.key}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(item.key) : item.onToggleFavorite}
          >
            {item.label}
          </AdaptiveWorkspaceNavLink>
        ))}

        {hiddenItems.length > 0 ? (
          <Popover
            align="end"
            trigger={
              <Button className="shrink-0 rounded-full" type="button" variant="secondary">
                More
                <ChevronDown aria-hidden className="ms-1 size-4" />
                <span className="sr-only">({hiddenItems.length} sections)</span>
              </Button>
            }
          >
            <div className="min-w-[12rem] space-y-1 p-1">
              {hiddenItems.map((item) => (
                <Link
                  aria-current={item.key === activeKey ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]",
                    item.key === activeKey && "bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]",
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <span>{item.label}</span>
                  {onToggleFavorite ? (
                    <button
                      aria-label={favoriteKeys.includes(item.key) ? "Remove from favorites" : "Add to favorites"}
                      className="rounded p-1 hover:bg-[hsl(var(--surface))]"
                      onClick={(event) => {
                        event.preventDefault();
                        onToggleFavorite(item.key);
                      }}
                      type="button"
                    >
                      <Star
                        aria-hidden
                        className={cn("size-3.5", favoriteKeys.includes(item.key) && "fill-current text-[hsl(var(--warning))]")}
                      />
                    </button>
                  ) : null}
                </Link>
              ))}
            </div>
          </Popover>
        ) : null}
      </div>
    </nav>
  );
}

function AdaptiveWorkspaceNavLink({
  active,
  children,
  favorite,
  href,
  itemKey,
  onToggleFavorite,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  favorite?: boolean;
  href: string;
  itemKey: string;
  onToggleFavorite?: () => void;
}>) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1" data-nav-item={itemKey}>
      <Link aria-current={active ? "page" : undefined} className={navTabTriggerClassName(active)} href={href}>
        {children}
      </Link>
      {onToggleFavorite ? (
        <button
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          className="rounded-md p-1 text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
          onClick={onToggleFavorite}
          type="button"
        >
          <Star aria-hidden className={cn("size-3.5", favorite && "fill-current text-[hsl(var(--warning))]")} />
        </button>
      ) : null}
    </div>
  );
}
