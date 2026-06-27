import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type {
  CommandDefinition,
  NavigationContribution,
  QuickActionDefinition,
} from "@/platform/navigation/public-api";

export type AppKey = string & { readonly __brand: "AppKey" };

export type AppCategory =
  | "platform"
  | "finance"
  | "operations"
  | "sales"
  | "procurement"
  | "inventory"
  | "manufacturing"
  | "hr"
  | "service"
  | "analytics"
  | "integration"
  | "ai";

export type AppVersion = Readonly<{
  version: string;
  releaseChannel?: "stable" | "beta" | "preview";
  releasedAt?: string | null;
}>;

export type AppLifecycleState =
  | "available"
  | "installed"
  | "enabled"
  | "suspended"
  | "archived"
  | "upgrading";

export type AppCapabilityType =
  | "route"
  | "navigation"
  | "command"
  | "report"
  | "print"
  | "dashboard"
  | "setting"
  | "workflow"
  | "approval"
  | "search"
  | "connector"
  | "automation";

export type AppRoute = Readonly<{
  key: string;
  path: string;
  label: string;
  experience: AccessExperience;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
}>;

export type AppDependency = Readonly<{
  appKey: string;
  reason: string;
  isOptional?: boolean;
}>;

export type AppCapability = Readonly<{
  type: AppCapabilityType;
  key: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
}>;

export type AppHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type AppHealth = Readonly<{
  appKey: string;
  status: AppHealthStatus;
  checkedAt: string;
  version?: string;
  message?: string;
}>;

export type AppManifest = Readonly<{
  key: string;
  name: string;
  description: string;
  version: string;
  category: AppCategory;
  icon?: string;
  experiences: readonly AccessExperience[];
  permissions: readonly PermissionKey[];
  featureFlags?: readonly string[];
  routes: readonly AppRoute[];
  navigation: readonly NavigationContribution[];
  commands: readonly CommandDefinition[];
  quickActions: readonly QuickActionDefinition[];
  reports: readonly AppCapability[];
  prints: readonly AppCapability[];
  dashboards: readonly AppCapability[];
  settings: readonly AppCapability[];
  statuses?: readonly string[];
  dependencies: readonly AppDependency[];
  capabilities: readonly AppCapability[];
  sensitiveData: "none" | "standard" | "sensitive" | "restricted";
}>;

export type InstalledApp = Readonly<{
  appKey: string;
  tenantId: string;
  state: AppLifecycleState;
  installedVersion: string;
  enabledCompanyIds?: readonly string[];
  enabledBranchIds?: readonly string[];
}>;

export type AppEntitlement = Readonly<{
  appKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  state: "enabled" | "disabled" | "suspended";
  validFrom?: string | null;
  validTo?: string | null;
}>;

export type AppLifecycleAction =
  | "install"
  | "enable"
  | "disable"
  | "suspend"
  | "archive"
  | "upgrade"
  | "health-check";

export type AppLifecycleTransition = Readonly<{
  action: AppLifecycleAction;
  from: AppLifecycleState;
  to: AppLifecycleState;
}>;

export type AppRegistryContext = Readonly<{
  tenantId: string;
  experience: AccessExperience;
  companyId?: string | null;
  branchId?: string | null;
  grantedPermissions?: ReadonlySet<PermissionKey>;
  enabledFeatureFlags?: ReadonlySet<string>;
}>;

export type AppRegistrySnapshot = Readonly<{
  manifests: readonly AppManifest[];
  installedApps: readonly InstalledApp[];
  entitlements: readonly AppEntitlement[];
}>;

export type AppManifestValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export const APP_LIFECYCLE_TRANSITIONS = [
  { action: "install", from: "available", to: "installed" },
  { action: "enable", from: "installed", to: "enabled" },
  { action: "enable", from: "suspended", to: "enabled" },
  { action: "disable", from: "enabled", to: "installed" },
  { action: "suspend", from: "enabled", to: "suspended" },
  { action: "archive", from: "available", to: "archived" },
  { action: "archive", from: "installed", to: "archived" },
  { action: "archive", from: "suspended", to: "archived" },
  { action: "upgrade", from: "enabled", to: "upgrading" },
  { action: "upgrade", from: "installed", to: "upgrading" },
] as const satisfies readonly AppLifecycleTransition[];

export function defineAppManifest<TManifest extends AppManifest>(
  manifest: TManifest,
): TManifest {
  return manifest;
}

export function defineAppKey(value: string): AppKey {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("App keys must be lowercase dot or dash separated identifiers.");
  }

  return value as AppKey;
}

export function isAppEnabled(app: InstalledApp): boolean {
  return app.state === "enabled";
}

export function validateAppManifest(
  manifest: AppManifest,
  registry: readonly AppManifest[] = [],
): AppManifestValidationResult {
  const errors: string[] = [];

  if (!manifest.key.trim()) {
    errors.push("App key is required.");
  }

  if (!manifest.name.trim()) {
    errors.push("App name is required.");
  }

  if (!manifest.description.trim()) {
    errors.push("App description is required.");
  }

  if (!isSemverLike(manifest.version)) {
    errors.push("App version must use semantic versioning.");
  }

  if (manifest.experiences.length === 0) {
    errors.push("At least one supported experience is required.");
  }

  const duplicateCapabilityKeys = findDuplicates(manifest.capabilities.map((capability) => `${capability.type}:${capability.key}`));
  for (const duplicate of duplicateCapabilityKeys) {
    errors.push(`Duplicate capability: ${duplicate}`);
  }

  const duplicateRoutes = findDuplicates(manifest.routes.map((route) => route.key));
  for (const duplicate of duplicateRoutes) {
    errors.push(`Duplicate route: ${duplicate}`);
  }

  errors.push(...validateAppDependencies(manifest, registry));

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function validateAppDependencies(
  manifest: AppManifest,
  registry: readonly AppManifest[],
): readonly string[] {
  const registryKeys = new Set(registry.map((registeredManifest) => registeredManifest.key));
  const errors: string[] = [];

  for (const dependency of manifest.dependencies) {
    if (dependency.appKey === manifest.key) {
      errors.push(`App cannot depend on itself: ${dependency.appKey}`);
    }

    if (!dependency.isOptional && !registryKeys.has(dependency.appKey)) {
      errors.push(`Missing required dependency: ${dependency.appKey}`);
    }
  }

  return errors;
}

export function canTransitionAppLifecycle(
  state: AppLifecycleState,
  action: AppLifecycleAction,
): boolean {
  if (action === "health-check") {
    return state !== "archived";
  }

  return APP_LIFECYCLE_TRANSITIONS.some(
    (transition) => transition.from === state && transition.action === action,
  );
}

export function transitionAppLifecycle(
  app: InstalledApp,
  action: Exclude<AppLifecycleAction, "health-check">,
  nextVersion?: string,
): InstalledApp {
  const transition = APP_LIFECYCLE_TRANSITIONS.find(
    (candidate) => candidate.from === app.state && candidate.action === action,
  );

  if (!transition) {
    throw new Error(`Cannot ${action} app from ${app.state}.`);
  }

  return {
    ...app,
    installedVersion: nextVersion ?? app.installedVersion,
    state: transition.to,
  };
}

export function createAppHealth(
  app: InstalledApp,
  status: AppHealthStatus,
  checkedAt = new Date().toISOString(),
  message?: string,
): AppHealth {
  return {
    appKey: app.appKey,
    checkedAt,
    message,
    status,
    version: app.installedVersion,
  };
}

export function getInstalledApp(
  appKey: string,
  installedApps: readonly InstalledApp[],
  tenantId: string,
): InstalledApp | null {
  return installedApps.find((app) => app.appKey === appKey && app.tenantId === tenantId) ?? null;
}

export function isAppEntitled(
  appKey: string,
  entitlements: readonly AppEntitlement[],
  context: Pick<AppRegistryContext, "tenantId" | "companyId" | "branchId">,
  now = new Date().toISOString(),
): boolean {
  return entitlements.some((entitlement) => {
    if (entitlement.appKey !== appKey || entitlement.tenantId !== context.tenantId) {
      return false;
    }

    if (entitlement.state !== "enabled") {
      return false;
    }

    if (entitlement.companyId && entitlement.companyId !== context.companyId) {
      return false;
    }

    if (entitlement.branchId && entitlement.branchId !== context.branchId) {
      return false;
    }

    if (entitlement.validFrom && entitlement.validFrom > now) {
      return false;
    }

    if (entitlement.validTo && entitlement.validTo < now) {
      return false;
    }

    return true;
  });
}

export function isManifestAvailableForContext(
  manifest: AppManifest,
  snapshot: Pick<AppRegistrySnapshot, "installedApps" | "entitlements">,
  context: AppRegistryContext,
): boolean {
  if (!manifest.experiences.includes(context.experience)) {
    return false;
  }

  const installedApp = getInstalledApp(manifest.key, snapshot.installedApps, context.tenantId);
  if (!installedApp || installedApp.state !== "enabled") {
    return false;
  }

  if (!isAppEntitled(manifest.key, snapshot.entitlements, context)) {
    return false;
  }

  return hasRequiredPermissions(manifest.permissions, context.grantedPermissions)
    && hasRequiredFeatureFlags(manifest.featureFlags ?? [], context.enabledFeatureFlags);
}

export function getAvailableAppsForContext(
  snapshot: AppRegistrySnapshot,
  context: AppRegistryContext,
): readonly AppManifest[] {
  return snapshot.manifests.filter((manifest) =>
    isManifestAvailableForContext(manifest, snapshot, context),
  );
}

export function hasRequiredPermissions(
  requiredPermissions: readonly PermissionKey[] | undefined,
  grantedPermissions: ReadonlySet<PermissionKey> | undefined,
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (!grantedPermissions) {
    return false;
  }

  return requiredPermissions.every((permission) => grantedPermissions.has(permission));
}

export function hasRequiredFeatureFlags(
  requiredFeatureFlags: readonly string[] | undefined,
  enabledFeatureFlags: ReadonlySet<string> | undefined,
): boolean {
  if (!requiredFeatureFlags || requiredFeatureFlags.length === 0) {
    return true;
  }

  if (!enabledFeatureFlags) {
    return false;
  }

  return requiredFeatureFlags.every((featureFlag) => enabledFeatureFlags.has(featureFlag));
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function isSemverLike(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version);
}
