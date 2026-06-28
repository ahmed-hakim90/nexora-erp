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

import type { WorkspaceAppModel } from "./home-workspace-model";

export type WorkspaceSearchRegistryInput = Readonly<{
  apps: readonly WorkspaceAppModel[];
  commands?: readonly CommandDefinition[];
  navigation?: readonly NavigationContribution[];
}>;

export function createWorkspaceSearchRegistry(
  input: WorkspaceSearchRegistryInput,
): SearchProviderRegistry {
  return createSearchProviderRegistry([
    createWorkspaceAppSearchProvider(input.apps),
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

function statusToLabel(status: WorkspaceAppModel["status"]): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
