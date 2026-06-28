"use client";

import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookPlus,
  Boxes,
  CalendarPlus,
  ClipboardCheck,
  ClipboardPlus,
  Download,
  Factory,
  Files,
  Flag,
  FolderKanban,
  Grid2X2,
  Hammer,
  IdCard,
  Import,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  PackageCheck,
  PackagePlus,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pin,
  PlugZap,
  Repeat,
  ScanBarcode,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
  Users,
  WalletCards,
  Warehouse,
  Workflow,
  Wrench,
  X,
} from "lucide-react";

import type {
  WorkspaceActivity,
  WorkspaceAppModel,
  WorkspaceKpi,
  WorkspaceQuickAction,
  WorkspaceTab,
} from "@/shared/workspace/public-api";
import type { WorkspaceRecentDocument } from "@/shared/workspace/public-api";

import { Button } from "../primitives";
import { cn } from "../utils";

export function WorkspaceHero({
  userName,
  companyName,
  branchName,
  workspaceName,
}: Readonly<{
  userName: string;
  companyName: string;
  branchName: string;
  workspaceName: string;
}>) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[hsl(var(--surface))]/82 shadow-[var(--shadow-lg)] backdrop-blur">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--accent)/0.22),transparent_34%),radial-gradient(circle_at_85%_10%,hsl(var(--success)/0.14),transparent_30%)]" />
      <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <div className="relative bg-gradient-to-br from-white/12 via-transparent to-[hsl(var(--accent))]/10 p-6 md:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border bg-[hsl(var(--surface-glass))] px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles aria-hidden className="size-3.5 text-[hsl(var(--accent))]" />
              Enterprise Home Workspace
            </span>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl xl:text-6xl">
              Welcome back, {userName}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Launch accepted foundations, track workspace progress, reopen recent work, and
              search across platform contracts from one keyboard-first hub.
            </p>
          </div>
          <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
            <WorkspaceContextValue label="Company" value={companyName} />
            <WorkspaceContextValue label="Branch" value={branchName} />
            <WorkspaceContextValue label="Workspace" value={workspaceName} />
            <WorkspaceContextValue
              label="Date and time"
              value={new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(now)}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function WorkspaceContextValue({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border bg-[hsl(var(--surface-glass))] p-4 shadow-sm backdrop-blur">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function WorkspaceSection({
  title,
  description,
  action,
  children,
}: Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProgressKpiCards({ kpis }: Readonly<{ kpis: readonly WorkspaceKpi[] }>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <article
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-[hsl(var(--surface))]/82 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0",
            kpi.tone === "success" && "border-[hsl(var(--success))]/30",
            kpi.tone === "warning" && "border-[hsl(var(--warning))]/40",
            kpi.tone === "accent" && "border-[hsl(var(--accent))]/35",
          )}
          key={kpi.key}
        >
          <div aria-hidden="true" className="absolute end-0 top-0 size-24 rounded-full bg-[hsl(var(--accent))]/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{kpi.value}</p>
            </div>
            <div className="grid size-10 place-items-center rounded-2xl border bg-[hsl(var(--surface-glass))] shadow-sm">
              <Activity aria-hidden className="size-4 text-[hsl(var(--accent))]" />
            </div>
          </div>
          <p className="relative mt-3 text-sm leading-6 text-muted-foreground">{kpi.description}</p>
        </article>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: Readonly<{ status: WorkspaceAppModel["status"] }>) {
  const label = statusToLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]",
        status === "ready" && "border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
        status === "in-development" && "border-[hsl(var(--accent))]/35 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
        status === "beta" && "border-[hsl(var(--warning))]/45 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
        status === "planned" && "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 text-muted-foreground",
        ["disabled", "not-licensed", "not-installed"].includes(status) &&
          "border-[hsl(var(--danger))]/40 text-[hsl(var(--danger))]",
      )}
    >
      {label}
    </span>
  );
}

export function AppCard({
  app,
  onFavorite,
  onPin,
  onHide,
  onOpen,
}: Readonly<{
  app: WorkspaceAppModel;
  onFavorite?: (app: WorkspaceAppModel) => void;
  onPin?: (app: WorkspaceAppModel) => void;
  onHide?: (app: WorkspaceAppModel) => void;
  onOpen?: (app: WorkspaceAppModel) => void;
}>) {
  const canOpen = Boolean(app.href && app.permissionState === "allowed");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border bg-[hsl(var(--surface))]/86 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-[hsl(var(--accent))]/30 hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0">
      <div className={cn("relative overflow-hidden bg-gradient-to-br p-5", app.gradient)}>
        <div aria-hidden="true" className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-14 place-items-center rounded-2xl border bg-[hsl(var(--surface))]/82 shadow-md backdrop-blur">
            {renderWorkspaceIcon(app.icon, "size-6")}
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              active={app.isFavorite}
              label={app.isFavorite ? `Remove ${app.shortName} from favorites` : `Favorite ${app.shortName}`}
              onClick={() => onFavorite?.(app)}
            >
              <Star aria-hidden className="size-4" />
            </IconButton>
            <IconButton
              active={app.isPinned}
              label={app.isPinned ? `Unpin ${app.shortName}` : `Pin ${app.shortName}`}
              onClick={() => onPin?.(app)}
            >
              <Pin aria-hidden className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.02em]">{app.shortName}</h3>
            <StatusBadge status={app.status} />
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{app.description}</p>
        </div>
        <div className="mt-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-[hsl(var(--surface-glass))] px-3 py-2 text-xs text-muted-foreground">
            <span>{app.recentActivityCount} recent items</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {app.permissionState === "restricted" ? <Lock aria-hidden className="size-3" /> : null}
              {app.permissionLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {canOpen ? (
              <a href={app.href} onClick={() => onOpen?.(app)}>
                <Button className="rounded-xl shadow-sm" type="button" variant="primary">
                  Open
                </Button>
              </a>
            ) : (
              <Button className="rounded-xl" disabled type="button" variant="secondary">
                Open
              </Button>
            )}
            {app.docsHref ? (
              <a href={app.docsHref}>
                <Button className="rounded-xl" type="button" variant="secondary">
                  Documentation
                </Button>
              </a>
            ) : null}
            {onHide ? (
              <Button className="rounded-xl" onClick={() => onHide(app)} type="button" variant="ghost">
                Hide
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PlannedAppCard(props: ComponentProps<typeof AppCard>) {
  const { app } = props;

  return (
    <div className="overflow-hidden rounded-[1.7rem] border bg-[hsl(var(--surface))]/86 shadow-sm backdrop-blur">
      <AppCard {...props} />
      <div className="border-t bg-[hsl(var(--surface-elevated))]/55 p-4 text-sm">
        <dl className="grid grid-cols-1 gap-3">
          <div>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phase</dt>
            <dd className="font-medium">{app.phase ?? "Planned phase"}</dd>
          </div>
          <div>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Depends on</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {app.dependencies.length > 0 ? (
                app.dependencies.map((dependency) => (
                  <span className="rounded-full border bg-[hsl(var(--surface))]/65 px-2 py-0.5 text-xs shadow-sm" key={dependency}>
                    {dependency}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">No dependency declared.</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Estimated Release</dt>
            <dd>{app.estimatedRelease ?? "Not scheduled"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function PlatformAppCard(props: ComponentProps<typeof AppCard>) {
  return <AppCard {...props} />;
}

export function RecentAppsRail({
  apps,
  onOpen,
}: Readonly<{
  apps: readonly WorkspaceAppModel[];
  onOpen?: (app: WorkspaceAppModel) => void;
}>) {
  if (apps.length === 0) {
    return (
      <WorkspaceEmptyState
        description="Open Finance, Inventory, Manufacturing, or a platform surface and it will appear here for quick reopen."
        title="No recent apps yet"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {apps.slice(0, 6).map((app) => {
        return (
          <a
            className="rounded-2xl border bg-[hsl(var(--surface))]/82 p-4 shadow-sm backdrop-blur transition hover:border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--muted))]"
            href={app.href ?? "/erp"}
            key={app.key}
            onClick={() => onOpen?.(app)}
          >
            <div className="flex items-center gap-3">
              <div className={cn("grid size-11 place-items-center rounded-2xl bg-gradient-to-br shadow-sm", app.gradient)}>
                {renderWorkspaceIcon(app.icon, "size-5")}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{app.shortName}</p>
                <p className="truncate text-xs text-muted-foreground">Quick reopen</p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function RecentDocumentsPanel({
  documents,
}: Readonly<{ documents: readonly WorkspaceRecentDocument[] }>) {
  if (documents.length === 0) {
    return (
      <WorkspaceEmptyState
        description="Recent documents, production reports, products, journal definitions, reports, and searches will appear here once runtime data exists or you open records."
        label="Runtime data"
        title="No recent documents"
      />
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-[hsl(var(--surface))]/82 shadow-sm backdrop-blur">
      {documents.map((document) => (
        <a
          className="block p-4 transition hover:bg-[hsl(var(--muted))]"
          href={document.href ?? "#"}
          key={document.key}
        >
          <p className="font-medium">{document.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {document.type} {document.sourceLabel ? `- ${document.sourceLabel}` : ""}
          </p>
        </a>
      ))}
    </div>
  );
}

export function QuickActionsGrid({
  actions,
  onAction,
}: Readonly<{
  actions: readonly WorkspaceQuickAction[];
  onAction?: (action: WorkspaceQuickAction) => void;
}>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {actions.map((action) => {
        return (
          <a
            className="group rounded-2xl border bg-[hsl(var(--surface))]/82 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--muted))] hover:shadow-md motion-reduce:hover:translate-y-0"
            href={action.href}
            key={action.key}
            onClick={() => onAction?.(action)}
          >
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border bg-[hsl(var(--surface-glass))] shadow-sm transition group-hover:text-[hsl(var(--accent))]">
                {renderWorkspaceIcon(action.icon, "size-5")}
              </div>
              <div>
                <p className="font-semibold">{action.label}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.description}</p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function ActivityTimeline({ activities }: Readonly<{ activities: readonly WorkspaceActivity[] }>) {
  if (activities.length === 0) {
    return (
      <WorkspaceEmptyState
        description="Created, updated, approved, posted, completed, imported, exported, and notification events will be shown here when runtime activity feeds are connected."
        label="Runtime data"
        title="No recent activity"
      />
    );
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => (
        <li className="rounded-2xl border bg-[hsl(var(--surface))]/82 p-4 shadow-sm backdrop-blur" key={activity.key}>
          <p className="text-sm font-medium">{activity.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
        </li>
      ))}
    </ol>
  );
}

export function WorkspaceTabBar({
  tabs,
  onClose,
}: Readonly<{
  tabs: readonly WorkspaceTab[];
  onClose?: (tab: WorkspaceTab) => void;
}>) {
  return (
    <nav aria-label="Open workspaces" className="overflow-x-auto rounded-2xl border bg-[hsl(var(--surface))]/82 p-2 shadow-sm backdrop-blur">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm",
              tab.isActive
                ? "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 font-medium text-[hsl(var(--accent))]"
                : "bg-[hsl(var(--surface-glass))]",
            )}
            key={tab.key}
          >
            <a aria-current={tab.isActive ? "page" : undefined} href={tab.href}>
              {tab.label}
            </a>
            {tab.isPinned ? <Pin aria-label="Pinned workspace" className="size-3 text-muted-foreground" /> : null}
            {!tab.isPinned && onClose ? (
              <button
                aria-label={`Close ${tab.label}`}
                className="rounded p-0.5 hover:bg-[hsl(var(--muted))]"
                onClick={() => onClose(tab)}
                type="button"
              >
                <X aria-hidden className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </nav>
  );
}

export function WorkspaceEmptyState({
  title,
  description,
  label = "Empty state",
}: Readonly<{
  title: string;
  description: string;
  label?: string;
}>) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed bg-[hsl(var(--surface))]/78 p-6 text-center shadow-sm backdrop-blur">
      <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function WorkspaceErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--danger))]/40 bg-[hsl(var(--surface))]/82 p-6 shadow-sm backdrop-blur">
      <h3 className="font-semibold">Workspace error</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function AppCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl border bg-[hsl(var(--surface))]/82 p-4 shadow-sm backdrop-blur">
      <div className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
      <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="mt-5 h-9 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
    </div>
  );
}

function IconButton({
  active,
  label,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "grid size-8 place-items-center rounded-xl border bg-[hsl(var(--surface))]/80 shadow-sm backdrop-blur transition hover:bg-[hsl(var(--muted))]",
        active && "border-[hsl(var(--accent))] text-[hsl(var(--accent))]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function renderWorkspaceIcon(name: string, className: string) {
  const sharedProps = { "aria-hidden": true, className };

  switch (name) {
    case "activity":
      return <Activity {...sharedProps} />;
    case "badge-dollar-sign":
      return <BadgeDollarSign {...sharedProps} />;
    case "bar-chart-3":
      return <BarChart3 {...sharedProps} />;
    case "bell":
      return <Bell {...sharedProps} />;
    case "book-plus":
      return <BookPlus {...sharedProps} />;
    case "boxes":
      return <Boxes {...sharedProps} />;
    case "calendar-plus":
      return <CalendarPlus {...sharedProps} />;
    case "clipboard-check":
      return <ClipboardCheck {...sharedProps} />;
    case "clipboard-plus":
      return <ClipboardPlus {...sharedProps} />;
    case "download":
      return <Download {...sharedProps} />;
    case "factory":
      return <Factory {...sharedProps} />;
    case "files":
      return <Files {...sharedProps} />;
    case "flag":
      return <Flag {...sharedProps} />;
    case "folder-kanban":
      return <FolderKanban {...sharedProps} />;
    case "hammer":
      return <Hammer {...sharedProps} />;
    case "id-card":
      return <IdCard {...sharedProps} />;
    case "import":
      return <Import {...sharedProps} />;
    case "landmark":
      return <Landmark {...sharedProps} />;
    case "layout-dashboard":
      return <LayoutDashboard {...sharedProps} />;
    case "life-buoy":
      return <LifeBuoy {...sharedProps} />;
    case "package-check":
      return <PackageCheck {...sharedProps} />;
    case "package-plus":
      return <PackagePlus {...sharedProps} />;
    case "panel-left":
      return <PanelLeft {...sharedProps} />;
    case "panel-right":
      return <PanelRight {...sharedProps} />;
    case "panel-top":
      return <PanelTop {...sharedProps} />;
    case "plug-zap":
      return <PlugZap {...sharedProps} />;
    case "repeat":
      return <Repeat {...sharedProps} />;
    case "scan-barcode":
      return <ScanBarcode {...sharedProps} />;
    case "search":
      return <Search {...sharedProps} />;
    case "settings":
      return <Settings {...sharedProps} />;
    case "shield":
      return <Shield {...sharedProps} />;
    case "shield-check":
      return <ShieldCheck {...sharedProps} />;
    case "shopping-cart":
      return <ShoppingCart {...sharedProps} />;
    case "sparkles":
      return <Sparkles {...sharedProps} />;
    case "store":
      return <Store {...sharedProps} />;
    case "truck":
      return <Truck {...sharedProps} />;
    case "users":
      return <Users {...sharedProps} />;
    case "wallet-cards":
      return <WalletCards {...sharedProps} />;
    case "warehouse":
      return <Warehouse {...sharedProps} />;
    case "workflow":
      return <Workflow {...sharedProps} />;
    case "wrench":
      return <Wrench {...sharedProps} />;
    default:
      return <Grid2X2 {...sharedProps} />;
  }
}

function statusToLabel(status: WorkspaceAppModel["status"]): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
