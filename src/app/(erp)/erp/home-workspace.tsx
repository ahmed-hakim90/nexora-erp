"use client";

import { useMemo } from "react";

import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import type { CommandDefinition, NavigationContribution } from "@/platform/navigation/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import {
  AppCard,
  AppShell,
  ActivityTimeline,
  PageContainer,
  PlannedAppCard,
  PlatformAppCard,
  ProgressKpiCards,
  QuickActionsGrid,
  RecentAppsRail,
  RecentDocumentsPanel,
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspaceSection,
  WorkspaceTabBar,
  useEnterpriseUi,
  type CommandPaletteItem,
} from "@/shared/ui";
import {
  WORKSPACE_APP_CATALOG,
  buildHomeWorkspace,
  useWorkspacePreferences,
  type HomeWorkspaceModel,
  type WorkspaceAppModel,
} from "@/shared/workspace/public-api";

import { GlobalSearchPanel } from "./global-search-panel";

export function EnterpriseHomeWorkspace({
  snapshot,
  commands,
  navigation,
  shell,
  context,
}: Readonly<{
  snapshot: AppRegistrySnapshot;
  commands: readonly CommandDefinition[];
  navigation: readonly NavigationContribution[];
  shell: {
    appLauncherItems: readonly { key: string; label: string; href?: string; isActive?: boolean }[];
    commandItems: readonly CommandPaletteItem[];
    quickActions: readonly CommandPaletteItem[];
  };
  context: {
    tenantId: string;
    companyId: string;
    companyName: string;
    branchId: string;
    branchName: string;
    workspaceName: string;
    userName: string;
    permissions: readonly string[];
  };
}>) {
  const enterpriseUi = useEnterpriseUi();
  const [preferences, preferenceActions] = useWorkspacePreferences();
  const registryContext = useMemo(
    () => ({
      branchId: context.branchId,
      companyId: context.companyId,
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
  const commandItems = useMemo(
    () => createWorkspaceCommandItems(shell.commandItems, workspace),
    [shell.commandItems, workspace],
  );

  function openApp(app: WorkspaceAppModel) {
    preferenceActions.recordAppOpen({
      appKey: app.key,
      href: app.href,
      label: app.shortName,
    });
  }

  return (
    <AppShell
      activeBranchKey={context.branchId}
      activeCompanyKey={context.companyId}
      branchOptions={[{ key: context.branchId, label: context.branchName }]}
      breadcrumbs={[{ label: "Apps" }]}
      commandItems={commandItems}
      companyOptions={[{ key: context.companyId, label: context.companyName }]}
      direction={enterpriseUi.direction}
      launcher={{
        context: {
          branchId: context.branchId,
          companyId: context.companyId,
          permissions: context.permissions,
          tenantId: context.tenantId,
        },
        snapshot,
      }}
      globalSearchSlot={
        <GlobalSearchPanel
          apps={workspace.allApps}
          commands={commands}
          context={context}
          navigation={navigation}
        />
      }
      languageOptions={[
        { label: "English", value: "en", isActive: enterpriseUi.locale === "en" },
        { label: "Arabic", value: "ar", isActive: enterpriseUi.locale === "ar" },
      ]}
      notificationsSlot={
        <WorkspaceEmptyState
          description="The Notification Engine contracts are present. The in-app inbox runtime is not connected yet, so no production notifications are shown."
          label="Runtime data"
          title="No notifications"
        />
      }
      quickActions={shell.quickActions}
      themeOptions={[
        { label: "System", value: "system", isActive: true },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ]}
      user={{ name: context.userName }}
    >
      <PageContainer>
        <div className="mx-auto max-w-[104rem] space-y-10">
          <WorkspaceHero
            branchName={context.branchName}
            companyName={context.companyName}
            userName={context.userName}
            workspaceName={context.workspaceName}
          />

          <ProgressKpiCards kpis={workspace.progressKpis} />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(24rem,0.7fr)]">
            <div className="space-y-5">
              <WorkspaceSection
                description="Lightweight deep-link workspaces. Content remains route-owned until a full workspace runtime is approved."
                title="Workspace Cockpit"
              >
                <WorkspaceTabBar
                  onClose={(tab) => preferenceActions.closeWorkspace(tab.key)}
                  tabs={workspace.openTabs}
                />
              </WorkspaceSection>

              <WorkspaceSection
                description="Create and navigate using accepted foundation routes and platform surfaces."
                title="Quick Actions"
              >
                <QuickActionsGrid
                  actions={workspace.quickActions}
                  onAction={(action) => {
                    if (action.appKey) {
                      preferenceActions.recordAppOpen({
                        appKey: action.appKey,
                        href: action.href,
                        label: action.label,
                      });
                    }
                  }}
                />
              </WorkspaceSection>
            </div>

            <div className="space-y-5">
              <WorkspaceSection
                description="Quick reopen, favorites, and pinned apps are stored locally in this browser."
                title="Your Work"
              >
                <div className="space-y-4">
                  <RecentAppsRail apps={workspace.recentApps} onOpen={openApp} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <MiniAppList
                      apps={workspace.favoriteApps}
                      empty="Favorite apps to keep them here."
                      onOpen={openApp}
                      title="Favorites"
                    />
                    <MiniAppList
                      apps={workspace.pinnedApps}
                      empty="Pin apps to keep them in your open workspace bar."
                      onOpen={openApp}
                      title="Pinned"
                    />
                  </div>
                </div>
              </WorkspaceSection>

              <WorkspaceSection
                description="Runtime feeds appear here once platform inbox and activity providers are connected."
                title="Signals"
              >
                <div className="space-y-4">
                  <RecentDocumentsPanel documents={workspace.recentDocuments} />
                  <ActivityTimeline activities={workspace.recentActivities} />
                </div>
              </WorkspaceSection>
            </div>
          </section>

          <section className="rounded-[2rem] border bg-[hsl(var(--surface))]/72 p-5 shadow-[var(--shadow-lg)] backdrop-blur">
            <WorkspaceSection
              description="Accepted foundation apps are generated from real App Registry manifests and are the primary workspace entry points."
              title="Business Applications"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {workspace.readyBusinessApps.map((app) => (
                  <AppCard
                    app={app}
                    key={app.key}
                    onFavorite={(item) => preferenceActions.toggleFavorite(item.key)}
                    onHide={(item) => preferenceActions.hide(item.key)}
                    onOpen={openApp}
                    onPin={(item) => preferenceActions.togglePin(item.key)}
                  />
                ))}
              </div>
            </WorkspaceSection>
          </section>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
            <WorkspaceSection
              description="Platform surfaces use existing foundation contracts where runtime routes exist and clear planned status otherwise."
              title="Platform Applications"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {workspace.platformApps.map((app) => (
                  <PlatformAppCard
                    app={app}
                    key={app.key}
                    onFavorite={(item) => preferenceActions.toggleFavorite(item.key)}
                    onHide={(item) => preferenceActions.hide(item.key)}
                    onOpen={openApp}
                    onPin={(item) => preferenceActions.togglePin(item.key)}
                  />
                ))}
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              description="Planned apps show phase, dependencies, and estimated release metadata. No fake runtime data is displayed."
              title="Planned Business Apps"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {workspace.plannedBusinessApps.map((app) => (
                  <PlannedAppCard
                    app={app}
                    key={app.key}
                    onFavorite={(item) => preferenceActions.toggleFavorite(item.key)}
                    onHide={(item) => preferenceActions.hide(item.key)}
                    onOpen={openApp}
                    onPin={(item) => preferenceActions.togglePin(item.key)}
                  />
                ))}
              </div>
            </WorkspaceSection>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function MiniAppList({
  title,
  apps,
  empty,
  onOpen,
}: Readonly<{
  title: string;
  apps: readonly WorkspaceAppModel[];
  empty: string;
  onOpen: (app: WorkspaceAppModel) => void;
}>) {
  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))]/78 p-4 shadow-sm backdrop-blur">
      <h3 className="text-sm font-semibold">{title}</h3>
      {apps.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {apps.slice(0, 6).map((app) => (
            <a
              className="block rounded-xl border bg-[hsl(var(--surface-glass))] px-3 py-2 text-sm transition hover:border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--muted))]"
              href={app.href ?? "/erp"}
              key={app.key}
              onClick={() => onOpen(app)}
            >
              {app.shortName}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function createWorkspaceCommandItems(
  baseItems: readonly CommandPaletteItem[],
  workspace: HomeWorkspaceModel,
): readonly CommandPaletteItem[] {
  const appItems = workspace.allApps.map((app) => ({
    description: app.description,
    group: app.isFavorite ? "Favorites" : app.isPinned ? "Pinned Apps" : "Apps",
    href: app.permissionState === "allowed" ? app.href : undefined,
    key: `workspace.app.${app.key}`,
    label: `Open ${app.shortName}`,
  }));
  const recentItems = workspace.recentApps.map((app) => ({
    description: "Recent app",
    group: "Recent",
    href: app.href,
    key: `workspace.recent.${app.key}`,
    label: `Reopen ${app.shortName}`,
  }));

  return [...baseItems, ...recentItems, ...appItems];
}
