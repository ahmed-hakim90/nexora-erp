import type {
  AppManifest,
  AppRegistryContext,
  AppRegistrySnapshot,
} from "@/platform/app-registry/public-api";
import { hasRequiredFeatureFlags, hasRequiredPermissions } from "@/platform/app-registry/public-api";

import {
  PLATFORM_APPS,
  PLANNED_BUSINESS_APPS,
  WORKSPACE_LAST_UPDATE,
  WORKSPACE_VERSION,
  type WorkspaceAppStatus,
  type WorkspaceCatalogApp,
} from "./app-catalog";
import {
  EMPTY_WORKSPACE_PREFERENCES,
  normalizeWorkspacePreferences,
  type WorkspacePreferences,
  type WorkspaceRecentDocument,
} from "./preferences";

export type WorkspaceAppSource = "manifest" | "catalog";

export type WorkspaceAppPermissionState = "allowed" | "restricted";

export type WorkspaceAppModel = Readonly<{
  key: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  kind: "business" | "platform";
  icon: string;
  gradient: string;
  status: WorkspaceAppStatus;
  source: WorkspaceAppSource;
  href?: string;
  docsHref?: string;
  phase?: string;
  dependencies: readonly string[];
  estimatedRelease?: string;
  order: number;
  recentActivityCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  isHidden: boolean;
  permissionState: WorkspaceAppPermissionState;
  permissionLabel: string;
}>;

export type WorkspaceKpi = Readonly<{
  key: string;
  label: string;
  value: string;
  description: string;
  tone?: "neutral" | "success" | "warning" | "accent";
}>;

export type WorkspaceQuickAction = Readonly<{
  key: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  status: "ready" | "requires-app";
  appKey?: string;
}>;

export type WorkspaceActivityType =
  | "created"
  | "updated"
  | "approved"
  | "posted"
  | "completed"
  | "imported"
  | "exported"
  | "notification";

export type WorkspaceActivity = Readonly<{
  key: string;
  type: WorkspaceActivityType;
  title: string;
  description: string;
  occurredAt?: string;
  href?: string;
  isPreview?: boolean;
}>;

export type WorkspaceTab = Readonly<{
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  isPinned: boolean;
}>;

export type HomeWorkspaceModel = Readonly<{
  allApps: readonly WorkspaceAppModel[];
  businessApps: readonly WorkspaceAppModel[];
  readyBusinessApps: readonly WorkspaceAppModel[];
  plannedBusinessApps: readonly WorkspaceAppModel[];
  platformApps: readonly WorkspaceAppModel[];
  recentApps: readonly WorkspaceAppModel[];
  favoriteApps: readonly WorkspaceAppModel[];
  pinnedApps: readonly WorkspaceAppModel[];
  hiddenApps: readonly WorkspaceAppModel[];
  openTabs: readonly WorkspaceTab[];
  recentDocuments: readonly WorkspaceRecentDocument[];
  recentActivities: readonly WorkspaceActivity[];
  quickActions: readonly WorkspaceQuickAction[];
  progressKpis: readonly WorkspaceKpi[];
}>;

export type BuildHomeWorkspaceInput = Readonly<{
  snapshot: AppRegistrySnapshot;
  context: AppRegistryContext;
  catalog?: readonly WorkspaceCatalogApp[];
  preferences?: Partial<WorkspacePreferences> | null;
  activePath?: string;
  version?: string;
  lastUpdate?: string;
}>;

const MANIFEST_GRADIENTS: Readonly<Record<string, string>> = {
  finance: "from-blue-500/20 via-indigo-500/10 to-transparent",
  inventory: "from-emerald-500/20 via-teal-500/10 to-transparent",
  manufacturing: "from-orange-500/20 via-amber-500/10 to-transparent",
};

const MANIFEST_ICONS: Readonly<Record<string, string>> = {
  finance: "landmark",
  inventory: "boxes",
  manufacturing: "factory",
};

export const WORKSPACE_QUICK_ACTIONS = [
  {
    appKey: "inventory",
    description: "Open the product foundation workspace to define products and variants.",
    href: "/erp/inventory#products",
    icon: "package-plus",
    key: "quick.new-product",
    label: "New Product",
    status: "ready",
  },
  {
    appKey: "manufacturing",
    description: "Open Daily Production Report readiness in Manufacturing.",
    href: "/erp/manufacturing#daily-production-report",
    icon: "clipboard-plus",
    key: "quick.new-dpr",
    label: "New Daily Production Report",
    status: "ready",
  },
  {
    appKey: "finance",
    description: "Open journal definitions and posting readiness in Finance.",
    href: "/erp/finance#journals",
    icon: "book-plus",
    key: "quick.new-journal",
    label: "New Journal",
    status: "ready",
  },
  {
    appKey: "inventory",
    description: "Open warehouse and stock foundation readiness in Inventory.",
    href: "/erp/inventory#stock",
    icon: "warehouse",
    key: "quick.new-warehouse",
    label: "New Warehouse",
    status: "ready",
  },
  {
    appKey: "manufacturing",
    description: "Open production target and planning readiness in Manufacturing.",
    href: "/erp/manufacturing#targets",
    icon: "calendar-plus",
    key: "quick.new-production-plan",
    label: "New Production Plan",
    status: "ready",
  },
  {
    description: "Use platform search across apps, commands, navigation, and ready contracts.",
    href: "/erp",
    icon: "search",
    key: "quick.search-everything",
    label: "Search Everything",
    status: "ready",
  },
  {
    description: "Open enterprise reports, import, export, and reconciliation readiness.",
    href: "/erp/reports",
    icon: "bar-chart-3",
    key: "quick.reports",
    label: "Reports",
    status: "ready",
  },
  {
    description: "Open import readiness from the enterprise reports workspace.",
    href: "/erp/reports#import",
    icon: "import",
    key: "quick.import",
    label: "Import",
    status: "ready",
  },
  {
    description: "Open export readiness from the enterprise reports workspace.",
    href: "/erp/reports#export",
    icon: "download",
    key: "quick.export",
    label: "Export",
    status: "ready",
  },
] as const satisfies readonly WorkspaceQuickAction[];

export function buildHomeWorkspace(input: BuildHomeWorkspaceInput): HomeWorkspaceModel {
  const preferences = normalizeWorkspacePreferences(input.preferences ?? EMPTY_WORKSPACE_PREFERENCES);
  const catalog = input.catalog ?? [...PLANNED_BUSINESS_APPS, ...PLATFORM_APPS];
  const manifestApps = input.snapshot.manifests.map((manifest, index) =>
    createManifestAppModel(manifest, input.snapshot, input.context, preferences, index),
  );
  const catalogApps = catalog.map((app) => createCatalogAppModel(app, preferences));
  const sourceApps = [...manifestApps, ...catalogApps];
  const allApps = applyAppOrder(
    sourceApps.filter((app) => !app.isHidden),
    preferences.appOrder,
  );

  const byKey = new Map(allApps.map((app) => [app.key, app]));
  const businessApps = allApps.filter((app) => app.kind === "business");
  const readyBusinessApps = businessApps.filter((app) => app.status === "ready");
  const plannedBusinessApps = businessApps.filter((app) =>
    app.source === "catalog" && ["planned", "coming-soon", "in-development", "beta"].includes(app.status),
  );
  const platformApps = allApps.filter((app) => app.kind === "platform");
  const recentApps = preferences.recentApps
    .map((recent) => byKey.get(recent.appKey))
    .filter((app): app is WorkspaceAppModel => Boolean(app));
  const favoriteApps = allApps.filter((app) => app.isFavorite);
  const pinnedApps = allApps.filter((app) => app.isPinned);
  const openTabs = buildOpenTabs(allApps, preferences, input.activePath ?? "/erp");

  return {
    allApps,
    businessApps,
    favoriteApps,
    hiddenApps: sourceApps.filter((app) => app.isHidden),
    openTabs,
    pinnedApps,
    plannedBusinessApps,
    platformApps,
    progressKpis: buildProgressKpis({
      businessApps: sourceApps.filter((app) => app.kind === "business"),
      lastUpdate: input.lastUpdate ?? WORKSPACE_LAST_UPDATE,
      platformApps: sourceApps.filter((app) => app.kind === "platform"),
      version: input.version ?? WORKSPACE_VERSION,
    }),
    quickActions: WORKSPACE_QUICK_ACTIONS,
    readyBusinessApps,
    recentActivities: [],
    recentApps,
    recentDocuments: preferences.recentDocuments,
  };
}

function createManifestAppModel(
  manifest: AppManifest,
  snapshot: AppRegistrySnapshot,
  context: AppRegistryContext,
  preferences: WorkspacePreferences,
  index: number,
): WorkspaceAppModel {
  const route = manifest.routes.find((candidate) => candidate.experience === context.experience);
  const documentationRoute = manifest.routes.find((candidate) =>
    candidate.experience === context.experience && candidate.key === `${manifest.key}.documentation`
  );
  const launcher = manifest.navigation.find((item) => item.placement === "app-launcher");
  const hasManifestPermissions = hasRequiredPermissions(manifest.permissions, context.grantedPermissions);
  const hasRoutePermission = route?.requiredPermission
    ? hasRequiredPermissions([route.requiredPermission], context.grantedPermissions)
    : true;
  const hasFeatureFlags = hasRequiredFeatureFlags(manifest.featureFlags ?? [], context.enabledFeatureFlags);
  const installed = snapshot.installedApps.find((app) =>
    app.appKey === manifest.key && app.tenantId === context.tenantId,
  );
  const entitled = snapshot.entitlements.find((entitlement) =>
    entitlement.appKey === manifest.key
    && entitlement.tenantId === context.tenantId
    && (!entitlement.companyId || entitlement.companyId === context.companyId)
    && (!entitlement.branchId || entitlement.branchId === context.branchId),
  );
  const isAllowed = hasManifestPermissions
    && hasRoutePermission
    && hasFeatureFlags
    && installed?.state === "enabled"
    && entitled?.state === "enabled";

  return {
    category: manifest.category,
    dependencies: manifest.dependencies.map((dependency) => dependency.reason),
    description: manifest.description,
    docsHref: documentationRoute?.path,
    estimatedRelease: undefined,
    gradient: MANIFEST_GRADIENTS[manifest.key] ?? "from-blue-500/20 via-slate-500/10 to-transparent",
    href: route?.path ?? launcher?.href,
    icon: manifest.icon ?? MANIFEST_ICONS[manifest.key] ?? "grid-2x2",
    isFavorite: preferences.favoriteAppKeys.includes(manifest.key),
    isHidden: preferences.hiddenAppKeys.includes(manifest.key),
    isPinned: preferences.pinnedAppKeys.includes(manifest.key),
    key: manifest.key,
    kind: "business",
    name: manifest.name,
    order: launcher?.order ?? index + 1,
    permissionLabel: isAllowed ? "Permission granted" : "Permission required",
    permissionState: isAllowed ? "allowed" : "restricted",
    phase: "Accepted Foundation",
    recentActivityCount: 0,
    shortName: launcher?.label ?? manifest.name.replace(" Foundation", ""),
    source: "manifest",
    status: "ready",
  };
}

function createCatalogAppModel(
  app: WorkspaceCatalogApp,
  preferences: WorkspacePreferences,
): WorkspaceAppModel {
  return {
    category: app.category,
    dependencies: app.dependencies ?? [],
    description: app.description,
    docsHref: app.docsHref,
    estimatedRelease: app.estimatedRelease,
    gradient: app.gradient,
    href: app.href,
    icon: app.icon,
    isFavorite: preferences.favoriteAppKeys.includes(app.key),
    isHidden: preferences.hiddenAppKeys.includes(app.key),
    isPinned: preferences.pinnedAppKeys.includes(app.key),
    key: app.key,
    kind: app.kind,
    name: app.name,
    order: app.order,
    permissionLabel: app.href ? "Available in workspace" : "No runtime route yet",
    permissionState: app.href ? "allowed" : "restricted",
    phase: app.phase,
    recentActivityCount: 0,
    shortName: app.shortName ?? app.name,
    source: "catalog",
    status: app.status,
  };
}

function applyAppOrder(
  apps: readonly WorkspaceAppModel[],
  appOrder: readonly string[],
): readonly WorkspaceAppModel[] {
  const orderIndex = new Map(appOrder.map((key, index) => [key, index]));

  return [...apps].sort((left, right) => {
    const leftIndex = orderIndex.get(left.key);
    const rightIndex = orderIndex.get(right.key);

    if (leftIndex !== undefined || rightIndex !== undefined) {
      return (leftIndex ?? Number.MAX_SAFE_INTEGER) - (rightIndex ?? Number.MAX_SAFE_INTEGER);
    }

    return left.order - right.order || left.name.localeCompare(right.name);
  });
}

function buildOpenTabs(
  apps: readonly WorkspaceAppModel[],
  preferences: WorkspacePreferences,
  activePath: string,
): readonly WorkspaceTab[] {
  const tabKeys = new Set([
    ...preferences.pinnedAppKeys,
    ...preferences.openWorkspaceAppKeys,
    ...preferences.recentApps.map((recent) => recent.appKey).slice(0, 4),
  ]);
  const tabs = apps
    .filter((app) => tabKeys.has(app.key) && app.href)
    .map((app) => ({
      href: app.href ?? "/erp",
      isActive: app.href === activePath,
      isPinned: app.isPinned,
      key: app.key,
      label: app.shortName,
    }));

  if (tabs.length > 0) {
    return tabs;
  }

  return [{
    href: "/erp",
    isActive: activePath === "/erp",
    isPinned: true,
    key: "workspace-home",
    label: "Enterprise Home",
  }];
}

function buildProgressKpis(input: Readonly<{
  businessApps: readonly WorkspaceAppModel[];
  platformApps: readonly WorkspaceAppModel[];
  version: string;
  lastUpdate: string;
}>): readonly WorkspaceKpi[] {
  const businessReady = input.businessApps.filter((app) => app.status === "ready").length;
  const businessPlanned = input.businessApps.filter((app) => app.status === "planned").length;
  const businessInDevelopment = input.businessApps.filter((app) =>
    app.status === "in-development" || app.status === "beta",
  ).length;
  const platformReady = input.platformApps.filter((app) => app.status === "ready").length;

  return [
    {
      description: `${platformReady} platform surfaces are available to this workspace.`,
      key: "platform",
      label: "Platform",
      tone: "accent",
      value: `${platformReady}/${input.platformApps.length}`,
    },
    {
      description: "Finance, Inventory, and Manufacturing foundations are accepted.",
      key: "business-foundations",
      label: "Business Foundations",
      tone: "success",
      value: String(businessReady),
    },
    {
      description: "Business apps visible in the launcher and roadmap.",
      key: "business-apps",
      label: "Business Apps",
      value: String(input.businessApps.length),
    },
    {
      description: "Enterprise workspace contract version.",
      key: "current-version",
      label: "Current Version",
      value: input.version,
    },
    {
      description: "Last foundation and UI workspace refresh.",
      key: "last-update",
      label: "Last Update",
      value: input.lastUpdate,
    },
    {
      description: "Accepted manifest-backed apps ready to open.",
      key: "apps-ready",
      label: "Apps Ready",
      tone: "success",
      value: String(businessReady),
    },
    {
      description: "Roadmap apps with phase and dependency metadata.",
      key: "apps-planned",
      label: "Apps Planned",
      tone: "warning",
      value: String(businessPlanned),
    },
    {
      description: "Apps with contracts being actively shaped.",
      key: "apps-in-development",
      label: "Apps In Development",
      tone: businessInDevelopment > 0 ? "accent" : "neutral",
      value: String(businessInDevelopment),
    },
  ];
}
