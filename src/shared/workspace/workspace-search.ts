import type {
  CommandDefinition,
  NavigationContribution,
} from "@/platform/navigation/public-api";
import {
  createCommandSearchProvider,
  createNavigationSearchProvider,
} from "@/platform/search/public-api";
import {
  createSearchProviderRegistry,
  defineSearchProvider,
  executeSearch,
  type SearchContext,
  type SearchPage,
  type SearchProviderRegistry,
  type SearchQuery,
  type SearchResult,
} from "@/platform/search/public-api";

import type { PlatformCapabilityContribution } from "./app-capability-platform";
import type { WorkspaceAppModel } from "./home-workspace-model";

export type WorkspaceSearchRegistryInput = Readonly<{
  apps: readonly WorkspaceAppModel[];
  capabilities?: readonly PlatformCapabilityContribution[];
  commands?: readonly CommandDefinition[];
  navigation?: readonly NavigationContribution[];
}>;

export function createWorkspaceSearchRegistry(
  input: WorkspaceSearchRegistryInput,
): SearchProviderRegistry {
  return createSearchProviderRegistry([
    createWorkspaceAppSearchProvider(input.apps),
    createWorkspaceCapabilitySearchProvider(input.capabilities ?? []),
    createCommandSearchProvider(input.commands ?? []),
    createNavigationSearchProvider(input.navigation ?? []),
  ]);
}

export async function runWorkspaceSearch(
  registry: SearchProviderRegistry,
  query: SearchQuery,
  context: SearchContext,
): Promise<SearchPage<SearchResult>> {
  return executeSearch(registry, query, context);
}

export function createWorkspaceAppSearchProvider(apps: readonly WorkspaceAppModel[]) {
  return defineSearchProvider({
    entityTypes: ["workspace-app"],
    key: "workspace.apps",
    moduleKey: "workspace",
    searchableEntities: [{
      displayName: "Workspace Apps",
      entityType: "workspace-app",
      moduleKey: "workspace",
      quickSearchFields: ["name", "description", "category", "status"],
      rankingStrategy: "exact-first",
      resultType: "app",
    }],
    source: "app",
    supportedExperiences: ["erp"],
    search: (query, context) =>
      apps
        .filter((app) => app.kind === "platform" || context.experience === "erp")
        .filter((app) => matchesWorkspaceSearch(query.normalizedTerm, app))
        .map((app) => ({
          appKey: app.key,
          entityId: app.key,
          entityType: "workspace-app",
          href: app.permissionState === "allowed" ? app.href : undefined,
          metadata: {
            category: app.category,
            isFavorite: app.isFavorite,
            isPinned: app.isPinned,
            permissionState: app.permissionState,
            source: app.source,
            status: app.status,
          },
          moduleKey: "workspace",
          rank: app.isFavorite ? 15 : app.isPinned ? 10 : 0,
          sensitivity: "internal",
          subtitle: `${statusToLabel(app.status)} - ${app.description}`,
          title: app.shortName,
          type: "app",
        })),
  });
}

export function createWorkspaceCapabilitySearchProvider(
  capabilities: readonly PlatformCapabilityContribution[],
) {
  return defineSearchProvider({
    entityTypes: ["workspace-capability"],
    key: "workspace.capabilities",
    moduleKey: "workspace",
    searchableEntities: [{
      displayName: "Workspace Capabilities",
      entityType: "workspace-capability",
      moduleKey: "workspace",
      quickSearchFields: ["label", "key", "kind", "appName"],
      rankingStrategy: "exact-first",
      resultType: "record",
    }],
    source: "app",
    supportedExperiences: ["erp"],
    search: (query, context) =>
      capabilities
        .filter((capability) => !capability.requiredPermission || hasGrantedPermission(context, capability.requiredPermission))
        .filter((capability) => matchesCapabilitySearch(query.normalizedTerm, capability))
        .map((capability) => ({
          appKey: capability.appKey,
          entityId: capability.key,
          entityType: "workspace-capability",
          href: capability.routeHref ?? platformCapabilityHref(capability.kind),
          metadata: {
            appName: capability.appName,
            kind: capability.kind,
            requiredFeatureFlag: capability.requiredFeatureFlag,
            requiredPermission: capability.requiredPermission,
            status: capability.status,
          },
          moduleKey: "workspace",
          rank: capability.status === "route-backed" ? 12 : capability.status === "gated" ? 8 : 4,
          sensitivity: "internal",
          subtitle: `${capability.appName} - ${capability.kind}`,
          title: capability.label,
          type: "record",
        })),
  });
}

function matchesWorkspaceSearch(term: string, app: WorkspaceAppModel): boolean {
  if (term.length < 2) {
    return false;
  }

  const haystack = [
    app.name,
    app.shortName,
    app.description,
    app.category,
    app.status,
    app.phase,
    ...app.dependencies,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return term.split(/\s+/u).every((token) => haystack.includes(token));
}

function matchesCapabilitySearch(term: string, capability: PlatformCapabilityContribution): boolean {
  if (term.length < 2) {
    return false;
  }

  const haystack = [
    capability.key,
    capability.label,
    capability.kind,
    capability.appKey,
    capability.appName,
    capability.requiredPermission,
    capability.requiredFeatureFlag,
    capability.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return term.split(/\s+/u).every((token) => haystack.includes(token));
}

function hasGrantedPermission(context: SearchContext, permission: string): boolean {
  return [...(context.grantedPermissions ?? [])].some((grantedPermission) => grantedPermission === permission);
}

function platformCapabilityHref(kind: PlatformCapabilityContribution["kind"]): string {
  return {
    dashboard: "/erp/dashboard",
    "feature-flag": "/erp/feature-flags",
    notification: "/erp/notifications",
    print: "/erp/reports#print",
    report: "/erp/reports",
    setting: "/erp/settings",
  }[kind];
}

function statusToLabel(status: WorkspaceAppModel["status"]): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
