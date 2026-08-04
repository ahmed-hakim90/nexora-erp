"use client";

import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  LayoutGrid,
  PanelsTopLeft,
  Search,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";

import { DropdownMenu, Input } from "../primitives";
import { Tooltip } from "../layout";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";
import { useEnterpriseUi } from "../providers/enterprise-ui-context";
import { cn } from "../utils";
import { useWorkspaceNavigationPreferences } from "./use-workspace-navigation-preferences";
import type {
  EnterpriseWorkspaceNavigationProps,
  WorkspaceNavigationBadge,
  WorkspaceNavigationItem,
  WorkspaceNavigationSection,
} from "./workspace-navigation.types";
import {
  buildNavigationSections,
  filterNavigationSections,
  getVisibleNavigationItems,
  sortNavigationItems,
} from "./workspace-navigation.utils";

function isRenderableIconComponent(value: unknown): value is LucideIcon {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "$$typeof" in value && "render" in value)
  );
}

function renderNavigationIcon(icon: LucideIcon | ReactNode | undefined, className: string): ReactNode {
  if (!icon) {
    return null;
  }
  if (isValidElement(icon)) {
    return icon;
  }
  if (isRenderableIconComponent(icon)) {
    const Icon = icon;
    return <Icon aria-hidden className={className} />;
  }
  return icon;
}

function renderSectionIcon(section: WorkspaceNavigationSection): ReactNode {
  return renderNavigationIcon(section.icon, "size-3.5 shrink-0");
}

export function EnterpriseWorkspaceNavigation({
  workspace,
  items,
  enableFavorites = true,
  enableRecent = true,
}: EnterpriseWorkspaceNavigationProps) {
  const { locale, t } = useEnterpriseUi();
  const visibleItems = useMemo(() => getVisibleNavigationItems(items), [items]);
  const {
    isFavorite,
    isGroupExpanded,
    preferences,
    recentItems,
    recordRecent,
    toggleFavorite,
    toggleGroupExpanded,
  } = useWorkspaceNavigationPreferences(workspace.key);

  const activeItem = visibleItems.find((item) => item.isActive);

  useEffect(() => {
    if (activeItem) {
      recordRecent(activeItem);
    }
  }, [activeItem?.id, activeItem, recordRecent]);

  return (
    <nav
      aria-label={t("workspace.nav.aria", { name: workspace.name })}
      className="sticky top-14 z-[45] border-b border-[hsl(var(--border))] bg-[hsl(var(--shell-topbar))]"
    >
      <div className="flex h-11 items-center gap-2 px-4 lg:px-6">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur">
          <span className="text-[hsl(var(--accent))]">
            {workspace.icon ?? <PanelsTopLeft aria-hidden className="size-4" />}
          </span>
          <span className="max-w-[9rem] truncate">{workspace.name}</span>
        </span>
        <span aria-hidden className="h-5 w-px bg-[hsl(var(--border))]" />
        <DesktopNavigation
          enableFavorites={enableFavorites}
          enableRecent={enableRecent}
          favoriteKeys={preferences.favoriteKeys}
          isFavorite={isFavorite}
          isGroupExpanded={isGroupExpanded}
          items={visibleItems}
          locale={locale}
          onToggleFavorite={toggleFavorite}
          onToggleGroupExpanded={toggleGroupExpanded}
          recentItems={recentItems}
        />
        <MobileNavigation
          isGroupExpanded={isGroupExpanded}
          items={visibleItems}
          locale={locale}
          onToggleGroupExpanded={toggleGroupExpanded}
          workspaceName={workspace.name}
        />
      </div>
    </nav>
  );
}

function DesktopNavigation({
  items,
  favoriteKeys,
  isFavorite,
  isGroupExpanded,
  onToggleFavorite,
  onToggleGroupExpanded,
  recentItems,
  enableFavorites,
  enableRecent,
  locale,
}: Readonly<{
  items: readonly WorkspaceNavigationItem[];
  favoriteKeys: readonly string[];
  isFavorite: (itemId: string) => boolean;
  isGroupExpanded: (groupKey: string, defaultExpanded?: boolean) => boolean;
  onToggleFavorite: (itemId: string) => void;
  onToggleGroupExpanded: (groupKey: string) => void;
  recentItems: readonly { id: string; title: string; route: string }[];
  enableFavorites: boolean;
  enableRecent: boolean;
  locale: "ar" | "en";
}>) {
  const { t } = useEnterpriseUi();
  const sections = useMemo(
    () => buildNavigationSections(items, favoriteKeys, locale),
    [favoriteKeys, items, locale],
  );

  return (
    <div
      aria-label={t("workspace.nav.sections")}
      className="relative hidden min-w-0 flex-1 lg:flex lg:items-center lg:gap-1.5"
      role="navigation"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <GroupNavigationControl key={section.key} section={section} />
        ))}
      </div>
      <QuickAccessPanel
        enableFavorites={enableFavorites}
        enableRecent={enableRecent}
        isFavorite={isFavorite}
        isGroupExpanded={isGroupExpanded}
        items={items}
        onToggleFavorite={onToggleFavorite}
        onToggleGroupExpanded={onToggleGroupExpanded}
        recentItems={recentItems}
        sections={sections}
      />
    </div>
  );
}

function GroupNavigationControl({
  section,
}: Readonly<{
  section: WorkspaceNavigationSection;
}>) {
  const { t } = useEnterpriseUi();
  const activeItem = section.items.find((item) => item.isActive);
  const isGroupActive = Boolean(activeItem);

  if (section.items.length === 1) {
    const item = section.items[0];
    return (
      <Tooltip content={item.fullTitle ?? item.title}>
        <a
          aria-current={item.isActive ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
            item.isActive &&
              "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] shadow-sm hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--accent))]",
          )}
          href={item.route}
        >
          {renderSectionIcon(section)}
          {section.title}
          {item.badge ? <NavigationBadge badge={item.badge} /> : null}
        </a>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu
      align="start"
      items={section.items.map((item) => ({
        href: item.route,
        key: item.id,
        label: (
          <span className="flex w-full items-center justify-between gap-3">
            <span className={cn(item.isActive && "font-medium text-[hsl(var(--accent))]")}>
              {item.fullTitle ?? item.title}
            </span>
            {item.badge ? <NavigationBadge badge={item.badge} /> : null}
          </span>
        ),
      }))}
      trigger={
        <button
          aria-current={isGroupActive ? "page" : undefined}
          aria-haspopup="menu"
          aria-label={t("workspace.nav.openGroupPages", { title: section.title })}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
            isGroupActive &&
              "border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] shadow-sm",
          )}
          type="button"
        >
          {renderSectionIcon(section)}
          <span>{section.title}</span>
          {activeItem ? (
            <span className="max-w-[8rem] truncate text-[0.7rem] font-normal opacity-80">
              · {activeItem.mobileLabel ?? activeItem.title}
            </span>
          ) : null}
          <ChevronDown aria-hidden className="size-3.5 opacity-70" />
        </button>
      }
    />
  );
}

function QuickAccessPanel({
  sections,
  items,
  recentItems,
  isFavorite,
  isGroupExpanded,
  onToggleFavorite,
  onToggleGroupExpanded,
  enableFavorites,
  enableRecent,
}: Readonly<{
  sections: readonly WorkspaceNavigationSection[];
  items: readonly WorkspaceNavigationItem[];
  recentItems: readonly { id: string; title: string; route: string }[];
  isFavorite: (itemId: string) => boolean;
  isGroupExpanded: (groupKey: string, defaultExpanded?: boolean) => boolean;
  onToggleFavorite: (itemId: string) => void;
  onToggleGroupExpanded: (groupKey: string) => void;
  enableFavorites: boolean;
  enableRecent: boolean;
}>) {
  const { t } = useEnterpriseUi();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filteredSections = useMemo(
    () => filterNavigationSections(sections, query),
    [query, sections],
  );
  const favoriteItems = useMemo(
    () => sortNavigationItems(items.filter((item) => isFavorite(item.id)), []),
    [isFavorite, items],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    function handleGlobalShortcut(event: globalThis.KeyboardEvent) {
      if (event.key === "/" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t("workspace.nav.quickAccessOpen")}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 text-xs shadow-sm backdrop-blur transition hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
            items.some((item) => item.isActive && !open) &&
              "border-[hsl(var(--accent))]/40 text-[hsl(var(--accent))]",
          )}
          type="button"
        >
          <LayoutGrid aria-hidden className="size-4" />
          {t("workspace.nav.quickAccess")}
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
        onEscapeKeyDown={() => handleOpenChange(false)}
      >
        <div className="sticky top-0 z-[1] space-y-2 border-b bg-[hsl(var(--surface))] p-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={t("workspace.nav.searchSections")}
              className="ps-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("workspace.nav.searchPlaceholder")}
              ref={searchRef}
              value={query}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {enableRecent && !query && recentItems.length > 0 ? (
            <OverflowSection title={t("workspace.nav.recent")} icon={Clock3}>
              <ul className="space-y-0.5">
                {recentItems.map((recent) => (
                  <OverflowLink
                    href={recent.route}
                    isActive={items.some((item) => item.id === recent.id && item.isActive)}
                    key={recent.id}
                    label={recent.title}
                    onNavigate={() => handleOpenChange(false)}
                  />
                ))}
              </ul>
            </OverflowSection>
          ) : null}
          {enableFavorites && !query && favoriteItems.length > 0 ? (
            <OverflowSection title={t("workspace.nav.favorites")} icon={Star}>
              <ul className="space-y-0.5">
                {favoriteItems.map((item) => (
                  <OverflowNavItem
                    enableFavorites={enableFavorites}
                    isFavorite
                    item={item}
                    key={item.id}
                    onNavigate={() => handleOpenChange(false)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </ul>
            </OverflowSection>
          ) : null}
          {filteredSections.map((section) => (
            <CollapsibleSection
              defaultExpanded={isGroupExpanded(section.key)}
              enableFavorites={enableFavorites}
              isFavorite={isFavorite}
              key={section.key}
              onToggleExpanded={() => onToggleGroupExpanded(section.key)}
              onToggleFavorite={onToggleFavorite}
              onNavigate={() => handleOpenChange(false)}
              section={section}
            />
          ))}
          {filteredSections.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t("workspace.nav.noMatch")}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OverflowSection({
  title,
  icon: Icon,
  children,
}: Readonly<{
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}>) {
  return (
    <section className="mb-2">
      <div className="flex items-center gap-2 px-2 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden className="size-3.5" />
        {title}
      </div>
      {children}
    </section>
  );
}

function CollapsibleSection({
  section,
  defaultExpanded,
  onToggleExpanded,
  onNavigate,
  isFavorite,
  onToggleFavorite,
  enableFavorites,
}: Readonly<{
  section: WorkspaceNavigationSection;
  defaultExpanded: boolean;
  onToggleExpanded: () => void;
  onNavigate: () => void;
  isFavorite: (itemId: string) => boolean;
  onToggleFavorite: (itemId: string) => void;
  enableFavorites: boolean;
}>) {
  const expanded = defaultExpanded;

  return (
    <section className="mb-1">
      <button
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm font-medium transition hover:bg-[hsl(var(--muted))]/70"
        onClick={() => {
          onToggleExpanded();
        }}
        type="button"
      >
        {renderNavigationIcon(section.icon, "size-4 shrink-0 text-muted-foreground")}
        <span className="flex-1">{section.title}</span>
        {expanded ? (
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        )}
      </button>
      {expanded ? (
        <ul className="ms-2 space-y-0.5 border-s ps-2">
          {section.items.map((item) => (
            <OverflowNavItem
              enableFavorites={enableFavorites}
              isFavorite={isFavorite(item.id)}
              item={item}
              key={item.id}
              onNavigate={onNavigate}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OverflowNavItem({
  item,
  isFavorite,
  onToggleFavorite,
  onNavigate,
  enableFavorites,
}: Readonly<{
  item: WorkspaceNavigationItem;
  isFavorite: boolean;
  onToggleFavorite: (itemId: string) => void;
  onNavigate: () => void;
  enableFavorites: boolean;
}>) {
  const { t } = useEnterpriseUi();
  return (
    <li className="group flex items-center gap-1">
      <OverflowLink
        href={item.route}
        isActive={item.isActive}
        label={item.fullTitle ?? item.title}
        onNavigate={onNavigate}
      />
      {item.badge ? <NavigationBadge badge={item.badge} /> : null}
      {enableFavorites ? (
        <button
          aria-label={
            isFavorite
              ? t("workspace.nav.unpin", { title: item.title })
              : t("workspace.nav.pin", { title: item.title })
          }
          className="grid size-8 shrink-0 place-items-center rounded-lg opacity-0 transition hover:bg-[hsl(var(--muted))] group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => onToggleFavorite(item.id)}
          type="button"
        >
          <Star
            aria-hidden
            className={cn("size-3.5", isFavorite && "fill-[hsl(var(--accent))] text-[hsl(var(--accent))]")}
          />
        </button>
      ) : null}
    </li>
  );
}

function OverflowLink({
  href,
  label,
  isActive,
  onNavigate,
}: Readonly<{
  href: string;
  label: string;
  isActive?: boolean;
  onNavigate: () => void;
}>) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-1 items-center rounded-lg px-2 py-2 text-sm transition hover:bg-[hsl(var(--muted))]/70",
        isActive && "bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]",
      )}
      href={href}
      onClick={onNavigate}
    >
      {label}
    </a>
  );
}

function NavigationBadge({ badge }: Readonly<{ badge: WorkspaceNavigationBadge }>) {
  if (badge.count <= 0) {
    return null;
  }

  const variantClassName = {
    approval: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
    draft: "bg-[hsl(var(--muted))] text-foreground",
    error: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
    notification: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
    warning: "bg-[hsl(var(--warning))] text-[hsl(var(--accent-foreground))]",
  }[badge.variant];

  return (
    <span
      aria-label={badge.label ?? `${badge.count} ${badge.variant}`}
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
        variantClassName,
      )}
    >
      {badge.count > 99 ? "99+" : badge.count}
    </span>
  );
}

function MobileNavigation({
  items,
  workspaceName,
  isGroupExpanded,
  onToggleGroupExpanded,
  locale,
}: Readonly<{
  items: readonly WorkspaceNavigationItem[];
  workspaceName: string;
  isGroupExpanded: (groupKey: string, defaultExpanded?: boolean) => boolean;
  onToggleGroupExpanded: (groupKey: string) => void;
  locale: "ar" | "en";
}>) {
  const { t } = useEnterpriseUi();
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => buildNavigationSections(items, [], locale), [items, locale]);
  const activeItem = items.find((item) => item.isActive);

  return (
    <div className="lg:hidden">
      <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
        <DialogPrimitive.Trigger asChild>
          <button
            aria-label={t("workspace.nav.openSections", { name: workspaceName })}
            className="inline-flex h-11 min-w-11 items-center gap-2 rounded-xl border bg-[hsl(var(--surface-glass))] px-2.5 text-xs shadow-sm backdrop-blur"
            type="button"
          >
            <span className="max-w-[9rem] truncate">
              {activeItem?.mobileLabel ?? activeItem?.title ?? t("workspace.nav.sectionsFallback")}
            </span>
            <ChevronDown aria-hidden className="size-4" />
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/40" />
          <DialogPrimitive.Content className="fixed inset-y-0 start-0 z-[var(--z-modal)] flex h-dvh w-[min(22rem,calc(100vw-2rem))] flex-col border-e bg-[hsl(var(--surface))] shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between border-b p-4">
              <DialogPrimitive.Title className="font-semibold">{workspaceName}</DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label={t("workspace.nav.close")}
                className="grid size-11 place-items-center rounded-xl border bg-[hsl(var(--surface-glass))] shadow-sm"
              >
                <X aria-hidden className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {sections.map((section) => (
                <MobileSection
                  defaultExpanded={isGroupExpanded(section.key, section.key === "overview")}
                  key={section.key}
                  onToggleExpanded={() => onToggleGroupExpanded(section.key)}
                  onNavigate={() => setOpen(false)}
                  section={section}
                />
              ))}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function MobileSection({
  section,
  defaultExpanded,
  onToggleExpanded,
  onNavigate,
}: Readonly<{
  section: WorkspaceNavigationSection;
  defaultExpanded: boolean;
  onToggleExpanded: () => void;
  onNavigate: () => void;
}>) {
  const expanded = defaultExpanded;

  return (
    <section className="mb-2 rounded-xl border">
      <button
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center gap-2 px-3 py-3 text-start text-sm font-medium"
        onClick={() => {
          onToggleExpanded();
        }}
        type="button"
      >
        {renderNavigationIcon(section.icon, "size-4 shrink-0 text-muted-foreground")}
        <span className="flex-1">{section.title}</span>
        {expanded ? (
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        )}
      </button>
      {expanded ? (
        <ul className="space-y-0.5 border-t px-2 py-2">
          {section.items.map((item) => (
            <li key={item.id}>
              <a
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition hover:bg-[hsl(var(--muted))]",
                  item.isActive &&
                    "bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]",
                )}
                href={item.route}
                onClick={onNavigate}
              >
                <span className="flex-1">{item.mobileLabel ?? item.title}</span>
                {item.badge ? <NavigationBadge badge={item.badge} /> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}
