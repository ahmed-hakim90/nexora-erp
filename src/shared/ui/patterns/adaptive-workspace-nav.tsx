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

const MORE_BUTTON_RESERVE_PX = 96;

function sameKeys(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function AdaptiveWorkspaceNav({
  activeKey,
  className,
  favoriteKeys = [],
  items,
  label = "Workspace sections",
  onToggleFavorite,
  recentKeys: _recentKeys = [],
}: Readonly<{
  activeKey: string;
  className?: string;
  favoriteKeys?: readonly string[];
  items: readonly AdaptiveWorkspaceNavItem[];
  label?: string;
  onToggleFavorite?: (key: string) => void;
  /** @deprecated Recents are stored by callers but no longer reorder the strip (avoids tab jump/jitter). */
  recentKeys?: readonly string[];
}>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflowKeys, setOverflowKeys] = useState<readonly string[]>([]);

  // Favorites pin to the front. Recent keys are tracked by callers for UX hints,
  // but must not reorder the tab strip — that jumps tabs on every click.
  const orderedItems = useMemo(() => {
    const favoriteSet = new Set(favoriteKeys);
    const favorites = items.filter((item) => favoriteSet.has(item.key));
    const rest = items.filter((item) => !favoriteSet.has(item.key));
    return [...favorites, ...rest];
  }, [favoriteKeys, items]);

  const itemSignature = useMemo(
    () => orderedItems.map((item) => `${item.key}:${item.href}`).join("|"),
    [orderedItems],
  );

  const visibleItems = useMemo(
    () => orderedItems.filter((item) => !overflowKeys.includes(item.key)),
    [orderedItems, overflowKeys],
  );
  const hiddenItems = useMemo(
    () => orderedItems.filter((item) => overflowKeys.includes(item.key)),
    [orderedItems, overflowKeys],
  );

  useEffect(() => {
    const measureRoot = measureRef.current;
    if (!measureRoot) return;

    const measure = () => {
      const children = Array.from(measureRoot.querySelectorAll<HTMLElement>("[data-nav-measure-item]"));
      if (children.length === 0) {
        setOverflowKeys((current) => (current.length === 0 ? current : []));
        return;
      }

      const containerRight = measureRoot.getBoundingClientRect().right - MORE_BUTTON_RESERVE_PX;
      const nextOverflow: string[] = [];
      let activeFits = true;

      for (const child of children) {
        const key = child.dataset.navMeasureItem;
        if (!key) continue;
        const fits = child.getBoundingClientRect().right <= containerRight;
        if (!fits) {
          nextOverflow.push(key);
          if (key === activeKey) activeFits = false;
        }
      }

      // Keep the active tab in the primary strip when it would otherwise overflow.
      let resolvedOverflow = nextOverflow;
      if (activeKey && !activeFits && nextOverflow.includes(activeKey)) {
        const withoutActive = nextOverflow.filter((key) => key !== activeKey);
        const swapTarget = withoutActive.at(-1);
        resolvedOverflow = swapTarget
          ? [...withoutActive.slice(0, -1), activeKey].filter(
              (key, index, array) => array.indexOf(key) === index,
            )
          : withoutActive;
      }

      setOverflowKeys((current) => (sameKeys(current, resolvedOverflow) ? current : resolvedOverflow));
    };

    measure();
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(measureRoot);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeKey, itemSignature]);

  void _recentKeys;

  return (
    <nav aria-label={label} className={cn("relative", className)}>
      {/* Stable full-width measure row — never hides children, so ResizeObserver cannot oscillate. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute inset-0 -z-10 flex items-center gap-2 overflow-hidden p-2"
        ref={measureRef}
      >
        {orderedItems.map((item) => (
          <div className="inline-flex shrink-0 items-center gap-1" data-nav-measure-item={item.key} key={item.key}>
            <span className={navTabTriggerClassName(false)}>{item.label}</span>
            {onToggleFavorite ? <span aria-hidden className="inline-block size-[1.625rem] shrink-0" /> : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-sm [scrollbar-width:thin]">
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
