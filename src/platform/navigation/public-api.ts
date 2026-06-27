import type { AccessExperience } from "@/core/context";
import type {
  AppManifest,
  AppRegistryContext,
  AppRegistrySnapshot,
} from "@/platform/app-registry/public-api";
import {
  getAvailableAppsForContext,
  hasRequiredFeatureFlags,
  hasRequiredPermissions,
} from "@/platform/app-registry/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type NavigationPlacement =
  | "app-launcher"
  | "topbar"
  | "contextual-sidebar"
  | "breadcrumbs"
  | "mobile-navigation"
  | "command-palette"
  | "quick-actions"
  | "favorites"
  | "recent-apps";

export type NavigationItemKind = "app" | "route" | "group" | "external";

export type NavigationContext = Readonly<{
  experience: AccessExperience;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  activePath?: string | null;
  grantedPermissions?: ReadonlySet<PermissionKey>;
  enabledFeatureFlags?: ReadonlySet<string>;
  preferences?: NavigationPreferences;
}>;

export type NavigationContribution = Readonly<{
  key: string;
  appKey: string;
  label: string;
  href?: string;
  placement: NavigationPlacement;
  kind?: NavigationItemKind;
  order?: number;
  parentKey?: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
  supportedExperiences?: readonly AccessExperience[];
  icon?: string;
}>;

export type NavigationItem = NavigationContribution &
  Readonly<{
    isActive: boolean;
    isFavorite: boolean;
    isRecent: boolean;
    children: readonly NavigationItem[];
  }>;

export type BreadcrumbDefinition = Readonly<{
  key: string;
  label: string;
  href?: string;
  appKey?: string;
}>;

export type NavigationPreferences = Readonly<{
  favoriteAppKeys?: readonly string[];
  recentAppKeys?: readonly string[];
  favoriteNavigationKeys?: readonly string[];
  recentNavigationKeys?: readonly string[];
  favoriteCommandKeys?: readonly string[];
  recentCommandKeys?: readonly string[];
}>;

export type GeneratedNavigation = Readonly<{
  appLauncher: readonly NavigationItem[];
  topbar: readonly NavigationItem[];
  contextualSidebar: readonly NavigationItem[];
  breadcrumbs: readonly BreadcrumbDefinition[];
  mobileNavigation: readonly NavigationItem[];
  favorites: readonly NavigationItem[];
  recentApps: readonly NavigationItem[];
}>;

export type CommandCategory =
  | "navigation"
  | "create"
  | "search"
  | "switch"
  | "approval"
  | "print"
  | "export"
  | "system";

export type CommandScope =
  | "global"
  | "experience"
  | "app"
  | "page"
  | "selection";

export type CommandActionType =
  | "open-page"
  | "create-record"
  | "approve"
  | "print"
  | "export"
  | "search"
  | "switch-app"
  | "custom";

export type CommandDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  category: CommandCategory;
  scope: CommandScope;
  actionType: CommandActionType;
  description?: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
  supportedExperiences?: readonly AccessExperience[];
  href?: string;
  actionKey?: string;
  order?: number;
}>;

export type QuickActionDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  commandKey: string;
  scope: CommandScope;
  href?: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
  supportedExperiences?: readonly AccessExperience[];
  order?: number;
}>;

export type RecentCommand = Readonly<{
  commandKey: string;
  appKey: string;
  usedAt: string;
}>;

export type FavoriteCommand = Readonly<{
  commandKey: string;
  appKey: string;
  favoritedAt: string;
}>;

export type CommandRegistryContext = AppRegistryContext &
  Readonly<{
    scope?: CommandScope;
    appKey?: string | null;
    preferences?: NavigationPreferences;
  }>;

export type CommandRegistry = Readonly<{
  commands: readonly CommandDefinition[];
  quickActions: readonly QuickActionDefinition[];
  recentCommands: readonly RecentCommand[];
  favoriteCommands: readonly FavoriteCommand[];
}>;

export function defineNavigationContribution<TContribution extends NavigationContribution>(
  contribution: TContribution,
): TContribution {
  return contribution;
}

export function defineCommand<TCommand extends CommandDefinition>(
  command: TCommand,
): TCommand {
  return command;
}

export function defineQuickAction<TQuickAction extends QuickActionDefinition>(
  quickAction: TQuickAction,
): TQuickAction {
  return quickAction;
}

export function defineRecentCommand<TRecentCommand extends RecentCommand>(
  recentCommand: TRecentCommand,
): TRecentCommand {
  return recentCommand;
}

export function defineFavoriteCommand<TFavoriteCommand extends FavoriteCommand>(
  favoriteCommand: TFavoriteCommand,
): TFavoriteCommand {
  return favoriteCommand;
}

export function generateNavigation(
  snapshot: AppRegistrySnapshot,
  context: NavigationContext,
): GeneratedNavigation {
  if (context.experience === "api") {
    return emptyGeneratedNavigation();
  }

  const registryContext: AppRegistryContext = {
    branchId: context.branchId,
    companyId: context.companyId,
    enabledFeatureFlags: context.enabledFeatureFlags,
    experience: context.experience,
    grantedPermissions: context.grantedPermissions,
    tenantId: context.tenantId,
  };
  const manifests = getAvailableAppsForContext(snapshot, registryContext);
  const items = manifests.flatMap((manifest) =>
    manifest.navigation
      .filter((contribution) => isNavigationContributionVisible(contribution, context))
      .map((contribution) => toNavigationItem(contribution, context)),
  );

  return {
    appLauncher: sortNavigationItems(items.filter((item) => item.placement === "app-launcher")),
    breadcrumbs: generateBreadcrumbs(manifests, context),
    contextualSidebar: buildNavigationTree(sortNavigationItems(items.filter((item) => item.placement === "contextual-sidebar"))),
    favorites: sortNavigationItems(items.filter((item) => item.isFavorite)),
    mobileNavigation: sortNavigationItems(items.filter((item) => item.placement === "mobile-navigation")),
    recentApps: sortNavigationItems(items.filter((item) => item.placement === "recent-apps" || item.isRecent)),
    topbar: sortNavigationItems(items.filter((item) => item.placement === "topbar")),
  };
}

export function generateAppLauncher(
  snapshot: AppRegistrySnapshot,
  context: NavigationContext,
): readonly NavigationItem[] {
  return generateNavigation(snapshot, context).appLauncher;
}

export function generateMobileNavigation(
  snapshot: AppRegistrySnapshot,
  context: NavigationContext,
): readonly NavigationItem[] {
  return generateNavigation(snapshot, context).mobileNavigation;
}

export function generateBreadcrumbs(
  manifests: readonly AppManifest[],
  context: NavigationContext,
): readonly BreadcrumbDefinition[] {
  if (!context.activePath) {
    return [];
  }

  const route = manifests
    .flatMap((manifest) => manifest.routes.map((appRoute) => ({ appKey: manifest.key, route: appRoute })))
    .find(({ route }) => route.path === context.activePath);

  if (!route) {
    return [];
  }

  const manifest = manifests.find((candidate) => candidate.key === route.appKey);

  return [
    { key: "home", href: "/", label: "Home" },
    ...(manifest ? [{ key: manifest.key, label: manifest.name }] : []),
    { appKey: route.appKey, href: route.route.path, key: route.route.key, label: route.route.label },
  ];
}

export function registerCommands(
  manifests: readonly AppManifest[],
  context: CommandRegistryContext,
): CommandRegistry {
  const visibleManifests = manifests.filter((manifest) =>
    manifest.experiences.includes(context.experience)
    && (!context.appKey || manifest.key === context.appKey)
    && hasRequiredPermissions(manifest.permissions, context.grantedPermissions)
    && hasRequiredFeatureFlags(manifest.featureFlags ?? [], context.enabledFeatureFlags),
  );
  const commands = visibleManifests
    .flatMap((manifest) => manifest.commands)
    .filter((command) => isCommandVisible(command, context));
  const quickActions = visibleManifests
    .flatMap((manifest) => manifest.quickActions)
    .filter((quickAction) => isQuickActionVisible(quickAction, commands, context));

  return {
    commands: sortCommands(commands),
    favoriteCommands: commands
      .filter((command) => context.preferences?.favoriteCommandKeys?.includes(command.key))
      .map((command) => ({
        appKey: command.appKey,
        commandKey: command.key,
        favoritedAt: "preference",
      })),
    quickActions: sortQuickActions(quickActions),
    recentCommands: commands
      .filter((command) => context.preferences?.recentCommandKeys?.includes(command.key))
      .map((command) => ({
        appKey: command.appKey,
        commandKey: command.key,
        usedAt: "preference",
      })),
  };
}

export function registerQuickActions(
  manifests: readonly AppManifest[],
  context: CommandRegistryContext,
): readonly QuickActionDefinition[] {
  return registerCommands(manifests, context).quickActions;
}

export function isNavigationContributionVisible(
  contribution: NavigationContribution,
  context: NavigationContext,
): boolean {
  return (!contribution.supportedExperiences || contribution.supportedExperiences.includes(context.experience))
    && (!context.appKey || contribution.appKey === context.appKey)
    && (!contribution.requiredPermission || hasRequiredPermissions([contribution.requiredPermission], context.grantedPermissions))
    && (!contribution.requiredFeatureFlag || hasRequiredFeatureFlags([contribution.requiredFeatureFlag], context.enabledFeatureFlags));
}

export function isCommandVisible(
  command: CommandDefinition,
  context: CommandRegistryContext,
): boolean {
  return (!command.supportedExperiences || command.supportedExperiences.includes(context.experience))
    && (!context.scope || command.scope === context.scope || command.scope === "global")
    && (!context.appKey || command.appKey === context.appKey)
    && (!command.requiredPermission || hasRequiredPermissions([command.requiredPermission], context.grantedPermissions))
    && (!command.requiredFeatureFlag || hasRequiredFeatureFlags([command.requiredFeatureFlag], context.enabledFeatureFlags));
}

function isQuickActionVisible(
  quickAction: QuickActionDefinition,
  commands: readonly CommandDefinition[],
  context: CommandRegistryContext,
): boolean {
  return commands.some((command) => command.key === quickAction.commandKey)
    && (!quickAction.supportedExperiences || quickAction.supportedExperiences.includes(context.experience))
    && (!context.scope || quickAction.scope === context.scope || quickAction.scope === "global")
    && (!context.appKey || quickAction.appKey === context.appKey)
    && (!quickAction.requiredPermission || hasRequiredPermissions([quickAction.requiredPermission], context.grantedPermissions))
    && (!quickAction.requiredFeatureFlag || hasRequiredFeatureFlags([quickAction.requiredFeatureFlag], context.enabledFeatureFlags));
}

function toNavigationItem(
  contribution: NavigationContribution,
  context: NavigationContext,
): NavigationItem {
  return {
    ...contribution,
    children: [],
    isActive: Boolean(contribution.href && context.activePath === contribution.href),
    isFavorite: Boolean(context.preferences?.favoriteNavigationKeys?.includes(contribution.key)),
    isRecent: Boolean(
      context.preferences?.recentNavigationKeys?.includes(contribution.key)
      || context.preferences?.recentAppKeys?.includes(contribution.appKey),
    ),
    kind: contribution.kind ?? "route",
  };
}

function buildNavigationTree(items: readonly NavigationItem[]): readonly NavigationItem[] {
  const byKey = new Map<string, NavigationItem & { children: NavigationItem[] }>();

  for (const item of items) {
    byKey.set(item.key, { ...item, children: [] });
  }

  const roots: (NavigationItem & { children: NavigationItem[] })[] = [];

  for (const item of byKey.values()) {
    if (item.parentKey && byKey.has(item.parentKey)) {
      byKey.get(item.parentKey)?.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots.map((item) => ({
    ...item,
    children: sortNavigationItems(item.children),
  }));
}

function emptyGeneratedNavigation(): GeneratedNavigation {
  return {
    appLauncher: [],
    breadcrumbs: [],
    contextualSidebar: [],
    favorites: [],
    mobileNavigation: [],
    recentApps: [],
    topbar: [],
  };
}

function sortNavigationItems(items: readonly NavigationItem[]): readonly NavigationItem[] {
  return [...items].sort((left, right) =>
    (left.order ?? 0) - (right.order ?? 0) || left.label.localeCompare(right.label),
  );
}

function sortCommands(commands: readonly CommandDefinition[]): readonly CommandDefinition[] {
  return [...commands].sort((left, right) =>
    (left.order ?? 0) - (right.order ?? 0) || left.label.localeCompare(right.label),
  );
}

function sortQuickActions(quickActions: readonly QuickActionDefinition[]): readonly QuickActionDefinition[] {
  return [...quickActions].sort((left, right) =>
    (left.order ?? 0) - (right.order ?? 0) || left.label.localeCompare(right.label),
  );
}
