import type {
  AppCapability,
  AppManifest,
} from "@/platform/app-registry/public-api";

export type PlatformCapabilityKind =
  | "report"
  | "print"
  | "dashboard"
  | "setting"
  | "feature-flag"
  | "notification";

export type PlatformCapabilityContribution = Readonly<{
  key: string;
  appKey: string;
  appName: string;
  kind: PlatformCapabilityKind;
  label: string;
  requiredPermission?: string;
  requiredFeatureFlag?: string;
  routeHref?: string;
  status: "declared" | "gated" | "route-backed";
}>;

export type AppReadinessChecklist = Readonly<{
  appKey: string;
  appName: string;
  hasRuntimeRoute: boolean;
  hasNavigation: boolean;
  hasReports: boolean;
  hasDashboards: boolean;
  hasSettings: boolean;
  hasFeatureFlags: boolean;
  hasNotifications: boolean;
}>;

export type AppCapabilityPlatformModel = Readonly<{
  reports: readonly PlatformCapabilityContribution[];
  prints: readonly PlatformCapabilityContribution[];
  dashboards: readonly PlatformCapabilityContribution[];
  settings: readonly PlatformCapabilityContribution[];
  featureFlags: readonly PlatformCapabilityContribution[];
  notifications: readonly PlatformCapabilityContribution[];
  readiness: readonly AppReadinessChecklist[];
  summary: Readonly<{
    apps: number;
    routeBackedApps: number;
    reports: number;
    dashboards: number;
    settings: number;
    featureFlags: number;
    notifications: number;
  }>;
}>;

export function buildAppCapabilityPlatformModel(
  manifests: readonly AppManifest[],
): AppCapabilityPlatformModel {
  const reports = manifests.flatMap((manifest) => collectCapabilities(manifest, "report", manifest.reports));
  const prints = manifests.flatMap((manifest) => collectCapabilities(manifest, "print", manifest.prints));
  const dashboards = manifests.flatMap((manifest) => collectCapabilities(manifest, "dashboard", manifest.dashboards));
  const settings = manifests.flatMap((manifest) => collectCapabilities(manifest, "setting", manifest.settings));
  const featureFlags = manifests.flatMap(collectFeatureFlags);
  const notifications = manifests.flatMap((manifest) =>
    collectCapabilities(
      manifest,
      "notification",
      manifest.notifications ?? manifest.capabilities.filter((capability) => capability.type === "notification"),
    )
  );
  const readiness = manifests.map(createReadinessChecklist);

  return {
    dashboards,
    featureFlags,
    notifications,
    prints,
    readiness,
    reports,
    settings,
    summary: {
      apps: manifests.length,
      dashboards: dashboards.length,
      featureFlags: featureFlags.length,
      notifications: notifications.length,
      reports: reports.length,
      routeBackedApps: readiness.filter((app) => app.hasRuntimeRoute).length,
      settings: settings.length,
    },
  };
}

function collectCapabilities(
  manifest: AppManifest,
  kind: Exclude<PlatformCapabilityKind, "feature-flag">,
  capabilities: readonly AppCapability[],
): readonly PlatformCapabilityContribution[] {
  return capabilities.map((capability) => ({
    appKey: manifest.key,
    appName: manifest.name,
    key: capability.key,
    kind,
    label: toTitle(capability.key.replace(`${manifest.key}.`, "")),
    requiredFeatureFlag: capability.requiredFeatureFlag,
    requiredPermission: capability.requiredPermission,
    routeHref: findCapabilityRoute(manifest, capability),
    status: capability.requiredFeatureFlag
      ? "gated"
      : findCapabilityRoute(manifest, capability)
        ? "route-backed"
        : "declared",
  }));
}

function collectFeatureFlags(manifest: AppManifest): readonly PlatformCapabilityContribution[] {
  const flags = new Set<string>([
    ...(manifest.featureFlags ?? []),
    ...manifest.routes.map((route) => route.requiredFeatureFlag).filter(isPresent),
    ...manifest.navigation.map((item) => item.requiredFeatureFlag).filter(isPresent),
    ...manifest.capabilities.map((capability) => capability.requiredFeatureFlag).filter(isPresent),
  ]);

  return [...flags].sort().map((flag) => ({
    appKey: manifest.key,
    appName: manifest.name,
    key: flag,
    kind: "feature-flag",
    label: toTitle(flag),
    requiredFeatureFlag: flag,
    status: "gated",
  }));
}

function createReadinessChecklist(manifest: AppManifest): AppReadinessChecklist {
  return {
    appKey: manifest.key,
    appName: manifest.name,
    hasDashboards: manifest.dashboards.length > 0,
    hasFeatureFlags: (manifest.featureFlags?.length ?? 0) > 0
      || manifest.capabilities.some((capability) => capability.requiredFeatureFlag),
    hasNavigation: manifest.navigation.length > 0,
    hasNotifications: (manifest.notifications?.length ?? 0) > 0
      || manifest.capabilities.some((capability) => capability.type === "notification"),
    hasReports: manifest.reports.length > 0,
    hasRuntimeRoute: manifest.routes.length > 0,
    hasSettings: manifest.settings.length > 0,
  };
}

function findCapabilityRoute(
  manifest: AppManifest,
  capability: AppCapability,
): string | undefined {
  const capabilityStem = capability.key.split(".").slice(0, -1).join(".");
  const matchingRoute = manifest.routes.find((route) =>
    route.key === capability.key || route.key.startsWith(capabilityStem)
  );

  return matchingRoute?.path;
}

function toTitle(value: string): string {
  return value
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPresent<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
