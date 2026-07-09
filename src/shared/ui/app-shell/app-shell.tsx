"use client";

import type { ComponentPropsWithoutRef, ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  Command as CommandIcon,
  Factory,
  Globe2,
  Grid2X2,
  IdCard,
  Landmark,
  LifeBuoy,
  LogOut,
  Menu,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserCircle,
  X,
} from "lucide-react";

import {
  Button,
  CommandPalette,
  DropdownMenu,
  Input,
  useCommandPalette,
  type CommandPaletteItem,
} from "../primitives";
import { Popover, Dialog, Tooltip } from "../layout";
import { useEnterpriseTheme, useEnterpriseUi } from "../providers/enterprise-ui-context";
import { cn, type Direction } from "../utils";
import {
  isSupportedLocale,
  type SupportedLocale,
} from "@/platform/localization/public-api";
import {
  ApplicationLauncher,
  type ApplicationLauncherContext,
} from "./application-launcher";
import {
  WorkspaceNav,
  type WorkspaceIdentity,
  type WorkspaceNavItem,
} from "./workspace-nav";
import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import type { ThemePreference } from "../providers/enterprise-ui-context";

function isLocalePreference(value: string): value is SupportedLocale {
  return isSupportedLocale(value);
}

export type { WorkspaceIdentity, WorkspaceNavItem } from "./workspace-navigation.types";
export { EnterpriseWorkspaceNavigation } from "./enterprise-workspace-navigation";
export type {
  EnterpriseWorkspaceNavigationProps,
  WorkspaceNavigationBadge,
  WorkspaceNavigationGroupKey,
  WorkspaceNavigationItem,
} from "./workspace-navigation.types";

export type NavigationItem = Readonly<{
  key: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  children?: readonly NavigationItem[];
  isActive?: boolean;
  isDisabled?: boolean;
  badge?: string;
}>;

export type NavigationSection = Readonly<{
  key: string;
  label: string;
  items: readonly NavigationItem[];
}>;

export type NavigationGroup = Readonly<{
  key: string;
  label: string;
  items: readonly NavigationItem[];
  /** Icon key resolved against the shell's workspace icon map. */
  iconKey?: string;
  href?: string;
  status?: "ready" | "planned";
  isActive?: boolean;
  /** Optional super-header used to cluster workspaces in the sidebar. */
  category?: string;
  /** Optional sub-sections rendered inside an expanded workspace. */
  sections?: readonly NavigationSection[];
}>;

export type BreadcrumbItem = Readonly<{
  label: string;
  href?: string;
  /** When set, AppShell resolves the visible label via platform localization. */
  messageKey?: import("@/platform/localization/public-api").MessageKey;
}>;

export type SwitcherOption = Readonly<{
  key: string;
  label: string;
  isDisabled?: boolean;
}>;

export type ShellAction = Readonly<{
  label: string;
  value: string;
  isActive?: boolean;
  isDisabled?: boolean;
}>;

export type AppShellUser = Readonly<{
  name: string;
  email?: string | null;
}>;

function isThemePreference(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export type AppLauncherItem = Readonly<{
  key: string;
  label: string;
  href?: string;
  isActive?: boolean;
}>;

export type AppShellLauncher = Readonly<{
  snapshot: AppRegistrySnapshot;
  context: ApplicationLauncherContext;
}>;

export type AppShellProps = Readonly<{
  direction?: Direction;
  /** Workspace-based accordion navigation (Level 1/2). */
  sidebarGroups?: readonly NavigationGroup[];
  breadcrumbs?: readonly BreadcrumbItem[];
  /** Active application identity for the optional horizontal workspace nav. */
  workspace?: WorkspaceIdentity;
  workspaceNav?: readonly WorkspaceNavItem[];
  /** Accent override as an HSL triplet, e.g. "221 83% 53%". */
  accent?: string;
  workspaceOptions?: readonly SwitcherOption[];
  companyOptions?: readonly SwitcherOption[];
  branchOptions?: readonly SwitcherOption[];
  activeWorkspaceKey?: string;
  activeCompanyKey?: string;
  activeBranchKey?: string;
  themeOptions?: readonly ShellAction[];
  languageOptions?: readonly ShellAction[];
  /** Structured application launcher data. When present the Apps button opens it. */
  launcher?: AppShellLauncher;
  /** Simple application launcher entries (used when no structured launcher is given). */
  appLauncherItems?: readonly AppLauncherItem[];
  homeHref?: string;
  commandItems?: readonly CommandPaletteItem[];
  quickActions?: readonly CommandPaletteItem[];
  notifications?: readonly { key: string; title: string; description?: string }[];
  globalSearchSlot?: ReactNode;
  notificationsSlot?: ReactNode;
  userMenu?: ReactNode;
  user?: AppShellUser;
  children: ReactNode;
}>;

const WORKSPACE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  administration: ShieldCheck,
  finance: Landmark,
  fleet: Truck,
  hr: IdCard,
  inventory: Boxes,
  manufacturing: Factory,
  purchasing: ShoppingCart,
  sales: BadgeDollarSign,
  service: LifeBuoy,
};

function NavigationTree({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.key}>
          <a
            aria-current={item.isActive ? "page" : undefined}
            aria-disabled={item.isDisabled}
            className={cn(
              "group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-[hsl(var(--sidebar-text))] transition-colors hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-text-active))] focus-visible:bg-[hsl(var(--sidebar-hover))] focus-visible:text-[hsl(var(--sidebar-text-active))]",
              item.isActive &&
                "bg-[hsl(var(--sidebar-active))] font-medium text-[hsl(var(--sidebar-text-active))] shadow-sm hover:bg-[hsl(var(--sidebar-active))] hover:text-[hsl(var(--sidebar-text-active))]",
              item.isDisabled && "pointer-events-none opacity-50",
            )}
            href={item.href ?? "#"}
          >
            <span className="inline-flex min-w-0 items-center gap-2.5">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            {item.badge ? (
              <span className="rounded-full border border-current/30 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide opacity-70">
                {item.badge}
              </span>
            ) : null}
          </a>
          {item.children && item.children.length > 0 ? (
            <div className="ms-4 mt-1 border-s border-white/10 ps-2">
              <NavigationTree items={item.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SidebarNav({ groups }: Readonly<{ groups: readonly NavigationGroup[] }>) {
  const initialOpenKey = useMemo(() => {
    const active = groups.find((group) => group.isActive);
    if (active) {
      return active.key;
    }
    const firstReady = groups.find((group) => group.status !== "planned");
    return firstReady?.key ?? groups[0]?.key ?? null;
  }, [groups]);
  const [openKey, setOpenKey] = useState<string | null>(initialOpenKey);

  return (
    <nav aria-label="Sidebar navigation" className="space-y-4">
      {groups.map((group, index) => {
        const previous = groups[index - 1];
        const showCategory = group.category && group.category !== previous?.category;
        const Icon = group.iconKey ? WORKSPACE_ICONS[group.iconKey] : undefined;
        const isOpen = openKey === group.key;
        const isPlanned = group.status === "planned";
        const panelId = `sidebar-group-${group.key}`;
        const sections = group.sections ?? [{ items: group.items, key: group.key, label: group.label }];

        return (
          <div className="space-y-2" key={group.key}>
            {showCategory ? (
              <h2 className="px-3 pt-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sidebar-text))]/45">
                {group.category}
              </h2>
            ) : null}
            <div>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[hsl(var(--sidebar-text))] transition-colors hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-text-active))]",
                  group.isActive && "text-[hsl(var(--sidebar-text-active))]",
                )}
                onClick={() => setOpenKey(isOpen ? null : group.key)}
                type="button"
              >
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                <span className="truncate">{group.label}</span>
                {isPlanned ? (
                  <span className="rounded-full border border-current/30 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide opacity-70">
                    Planned
                  </span>
                ) : null}
                <ChevronDown
                  className={cn("ms-auto size-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen ? (
                <div className="mt-1 space-y-3 ps-2" id={panelId}>
                  {sections.map((section) => (
                    <div key={section.key}>
                      {group.sections && section.label !== group.label ? (
                        <p className="mb-1.5 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--sidebar-text))]/45">
                          {section.label}
                        </p>
                      ) : null}
                      <NavigationTree items={section.items} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <span className="block min-w-56">
      <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-sm text-[hsl(var(--foreground))]">{value}</span>
    </span>
  );
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NX";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function TopbarIconButton({
  label,
  tooltip = label,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> &
  Readonly<{
    label: string;
    tooltip?: ReactNode;
  }>) {
  return (
    <Button
      aria-label={label}
      className={cn(
        "size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur",
        className,
      )}
      title={typeof tooltip === "string" ? tooltip : label}
      type="button"
      variant="secondary"
      {...props}
    >
      {children}
    </Button>
  );
}

function ContextSwitcher({
  companyOptions = [],
  branchOptions = [],
  activeCompanyKey,
  activeBranchKey,
}: Readonly<{
  companyOptions?: readonly SwitcherOption[];
  branchOptions?: readonly SwitcherOption[];
  activeCompanyKey?: string;
  activeBranchKey?: string;
}>) {
  const { t } = useEnterpriseUi();
  const activeCompany = companyOptions.find((option) => option.key === activeCompanyKey);
  const activeBranch = branchOptions.find((option) => option.key === activeBranchKey);
  const companyLabel = activeCompany?.label ?? t("shell.context.company");
  const branchLabel = activeBranch?.label ?? t("shell.context.branch");
  const label = `${companyLabel} · ${branchLabel}`;

  return (
    <DropdownMenu
      align="end"
      items={[
        {
          key: "company",
          label: (
            <DetailRow
              label={t("shell.context.company")}
              value={activeCompany?.label ?? t("shell.context.notSelected")}
            />
          ),
        },
        {
          key: "branch",
          label: (
            <DetailRow
              label={t("shell.context.branch")}
              value={activeBranch?.label ?? t("shell.context.notSelected")}
            />
          ),
        },
        {
          disabled: companyOptions.length <= 1,
          key: "switch-company",
          label: t("shell.context.switchCompany"),
        },
        {
          disabled: branchOptions.length <= 1,
          key: "switch-branch",
          label: t("shell.context.switchBranch"),
        },
      ]}
      trigger={
        <Button
          aria-label={t("shell.context.open", { label })}
          className="h-10 max-w-[15rem] justify-start rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] px-2.5 shadow-sm backdrop-blur"
          title={t("shell.context.title", { label })}
          type="button"
          variant="secondary"
        >
          <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="hidden min-w-0 text-start text-xs font-medium md:block">
            <span className="block truncate">{companyLabel}</span>
            <span className="block truncate text-[0.68rem] text-muted-foreground">
              {branchLabel}
            </span>
          </span>
        </Button>
      }
    />
  );
}

function SettingsMenu({
  themeOptions = [],
  languageOptions = [],
}: Readonly<{
  themeOptions?: readonly ShellAction[];
  languageOptions?: readonly ShellAction[];
}>) {
  const activeTheme = themeOptions.find((action) => action.isActive);
  const activeLanguage = languageOptions.find((action) => action.isActive);
  const { setTheme } = useEnterpriseTheme();
  const { setLocale, t } = useEnterpriseUi();

  return (
    <DropdownMenu
      align="end"
      items={[
        {
          key: "theme-heading",
          label: (
            <DetailRow
              label={t("shell.settings.theme")}
              value={activeTheme?.label ?? t("shell.theme.system")}
            />
          ),
        },
        ...themeOptions.map((action) => ({
          disabled: action.isDisabled,
          key: `theme-${action.value}`,
          label: (
            <span className="inline-flex items-center gap-2">
              <Palette aria-hidden className="size-3.5 text-muted-foreground" />
              {action.label}
            </span>
          ),
          onSelect: () => {
            if (isThemePreference(action.value)) {
              setTheme(action.value);
            }
          },
        })),
        {
          key: "language-heading",
          label: (
            <DetailRow
              label={t("shell.settings.language")}
              value={activeLanguage?.label ?? t("shell.settings.default")}
            />
          ),
        },
        ...languageOptions.map((action) => ({
          disabled: action.isDisabled,
          key: `language-${action.value}`,
          label: (
            <span className="inline-flex items-center gap-2">
              <Globe2 aria-hidden className="size-3.5 text-muted-foreground" />
              {action.label}
            </span>
          ),
          onSelect: () => {
            if (isLocalePreference(action.value)) {
              setLocale(action.value);
            }
          },
        })),
        {
          key: "system-mode",
          label: (
            <DetailRow
              label={t("shell.settings.systemMode")}
              value={activeTheme?.label ?? t("shell.theme.system")}
            />
          ),
        },
        {
          key: "density",
          label: (
            <DetailRow
              label={t("shell.settings.density")}
              value={t("shell.settings.density.comfortable")}
            />
          ),
        },
      ]}
      trigger={
        <TopbarIconButton label={t("shell.settings.open")} tooltip={t("shell.settings.tooltip")}>
          <Settings2 aria-hidden className="size-4" />
        </TopbarIconButton>
      }
    />
  );
}

function UserMenuControl({
  user,
  companyName,
  branchName,
}: Readonly<{
  user?: AppShellUser;
  companyName?: string;
  branchName?: string;
}>) {
  const { t } = useEnterpriseUi();
  const displayName = user?.name ?? t("shell.user.fallback");
  const email = user?.email ?? t("shell.user.emailMissing");

  return (
    <DropdownMenu
      align="end"
      items={[
        {
          key: "identity",
          label: (
            <span className="block min-w-60">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
          ),
        },
        {
          key: "company",
          label: (
            <DetailRow
              label={t("shell.context.company")}
              value={companyName ?? t("shell.context.notSelected")}
            />
          ),
        },
        {
          key: "branch",
          label: (
            <DetailRow
              label={t("shell.context.branch")}
              value={branchName ?? t("shell.context.notSelected")}
            />
          ),
        },
        { href: "/erp/profile", key: "profile", label: t("shell.user.profile") },
        { href: "/erp/preferences", key: "preferences", label: t("shell.user.preferences") },
        {
          href: "/logout",
          key: "sign-out",
          label: (
            <span className="inline-flex items-center gap-2">
              <LogOut aria-hidden className="size-3.5 text-muted-foreground" />
              {t("shell.user.signOut")}
            </span>
          ),
        },
      ]}
      trigger={
        <Button
          aria-label={t("shell.user.menuOpen", { name: displayName })}
          className="h-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] px-1.5 pe-2 shadow-sm backdrop-blur"
          title={displayName}
          type="button"
          variant="secondary"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))]/12 text-xs font-semibold text-[hsl(var(--accent))]">
            {displayName ? initialsForName(displayName) : <UserCircle aria-hidden className="size-4" />}
          </span>
          <span className="hidden max-w-28 truncate text-xs font-medium 2xl:inline">{displayName}</span>
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
        </Button>
      }
    />
  );
}

export function AppShell({
  direction: directionProp,
  sidebarGroups = [],
  breadcrumbs = [],
  workspace,
  workspaceNav = [],
  accent,
  companyOptions,
  branchOptions,
  activeCompanyKey,
  activeBranchKey,
  themeOptions,
  languageOptions,
  launcher,
  appLauncherItems = [],
  homeHref = "/erp",
  commandItems = [],
  quickActions = [],
  notifications = [],
  globalSearchSlot,
  notificationsSlot,
  user,
  children,
}: AppShellProps) {
  const { direction: uiDirection, locale, t, theme } = useEnterpriseUi();
  const direction = directionProp ?? uiDirection;
  const commandPalette = useCommandPalette();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const paletteItems = [...commandItems, ...quickActions];
  const rootStyle = accent ? ({ "--accent": accent } as CSSProperties) : undefined;
  const showWorkspaceNav = Boolean(workspace && workspaceNav.length > 0);
  const hasSidebar = sidebarGroups.length > 0;
  const resolvedThemeOptions = useMemo(() => {
    const base =
      themeOptions && themeOptions.length > 0
        ? themeOptions
        : ([
            { label: t("shell.theme.system"), value: "system" },
            { label: t("shell.theme.light"), value: "light" },
            { label: t("shell.theme.dark"), value: "dark" },
          ] as const);
    return base.map((action) => ({
      ...action,
      isActive: action.value === theme,
      label:
        action.value === "system"
          ? t("shell.theme.system")
          : action.value === "light"
            ? t("shell.theme.light")
            : action.value === "dark"
              ? t("shell.theme.dark")
              : action.label,
    }));
  }, [t, theme, themeOptions]);
  const resolvedLanguageOptions = useMemo(() => {
    const base =
      languageOptions && languageOptions.length > 0
        ? languageOptions
        : ([
            { label: t("shell.language.en"), value: "en" },
            { label: t("shell.language.ar"), value: "ar" },
          ] as const);
    return base.map((action) => ({
      ...action,
      isActive: action.value === locale,
      label:
        action.value === "en"
          ? t("shell.language.en")
          : action.value === "ar"
            ? t("shell.language.ar")
            : action.label,
    }));
  }, [languageOptions, locale, t]);

  useEffect(() => {
    function handleGlobalSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    }

    document.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => document.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  const brand = (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-[hsl(var(--sidebar-active))] shadow-sm">
          <Sparkles aria-hidden className="size-5 text-[hsl(var(--sidebar-text-active))]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-[hsl(var(--sidebar-text-active))]">Nexora</p>
          <p className="truncate text-xs text-[hsl(var(--sidebar-text))]/70">{t("shell.brand.subtitle")}</p>
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      {brand}
      <SidebarNav groups={sidebarGroups} />
    </>
  );

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-[hsl(var(--shell-background))] text-[hsl(var(--foreground))]"
      dir={direction}
      style={rootStyle}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 start-1/4 size-[32rem] rounded-full bg-[hsl(var(--accent))]/10 blur-3xl" />
        <div className="absolute end-0 top-1/3 size-[28rem] rounded-full bg-[hsl(var(--success))]/10 blur-3xl" />
      </div>
      <div
        className={cn(
          "relative grid h-full min-h-0",
          hasSidebar && "lg:grid-cols-[18.5rem_minmax(0,1fr)]",
        )}
      >
        {hasSidebar ? (
          <aside className="hidden min-h-0 overflow-y-auto border-e border-white/10 bg-[hsl(var(--shell-sidebar))] p-5 text-[hsl(var(--sidebar-text))] shadow-[var(--shadow-lg)] lg:block">
            {sidebar}
          </aside>
        ) : null}

        {hasSidebar && mobileNavOpen ? (
          <div className="fixed inset-0 z-[var(--z-modal)] lg:hidden">
            <button
              aria-label={t("shell.nav.close")}
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            />
            <aside className="absolute inset-y-0 start-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto border-e border-white/10 bg-[hsl(var(--shell-sidebar))] p-5 text-[hsl(var(--sidebar-text))] shadow-[var(--shadow-lg)]">
              <div className="mb-3 flex justify-end">
                <button
                  aria-label={t("shell.nav.close")}
                  className="grid size-9 place-items-center rounded-xl border border-white/15 bg-white/5"
                  onClick={() => setMobileNavOpen(false)}
                  type="button"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="sticky top-0 z-[50] shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--shell-topbar))] shadow-sm">
            <div className="flex h-14 min-w-0 items-center gap-2 px-4 lg:px-6">
              {hasSidebar ? (
                <Button
                  aria-label={t("shell.nav.open")}
                  className="size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                  variant="secondary"
                >
                  <Menu aria-hidden className="size-4" />
                </Button>
              ) : null}

              <a
                aria-label={t("shell.nav.home")}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1"
                href={homeHref}
              >
                <span className="grid size-8 place-items-center rounded-xl border border-white/20 bg-[hsl(var(--accent))] shadow-sm">
                  <Sparkles aria-hidden className="size-5 text-[hsl(var(--accent-foreground))]" />
                </span>
                <span className="hidden text-sm font-semibold tracking-tight sm:inline">Nexora</span>
              </a>

              {launcher ? (
                <ApplicationLauncher context={launcher.context} snapshot={launcher.snapshot} />
              ) : appLauncherItems.length > 0 ? (
                <DropdownMenu
                  items={appLauncherItems.map((item) => ({
                    href: item.href,
                    key: item.key,
                    label: item.label,
                  }))}
                  trigger={
                    <Button
                      aria-label={t("shell.apps.open")}
                      className="size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur"
                      title={t("shell.apps.label")}
                      type="button"
                      variant="secondary"
                    >
                      <Grid2X2 aria-hidden className="size-4" />
                    </Button>
                  }
                />
              ) : (
                <Tooltip content={t("shell.apps.label")}>
                  <a
                    aria-label={t("shell.apps.open")}
                    className="inline-grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] shadow-sm backdrop-blur transition hover:bg-[hsl(var(--muted))]"
                    href={homeHref}
                  >
                    <Grid2X2 aria-hidden className="size-4" />
                  </a>
                </Tooltip>
              )}

              <Button
                className="h-10 min-w-0 flex-1 justify-start rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface))]/85 px-3 text-muted-foreground shadow-sm backdrop-blur md:min-w-[18rem] xl:max-w-[34rem]"
                onClick={() => setGlobalSearchOpen(true)}
                type="button"
                variant="secondary"
              >
                <Search aria-hidden className="size-4" />
                <span className="min-w-0 flex-1 truncate text-start">{t("shell.search.placeholder")}</span>
                <span className="hidden rounded-md border bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[0.65rem] text-muted-foreground md:inline">
                  Ctrl K
                </span>
              </Button>

              <TopbarIconButton
                label={t("shell.command.open")}
                onClick={() => commandPalette.setOpen(true)}
              >
                <CommandIcon aria-hidden className="size-4" />
              </TopbarIconButton>

              <Popover
                align="end"
                trigger={
                  <TopbarIconButton
                    label={t("shell.notifications.open")}
                    tooltip={t("shell.notifications.title")}
                  >
                    <Bell aria-hidden className="size-4" />
                  </TopbarIconButton>
                }
              >
                {notificationsSlot ?? (
                  <div className="space-y-3">
                    <h3 className="font-medium">{t("shell.notifications.title")}</h3>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div className="rounded-md border p-3" key={notification.key}>
                          <p className="text-sm font-medium">{notification.title}</p>
                          {notification.description ? (
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("shell.notifications.empty")}</p>
                    )}
                  </div>
                )}
              </Popover>

              <div className="ms-auto flex shrink-0 items-center gap-1.5">
                <ContextSwitcher
                  activeBranchKey={activeBranchKey}
                  activeCompanyKey={activeCompanyKey}
                  branchOptions={branchOptions}
                  companyOptions={companyOptions}
                />
                <SettingsMenu
                  languageOptions={resolvedLanguageOptions}
                  themeOptions={resolvedThemeOptions}
                />
                <UserMenuControl
                  branchName={branchOptions?.find((option) => option.key === activeBranchKey)?.label}
                  companyName={companyOptions?.find((option) => option.key === activeCompanyKey)?.label}
                  user={user}
                />
              </div>
            </div>
          </header>

          {breadcrumbs.length > 0 ? (
            <nav aria-label={t("shell.breadcrumb")} className="sr-only">
              <ol>
                {breadcrumbs.map((item, index) => {
                  const label = item.messageKey ? t(item.messageKey) : item.label;
                  return (
                    <li key={`${item.label}-${index}`}>
                      {item.href ? <a href={item.href}>{label}</a> : <span>{label}</span>}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : null}

          {showWorkspaceNav && workspace ? (
            <div className="shrink-0">
              <WorkspaceNav items={workspaceNav} workspace={workspace} />
            </div>
          ) : null}

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
      <Dialog onOpenChange={setGlobalSearchOpen} open={globalSearchOpen} title={t("shell.search.dialogTitle")}>
        {globalSearchSlot ?? (
          <div className="space-y-3">
            <Input autoFocus placeholder={t("shell.search.dialogPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("shell.search.dialogHint")}</p>
          </div>
        )}
      </Dialog>
      <CommandPalette
        enableShortcut={false}
        items={paletteItems}
        onOpenChange={commandPalette.setOpen}
        open={commandPalette.open}
      />
    </div>
  );
}
