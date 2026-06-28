"use client";

import type { ComponentPropsWithoutRef, ComponentType, CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
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
import { Popover, Tooltip } from "../layout";
import { useEnterpriseTheme } from "../providers";
import { cn, type Direction } from "../utils";
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
import type { ThemePreference } from "../providers";

export type { WorkspaceIdentity, WorkspaceNavItem } from "./workspace-nav";

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
  const activeCompany = companyOptions.find((option) => option.key === activeCompanyKey);
  const activeBranch = branchOptions.find((option) => option.key === activeBranchKey);
  const label = `${activeCompany?.label ?? "Company"} · ${activeBranch?.label ?? "Branch"}`;

  return (
    <DropdownMenu
      align="end"
      items={[
        {
          key: "company",
          label: <DetailRow label="Company" value={activeCompany?.label ?? "Not selected"} />,
        },
        {
          key: "branch",
          label: <DetailRow label="Branch" value={activeBranch?.label ?? "Not selected"} />,
        },
        {
          disabled: companyOptions.length <= 1,
          key: "switch-company",
          label: "Switch company",
        },
        {
          disabled: branchOptions.length <= 1,
          key: "switch-branch",
          label: "Switch branch",
        },
      ]}
      trigger={
        <Button
          aria-label={`Open context switcher. ${label}`}
          className="h-10 max-w-[15rem] justify-start rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] px-2.5 shadow-sm backdrop-blur"
          title={`Context: ${label}`}
          type="button"
          variant="secondary"
        >
          <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="hidden min-w-0 text-start text-xs font-medium md:block">
            <span className="block truncate">{activeCompany?.label ?? "Company"}</span>
            <span className="block truncate text-[0.68rem] text-muted-foreground">
              {activeBranch?.label ?? "Branch"}
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

  return (
    <DropdownMenu
      align="end"
      items={[
        {
          key: "theme-heading",
          label: <DetailRow label="Theme" value={activeTheme?.label ?? "System"} />,
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
          label: <DetailRow label="Language" value={activeLanguage?.label ?? "Default"} />,
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
        })),
        {
          key: "system-mode",
          label: <DetailRow label="System mode" value={activeTheme?.label ?? "System"} />,
        },
        {
          key: "density",
          label: <DetailRow label="Display density" value="Comfortable" />,
        },
      ]}
      trigger={
        <TopbarIconButton label="Open display and language settings" tooltip="Settings">
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
  const displayName = user?.name ?? "User";
  const email = user?.email ?? "Email not configured";

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
          label: <DetailRow label="Company" value={companyName ?? "Not selected"} />,
        },
        {
          key: "branch",
          label: <DetailRow label="Branch" value={branchName ?? "Not selected"} />,
        },
        { href: "/erp/profile", key: "profile", label: "Profile" },
        { href: "/erp/preferences", key: "preferences", label: "Preferences" },
        {
          href: "/logout",
          key: "sign-out",
          label: (
            <span className="inline-flex items-center gap-2">
              <LogOut aria-hidden className="size-3.5 text-muted-foreground" />
              Sign out
            </span>
          ),
        },
      ]}
      trigger={
        <Button
          aria-label={`Open user menu for ${displayName}`}
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
  direction = "ltr",
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
  const commandPalette = useCommandPalette();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const paletteItems = [...commandItems, ...quickActions];
  const rootStyle = accent ? ({ "--accent": accent } as CSSProperties) : undefined;
  const showWorkspaceNav = Boolean(workspace && workspaceNav.length > 0);
  const hasSidebar = sidebarGroups.length > 0;

  const brand = (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-[hsl(var(--sidebar-active))] shadow-sm">
          <Sparkles aria-hidden className="size-5 text-[hsl(var(--sidebar-text-active))]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-[hsl(var(--sidebar-text-active))]">Nexora</p>
          <p className="truncate text-xs text-[hsl(var(--sidebar-text))]/70">Enterprise ERP workspace</p>
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
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileNavOpen(false)}
              type="button"
            />
            <aside className="absolute inset-y-0 start-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto border-e border-white/10 bg-[hsl(var(--shell-sidebar))] p-5 text-[hsl(var(--sidebar-text))] shadow-[var(--shadow-lg)]">
              <div className="mb-3 flex justify-end">
                <button
                  aria-label="Close navigation"
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
          <header className="sticky top-0 z-[50] shrink-0 border-b border-white/10 bg-[hsl(var(--shell-topbar))]/88 backdrop-blur-xl">
            <div className="flex h-14 min-w-0 items-center gap-2 px-4 lg:px-6">
              {hasSidebar ? (
                <Button
                  aria-label="Open navigation"
                  className="size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                  variant="secondary"
                >
                  <Menu aria-hidden className="size-4" />
                </Button>
              ) : null}

              <a
                aria-label="Nexora home"
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
                      aria-label="Open applications"
                      className="size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur"
                      title="Apps"
                      type="button"
                      variant="secondary"
                    >
                      <Grid2X2 aria-hidden className="size-4" />
                    </Button>
                  }
                />
              ) : (
                <Tooltip content="Apps">
                  <a
                    aria-label="Open applications"
                    className="inline-grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] shadow-sm backdrop-blur transition hover:bg-[hsl(var(--muted))]"
                    href={homeHref}
                  >
                    <Grid2X2 aria-hidden className="size-4" />
                  </a>
                </Tooltip>
              )}

              <Popover
                trigger={
                  <Button className="h-10 min-w-0 flex-1 justify-start rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface))]/85 px-3 text-muted-foreground shadow-sm backdrop-blur md:min-w-[18rem] xl:max-w-[34rem]" type="button" variant="secondary">
                    <Search aria-hidden className="size-4" />
                    <span className="min-w-0 flex-1 truncate text-start">Search apps, commands, records...</span>
                    <span className="hidden rounded-md border bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[0.65rem] text-muted-foreground md:inline">
                      Ctrl K
                    </span>
                  </Button>
                }
              >
                {globalSearchSlot ?? (
                  <div className="space-y-3">
                    <Input placeholder="Search apps, pages, and records..." />
                    <p className="text-xs text-muted-foreground">
                      Search providers are filtered by tenant, company, branch, and permissions.
                    </p>
                  </div>
                )}
              </Popover>

              <TopbarIconButton
                label="Open command palette"
                onClick={() => commandPalette.setOpen(true)}
              >
                <CommandIcon aria-hidden className="size-4" />
              </TopbarIconButton>

              <Popover
                trigger={
                  <TopbarIconButton label="Open notifications" tooltip="Notifications">
                    <Bell aria-hidden className="size-4" />
                  </TopbarIconButton>
                }
              >
                {notificationsSlot ?? (
                  <div className="space-y-3">
                    <h3 className="font-medium">Notifications</h3>
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
                      <p className="text-sm text-muted-foreground">No notifications.</p>
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
                <SettingsMenu languageOptions={languageOptions} themeOptions={themeOptions} />
                <UserMenuControl
                  branchName={branchOptions?.find((option) => option.key === activeBranchKey)?.label}
                  companyName={companyOptions?.find((option) => option.key === activeCompanyKey)?.label}
                  user={user}
                />
              </div>
            </div>
          </header>

          {breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="sr-only">
              <ol>
                {breadcrumbs.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
                  </li>
                ))}
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
      <CommandPalette
        items={paletteItems}
        onOpenChange={commandPalette.setOpen}
        open={commandPalette.open}
      />
    </div>
  );
}
