import type {
  AppCapabilityPlatformModel,
  AppReadinessChecklist,
  PlatformCapabilityContribution,
} from "@/shared/workspace/public-api";
import {
  PageContent,
  PageHeader,
  StatusChip,
} from "@/shared/ui";

export function CapabilitySummaryCards({
  model,
}: Readonly<{ model: AppCapabilityPlatformModel }>) {
  const cards = [
    { key: "apps", label: "Apps", value: model.summary.apps, description: "Manifest-backed accepted apps." },
    { key: "reports", label: "Reports", value: model.summary.reports, description: "Report contracts contributed by apps." },
    { key: "dashboards", label: "Dashboards", value: model.summary.dashboards, description: "Dashboard widgets and templates declared." },
    { key: "settings", label: "Settings", value: model.summary.settings, description: "App settings surfaced centrally." },
    { key: "flags", label: "Feature Flags", value: model.summary.featureFlags, description: "Runtime gates declared in manifests." },
    { key: "notifications", label: "Notifications", value: model.summary.notifications, description: "Notification hooks declared by apps." },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article className="rounded-lg border bg-[hsl(var(--surface))] p-4 shadow-sm" key={card.key}>
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
        </article>
      ))}
    </div>
  );
}

export function CapabilityContributionSection({
  title,
  description,
  items,
  emptyMessage,
}: Readonly<{
  title: string;
  description: string;
  items: readonly PlatformCapabilityContribution[];
  emptyMessage: string;
}>) {
  return (
    <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
      <PageHeader description={description} title={title} />
      <PageContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article className="rounded-xl border bg-[hsl(var(--surface-glass))] p-4 shadow-sm" key={item.key}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{item.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.appName}</p>
                  </div>
                  <StatusChip status={item.status} tone={item.status === "gated" ? "warning" : "accent"} />
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <CapabilityMeta label="Key" value={item.key} />
                  <CapabilityMeta label="Permission" value={item.requiredPermission ?? "Not required"} />
                  <CapabilityMeta label="Feature flag" value={item.requiredFeatureFlag ?? "Not gated"} />
                  {item.routeHref ? <CapabilityMeta label="Route" value={item.routeHref} /> : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </PageContent>
    </section>
  );
}

export function AppReadinessSection({
  items,
}: Readonly<{ items: readonly AppReadinessChecklist[] }>) {
  const checks = [
    ["hasRuntimeRoute", "Route"],
    ["hasNavigation", "Navigation"],
    ["hasReports", "Reports"],
    ["hasDashboards", "Dashboard"],
    ["hasSettings", "Settings"],
    ["hasFeatureFlags", "Flags"],
    ["hasNotifications", "Notifications"],
  ] as const;

  return (
    <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
      <PageHeader
        description="Every app must declare its platform capability surface before it is treated as a complete workspace app."
        title="App Readiness Checklist"
      />
      <PageContent>
        <div className="grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <article className="rounded-xl border bg-[hsl(var(--surface-glass))] p-4" key={item.appKey}>
              <h3 className="font-medium">{item.appName}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {checks.map(([key, label]) => (
                  <StatusChip
                    key={key}
                    status={label}
                    tone={item[key] ? "success" : "warning"}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </PageContent>
    </section>
  );
}

function CapabilityMeta({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-mono text-xs">{value}</dd>
    </div>
  );
}
