"use client";

import { Clock3, Eye, Pin, RotateCcw, Star } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { Button, PageContent, PageHeader, useEnterpriseUi } from "@/shared/ui";
import {
  WORKSPACE_APP_CATALOG,
  useWorkspacePreferences,
  type WorkspacePreferences,
} from "@/shared/workspace/public-api";

type PreferencesWorkspaceProps = Readonly<{
  initialPreferences: Readonly<{
    persisted: boolean;
    preferences: WorkspacePreferences;
  }>;
}>;

export function PreferencesWorkspace({ initialPreferences }: PreferencesWorkspaceProps) {
  const enterpriseUi = useEnterpriseUi();
  const [preferences, actions] = useWorkspacePreferences({
    databasePersisted: initialPreferences.persisted,
    initialPreferences: initialPreferences.preferences,
  });
  const appLabels = useMemo(
    () => new Map<string, string>(WORKSPACE_APP_CATALOG.map((app) => [app.key, app.name])),
    [],
  );
  const summary = [
    { label: "Favorites", value: preferences.favoriteAppKeys.length, icon: Star },
    { label: "Pinned", value: preferences.pinnedAppKeys.length, icon: Pin },
    { label: "Hidden", value: preferences.hiddenAppKeys.length, icon: Eye },
    { label: "Recent apps", value: preferences.recentApps.length, icon: Clock3 },
  ] as const;

  return (
    <>
      <PageHeader
        description="Preferences are saved to your ERP user profile for this tenant and reused across browsers."
        title="Preferences"
      >
        <Button onClick={actions.reset} type="button" variant="danger">
          <RotateCcw aria-hidden className="size-4" />
          Reset preferences
        </Button>
      </PageHeader>
      <PageContent>
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-4">
            {summary.map((item) => (
              <div className="rounded-2xl border bg-[hsl(var(--surface))] p-4 shadow-sm" key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <item.icon aria-hidden className="size-4 text-[hsl(var(--accent))]" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </section>

          <PreferenceSection
            emptyMessage="No favorite apps yet."
            items={preferences.favoriteAppKeys}
            labelFor={(key) => appLabels.get(key) ?? key}
            renderActions={(key) => (
              <>
                <Button onClick={() => actions.togglePin(key)} size="sm" type="button">
                  {preferences.pinnedAppKeys.includes(key) ? "Unpin" : "Pin"}
                </Button>
                <Button onClick={() => actions.toggleFavorite(key)} size="sm" type="button">
                  Remove favorite
                </Button>
              </>
            )}
            title="Favorite Apps"
          />

          <PreferenceSection
            emptyMessage="No pinned apps yet."
            items={preferences.pinnedAppKeys}
            labelFor={(key) => appLabels.get(key) ?? key}
            renderActions={(key) => (
              <Button onClick={() => actions.togglePin(key)} size="sm" type="button">
                Unpin
              </Button>
            )}
            title="Pinned Apps"
          />

          <PreferenceSection
            emptyMessage="No hidden apps."
            items={preferences.hiddenAppKeys}
            labelFor={(key) => appLabels.get(key) ?? key}
            renderActions={(key) => (
              <Button onClick={() => actions.unhide(key)} size="sm" type="button">
                Unhide
              </Button>
            )}
            title="Hidden Apps"
          />

          <section className="rounded-2xl border bg-[hsl(var(--surface))] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Recent Apps</h2>
                <p className="text-sm text-muted-foreground">Recently opened workspaces for this user.</p>
              </div>
              <span className="rounded-full border bg-[hsl(var(--surface-muted))] px-3 py-1 text-xs text-muted-foreground">
                {enterpriseUi.locale.toUpperCase()}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {preferences.recentApps.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No recent apps yet.
                </p>
              ) : (
                preferences.recentApps.map((app) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[hsl(var(--surface-muted))] p-3"
                    key={app.appKey}
                  >
                    <div>
                      <p className="text-sm font-medium">{app.label}</p>
                      <p className="text-xs text-muted-foreground">{formatTimestamp(app.openedAt)}</p>
                    </div>
                    {preferences.openWorkspaceAppKeys.includes(app.appKey) ? (
                      <Button onClick={() => actions.closeWorkspace(app.appKey)} size="sm" type="button">
                        Close tab
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </PageContent>
    </>
  );
}

function PreferenceSection({
  emptyMessage,
  items,
  labelFor,
  renderActions,
  title,
}: Readonly<{
  emptyMessage: string;
  items: readonly string[];
  labelFor: (key: string) => string;
  renderActions: (key: string) => ReactNode;
  title: string;
}>) {
  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))] p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((key) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[hsl(var(--surface-muted))] p-3"
              key={key}
            >
              <div>
                <p className="text-sm font-medium">{labelFor(key)}</p>
                <p className="text-xs text-muted-foreground">{key}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">{renderActions(key)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
}
