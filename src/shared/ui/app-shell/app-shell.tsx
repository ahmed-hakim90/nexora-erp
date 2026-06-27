import type { ReactNode } from "react";

import { cn, type Direction } from "../utils";

export type NavigationItem = Readonly<{
  key: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  children?: readonly NavigationItem[];
  isActive?: boolean;
  isDisabled?: boolean;
}>;

export type NavigationGroup = Readonly<{
  key: string;
  label: string;
  items: readonly NavigationItem[];
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

export type AppShellProps = Readonly<{
  direction?: Direction;
  sidebarGroups: readonly NavigationGroup[];
  breadcrumbs?: readonly BreadcrumbItem[];
  workspaceOptions?: readonly SwitcherOption[];
  companyOptions?: readonly SwitcherOption[];
  branchOptions?: readonly SwitcherOption[];
  activeWorkspaceKey?: string;
  activeCompanyKey?: string;
  activeBranchKey?: string;
  themeOptions?: readonly ShellAction[];
  languageOptions?: readonly ShellAction[];
  userMenu?: ReactNode;
  children: ReactNode;
}>;

function NavigationTree({ items }: Readonly<{ items: readonly NavigationItem[] }>) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.key}>
          <a
            aria-current={item.isActive ? "page" : undefined}
            aria-disabled={item.isDisabled}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--muted))] focus-visible:bg-[hsl(var(--muted))]",
              item.isActive && "bg-[hsl(var(--muted))] font-medium",
              item.isDisabled && "pointer-events-none opacity-50",
            )}
            href={item.href ?? "#"}
          >
            <span className="inline-flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </a>
          {item.children && item.children.length > 0 ? (
            <div className="ms-4 mt-1 border-s ps-2">
              <NavigationTree items={item.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Switcher({
  label,
  options = [],
  activeKey,
}: Readonly<{
  label: string;
  options?: readonly SwitcherOption[];
  activeKey?: string;
}>) {
  const activeOption = options.find((option) => option.key === activeKey);

  return (
    <button
      aria-label={`${label}: ${activeOption?.label ?? "not selected"}`}
      className="min-w-36 rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-start text-sm transition-colors hover:bg-[hsl(var(--muted))]"
      disabled={options.length === 0}
      type="button"
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span>{activeOption?.label ?? "Not selected"}</span>
    </button>
  );
}

function ActionSwitcher({
  label,
  actions = [],
}: Readonly<{
  label: string;
  actions?: readonly ShellAction[];
}>) {
  const activeAction = actions.find((action) => action.isActive);

  return (
    <button
      aria-label={`${label}: ${activeAction?.label ?? "not selected"}`}
      className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--muted))]"
      disabled={actions.length === 0 || activeAction?.isDisabled}
      type="button"
    >
      {activeAction?.label ?? label}
    </button>
  );
}

export function AppShell({
  direction = "ltr",
  sidebarGroups,
  breadcrumbs = [],
  workspaceOptions,
  companyOptions,
  branchOptions,
  activeWorkspaceKey,
  activeCompanyKey,
  activeBranchKey,
  themeOptions,
  languageOptions,
  userMenu,
  children,
}: AppShellProps) {
  const sidebar = (
    <>
      <div className="mb-6">
        <p className="text-sm font-semibold">Nexora</p>
        <p className="text-xs text-muted-foreground">Enterprise shell</p>
      </div>
      <nav aria-label="Sidebar navigation" className="space-y-6">
        {sidebarGroups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
              {group.label}
            </h2>
            <NavigationTree items={group.items} />
          </section>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]" dir={direction}>
      <div className="grid min-h-screen lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-e bg-[hsl(var(--surface-elevated))] p-4 lg:block">
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-[var(--z-sticky)] border-b bg-[hsl(var(--background))]">
            <div className="flex flex-wrap items-center gap-3 p-3">
              <details className="lg:hidden">
                <summary className="cursor-pointer rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm">
                  Menu
                </summary>
                <div className="absolute inset-x-3 top-14 z-[var(--z-dropdown)] max-h-[calc(100vh-5rem)] overflow-auto rounded-md border bg-[hsl(var(--surface-elevated))] p-4 shadow-md">
                  {sidebar}
                </div>
              </details>
              <Switcher
                activeKey={activeWorkspaceKey}
                label="Workspace"
                options={workspaceOptions}
              />
              <Switcher
                activeKey={activeCompanyKey}
                label="Company"
                options={companyOptions}
              />
              <Switcher
                activeKey={activeBranchKey}
                label="Branch"
                options={branchOptions}
              />
              <div className="min-w-[14rem] flex-1 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                Global search placeholder
              </div>
              <button aria-label="Open command palette" className="rounded-md border px-3 py-2 text-sm" type="button">
                Command
              </button>
              <button aria-label="Open notifications" className="rounded-md border px-3 py-2 text-sm" type="button">
                Notifications
              </button>
              <ActionSwitcher actions={themeOptions} label="Theme" />
              <ActionSwitcher actions={languageOptions} label="Language" />
              <div className="ms-auto">{userMenu ?? "User menu"}</div>
            </div>
            {breadcrumbs.length > 0 ? (
              <nav aria-label="Breadcrumb" className="border-t px-4 py-2 text-sm">
                <ol className="flex flex-wrap items-center gap-2">
                  {breadcrumbs.map((item, index) => (
                    <li className="inline-flex items-center gap-2" key={`${item.label}-${index}`}>
                      {index > 0 ? <span aria-hidden="true">/</span> : null}
                      {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </header>
          <main className="min-w-0 flex-1 p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
