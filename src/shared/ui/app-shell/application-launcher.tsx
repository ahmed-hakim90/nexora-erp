"use client";

import { useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Grid2X2, Search, Sparkles, X } from "lucide-react";

import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import {
  WORKSPACE_APP_CATALOG,
  buildHomeWorkspace,
  useWorkspacePreferences,
  type WorkspaceAppModel,
} from "@/shared/workspace/public-api";

import { Button, Input } from "../primitives";
import {
  AppCard,
  PlannedAppCard,
  PlatformAppCard,
  RecentAppsRail,
  WorkspaceEmptyState,
} from "../workspace";
import { cn } from "../utils";

export type ApplicationLauncherContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  permissions: readonly string[];
}>;

export type ApplicationLauncherProps = Readonly<{
  snapshot: AppRegistrySnapshot;
  context: ApplicationLauncherContext;
  triggerClassName?: string;
  triggerLabel?: string;
}>;

export function ApplicationLauncher({
  snapshot,
  context,
  triggerClassName,
  triggerLabel = "Apps",
}: ApplicationLauncherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [preferences, preferenceActions] = useWorkspacePreferences();

  const registryContext = useMemo(
    () => ({
      branchId: context.branchId ?? null,
      companyId: context.companyId ?? null,
      enabledFeatureFlags: new Set<string>(),
      experience: "erp" as const,
      grantedPermissions: new Set(context.permissions as readonly PermissionKey[]),
      tenantId: context.tenantId,
    }),
    [context.branchId, context.companyId, context.permissions, context.tenantId],
  );

  const workspace = useMemo(
    () =>
      buildHomeWorkspace({
        activePath: "/erp",
        catalog: WORKSPACE_APP_CATALOG,
        context: registryContext,
        preferences,
        snapshot,
      }),
    [preferences, registryContext, snapshot],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const matches = (app: WorkspaceAppModel) =>
    normalizedQuery.length === 0
    || app.name.toLowerCase().includes(normalizedQuery)
    || app.shortName.toLowerCase().includes(normalizedQuery)
    || app.category.toLowerCase().includes(normalizedQuery)
    || app.description.toLowerCase().includes(normalizedQuery);

  const favoriteApps = workspace.favoriteApps.filter(matches);
  const recentApps = workspace.recentApps.filter(matches);
  const businessApps = workspace.readyBusinessApps.filter(matches);
  const platformApps = workspace.platformApps.filter(matches);
  const plannedApps = workspace.plannedBusinessApps.filter(matches);
  const hasResults =
    favoriteApps.length > 0
    || recentApps.length > 0
    || businessApps.length > 0
    || platformApps.length > 0
    || plannedApps.length > 0;

  function openApp(app: WorkspaceAppModel) {
    preferenceActions.recordAppOpen({
      appKey: app.key,
      href: app.href,
      label: app.shortName,
    });
    setOpen(false);
  }

  const cardHandlers = {
    onFavorite: (item: WorkspaceAppModel) => preferenceActions.toggleFavorite(item.key),
    onHide: (item: WorkspaceAppModel) => preferenceActions.hide(item.key),
    onOpen: openApp,
    onPin: (item: WorkspaceAppModel) => preferenceActions.togglePin(item.key),
  };

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>
        <Button
          aria-label="Open application launcher"
          className={cn(
            "size-10 rounded-xl border-[hsl(var(--border))]/70 bg-[hsl(var(--surface-glass))] p-0 shadow-sm backdrop-blur",
            triggerClassName,
          )}
          title={triggerLabel}
          type="button"
          variant="secondary"
        >
          <Grid2X2 aria-hidden className="size-4" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--background))]/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[90dvh] w-[min(78rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border bg-[hsl(var(--surface))]/95 shadow-[var(--shadow-lg)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-[hsl(var(--accent))]/10 via-transparent to-transparent p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl border bg-[hsl(var(--surface-glass))] shadow-sm">
                <Sparkles aria-hidden className="size-5 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                  Application Launcher
                </DialogPrimitive.Title>
                <p className="text-sm text-muted-foreground">
                  Switch between every business and platform application.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search aria-hidden className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search applications"
                  autoFocus
                  className="w-full ps-9 md:w-80"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search applications..."
                  value={query}
                />
              </div>
              <DialogPrimitive.Close
                aria-label="Close launcher"
                className="grid size-10 shrink-0 place-items-center rounded-xl border bg-[hsl(var(--surface-glass))] shadow-sm transition hover:bg-[hsl(var(--muted))]"
              >
                <X aria-hidden className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5 md:p-6">
            {favoriteApps.length > 0 ? (
              <LauncherSection title="Favorites">
                <CardGrid>
                  {favoriteApps.map((app) => (
                    <AppCard app={app} key={app.key} {...cardHandlers} />
                  ))}
                </CardGrid>
              </LauncherSection>
            ) : null}

            {recentApps.length > 0 ? (
              <LauncherSection title="Recent Apps">
                <RecentAppsRail apps={recentApps} onOpen={openApp} />
              </LauncherSection>
            ) : null}

            {businessApps.length > 0 ? (
              <LauncherSection title="Business Applications">
                <CardGrid>
                  {businessApps.map((app) => (
                    <AppCard app={app} key={app.key} {...cardHandlers} />
                  ))}
                </CardGrid>
              </LauncherSection>
            ) : null}

            {platformApps.length > 0 ? (
              <LauncherSection title="Platform Applications">
                <CardGrid>
                  {platformApps.map((app) => (
                    <PlatformAppCard app={app} key={app.key} {...cardHandlers} />
                  ))}
                </CardGrid>
              </LauncherSection>
            ) : null}

            {plannedApps.length > 0 ? (
              <LauncherSection title="Planned Applications">
                <CardGrid>
                  {plannedApps.map((app) => (
                    <PlannedAppCard app={app} key={app.key} {...cardHandlers} />
                  ))}
                </CardGrid>
              </LauncherSection>
            ) : null}

            {!hasResults ? (
              <WorkspaceEmptyState
                description={`No applications match "${query}". Try a different name, category, or clear the search.`}
                label="Launcher"
                title="No matching applications"
              />
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LauncherSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="space-y-3">
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CardGrid({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
}
