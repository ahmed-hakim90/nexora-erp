import type { AccessExperience } from "@/core/context";
import type { DocumentType } from "@/platform/document/public-api";
import type { CommandDefinition, NavigationContribution } from "@/platform/navigation/public-api";
import type { PartyRoleType } from "@/platform/party/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type SearchRankingStrategy = "exact-first" | "weighted" | "recent-first";
export type SearchResultType =
  | "record"
  | "navigation"
  | "command"
  | "report"
  | "dashboard"
  | "setting"
  | "document"
  | "party"
  | "app"
  | "marketplace-item";

export type SearchProviderSource =
  | "app"
  | "platform-engine"
  | "document"
  | "party"
  | "command"
  | "navigation"
  | "report"
  | "marketplace";

export type SearchScope = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  appKey?: string | null;
}>;

export type SearchSensitivity = "public" | "internal" | "sensitive" | "restricted";

export type SearchIndexPolicy = Readonly<{
  enabled: boolean;
  fields: readonly string[];
  refresh: "manual" | "event-driven" | "scheduled";
  languageReadiness: readonly ("ar" | "en")[];
}>;

export type SearchRankingPolicy = Readonly<{
  exactMatchBoost: number;
  prefixMatchBoost: number;
  fuzzyMatchBoost: number;
  recentBoost: number;
  favoriteBoost: number;
  frequentlyUsedBoost: number;
  appPriorityBoost: number;
  entityPriorityBoost: number;
}>;

export type SearchPermissionPolicy = Readonly<{
  requiredPermissions?: readonly PermissionKey[];
  sensitivity: SearchSensitivity;
  hideWhenUnauthorized: boolean;
}>;

export type SearchableEntityDefinition = Readonly<{
  moduleKey: string;
  entityType: string;
  displayName: string;
  quickSearchFields: readonly string[];
  rankingStrategy: SearchRankingStrategy;
  resultType?: SearchResultType;
  appKey?: string;
  indexPolicy?: SearchIndexPolicy;
  rankingPolicy?: Partial<SearchRankingPolicy>;
  permissionPolicy?: SearchPermissionPolicy;
}>;

export type SearchableEntity = SearchableEntityDefinition;

export type SearchQuery = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  appKey?: string | null;
  term: string;
  moduleKeys?: readonly string[];
  resultTypes?: readonly SearchResultType[];
  limit?: number;
  cursor?: string | null;
  pageSize?: number;
  locale?: "ar" | "en";
}>;

export type NormalizedSearchQuery = SearchQuery &
  Readonly<{
    normalizedTerm: string;
    tokens: readonly string[];
    limit: number;
    pageSize: number;
  }>;

export type SearchContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience: AccessExperience;
  appKey?: string | null;
  grantedPermissions?: ReadonlySet<PermissionKey>;
  recentEntityIds?: readonly string[];
  favoriteEntityIds?: readonly string[];
  frequentlyUsedEntityIds?: readonly string[];
  appPriorities?: Readonly<Record<string, number>>;
  entityPriorities?: Readonly<Record<string, number>>;
}>;

export type SearchResult = Readonly<{
  moduleKey: string;
  entityType: string;
  entityId: string;
  type?: SearchResultType;
  title: string;
  subtitle?: string;
  href?: string;
  commandKey?: string;
  rank: number;
  requiredPermissions?: readonly PermissionKey[];
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  appKey?: string | null;
  sensitivity?: SearchSensitivity;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type SearchProvider = Readonly<{
  key: string;
  moduleKey: string;
  entityTypes: readonly string[];
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly PermissionKey[];
  source?: SearchProviderSource;
  appKey?: string;
  supportedExperiences?: readonly AccessExperience[];
  searchableEntities?: readonly SearchableEntity[];
  indexPolicy?: SearchIndexPolicy;
  rankingPolicy?: Partial<SearchRankingPolicy>;
  permissionPolicy?: SearchPermissionPolicy;
  search?: (query: NormalizedSearchQuery, context: SearchContext) => readonly SearchResult[] | Promise<readonly SearchResult[]>;
}>;

export type SearchProviderRegistry = Readonly<{
  providers: readonly SearchProvider[];
}>;

export type SearchProviderValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type SearchPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  nextCursor?: string | null;
  pageSize: number;
}>;

export const DEFAULT_SEARCH_RANKING_POLICY: SearchRankingPolicy = {
  appPriorityBoost: 5,
  entityPriorityBoost: 5,
  exactMatchBoost: 100,
  favoriteBoost: 20,
  frequentlyUsedBoost: 10,
  fuzzyMatchBoost: 20,
  prefixMatchBoost: 50,
  recentBoost: 15,
};

export function defineSearchProvider<TProvider extends SearchProvider>(
  provider: TProvider,
): TProvider {
  const validation = validateSearchProvider(provider);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return provider;
}

export function validateSearchProvider(provider: SearchProvider): SearchProviderValidationResult {
  const errors: string[] = [];

  if (!provider.key.trim()) {
    errors.push("Search provider key is required.");
  }

  if (!provider.moduleKey.trim()) {
    errors.push("Search provider module key is required.");
  }

  if (provider.entityTypes.length === 0) {
    errors.push("Search provider must expose at least one entity type.");
  }

  for (const duplicate of findDuplicates(provider.entityTypes)) {
    errors.push(`Duplicate search provider entity type: ${duplicate}`);
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createSearchProviderRegistry(
  providers: readonly SearchProvider[] = [],
): SearchProviderRegistry {
  return {
    providers: dedupeProviders(providers),
  };
}

export function registerSearchProvider(
  registry: SearchProviderRegistry,
  provider: SearchProvider,
): SearchProviderRegistry {
  defineSearchProvider(provider);

  return createSearchProviderRegistry([
    ...registry.providers.filter((candidate) => candidate.key !== provider.key),
    provider,
  ]);
}

export function unregisterSearchProvider(
  registry: SearchProviderRegistry,
  providerKey: string,
): SearchProviderRegistry {
  return createSearchProviderRegistry(
    registry.providers.filter((provider) => provider.key !== providerKey),
  );
}

export function listSearchProviders(
  registry: SearchProviderRegistry,
  filters: Readonly<{
    source?: SearchProviderSource;
    experience?: AccessExperience;
    appKey?: string;
  }> = {},
): readonly SearchProvider[] {
  return registry.providers.filter((provider) =>
    (!filters.source || provider.source === filters.source)
    && (!filters.experience || !provider.supportedExperiences || provider.supportedExperiences.includes(filters.experience))
    && (!filters.appKey || !provider.appKey || provider.appKey === filters.appKey),
  );
}

export function discoverSearchableEntities(
  registry: SearchProviderRegistry,
  filters: Readonly<{
    source?: SearchProviderSource;
    resultType?: SearchResultType;
    appKey?: string;
  }> = {},
): readonly SearchableEntity[] {
  return registry.providers
    .filter((provider) => !filters.source || provider.source === filters.source)
    .filter((provider) => !filters.appKey || provider.appKey === filters.appKey)
    .flatMap((provider) =>
      provider.searchableEntities
        ?? provider.entityTypes.map((entityType) => ({
          displayName: entityType,
          entityType,
          moduleKey: provider.moduleKey,
          quickSearchFields: [],
          rankingStrategy: "weighted" as const,
          resultType: "record" as const,
        })),
    )
    .filter((entity) => !filters.resultType || entity.resultType === filters.resultType);
}

export function normalizeSearchQuery(
  query: SearchQuery,
  options: Readonly<{
    minLength?: number;
    maxLimit?: number;
    defaultLimit?: number;
  }> = {},
): NormalizedSearchQuery {
  const normalizedTerm = query.term.trim().toLowerCase().replace(/\s+/g, " ");
  const minLength = options.minLength ?? 2;
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 50;
  const limit = clampSearchLimit(query.limit ?? query.pageSize ?? defaultLimit, maxLimit);
  const tokens = normalizedTerm.length >= minLength ? tokenizeSearchTerm(normalizedTerm) : [];

  return {
    ...query,
    limit,
    normalizedTerm,
    pageSize: clampSearchLimit(query.pageSize ?? limit, maxLimit),
    tokens,
  };
}

export function tokenizeSearchTerm(term: string): readonly string[] {
  return term
    .split(/[\s,،؛;]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function clampSearchLimit(value: number, maxLimit = 50): number {
  if (!Number.isFinite(value) || value < 1) {
    return 20;
  }

  return Math.min(Math.floor(value), maxLimit);
}

export function filterSearchResultsForContext(
  results: readonly SearchResult[],
  context: SearchContext,
): readonly SearchResult[] {
  return results.filter((result) =>
    (!result.tenantId || result.tenantId === context.tenantId)
    && (!result.companyId || result.companyId === context.companyId)
    && (!result.branchId || result.branchId === context.branchId)
    && (!result.experience || result.experience === context.experience)
    && (!result.appKey || !context.appKey || result.appKey === context.appKey)
    && hasSearchPermissions(result.requiredPermissions, context.grantedPermissions),
  );
}

export function rankSearchResults(
  results: readonly SearchResult[],
  query: NormalizedSearchQuery,
  context: SearchContext,
  policy: Partial<SearchRankingPolicy> = {},
): readonly SearchResult[] {
  const rankingPolicy = {
    ...DEFAULT_SEARCH_RANKING_POLICY,
    ...policy,
  };

  return [...results]
    .map((result) => ({
      ...result,
      rank: result.rank + scoreSearchResult(result, query, context, rankingPolicy),
    }))
    .sort((left, right) => right.rank - left.rank || left.title.localeCompare(right.title));
}

export async function executeSearch(
  registry: SearchProviderRegistry,
  query: SearchQuery,
  context: SearchContext,
): Promise<SearchPage<SearchResult>> {
  const normalizedQuery = normalizeSearchQuery(query);
  const providers = listSearchProviders(registry, {
    appKey: context.appKey ?? undefined,
    experience: context.experience,
  });
  const providerResults = await Promise.all(providers.map(async (provider) => {
    if (!provider.search) {
      return [];
    }

    if (!isSearchProviderAllowed(provider, context)) {
      return [];
    }

    return provider.search(normalizedQuery, context);
  }));
  const filtered = filterSearchResultsForContext(providerResults.flat(), context);
  const ranked = rankSearchResults(filtered, normalizedQuery, context);

  return {
    nextCursor: ranked.length > normalizedQuery.pageSize ? String(normalizedQuery.pageSize) : null,
    pageSize: normalizedQuery.pageSize,
    records: ranked.slice(0, normalizedQuery.pageSize),
  };
}

export function createCommandSearchProvider(
  commands: readonly CommandDefinition[],
): SearchProvider {
  return defineSearchProvider({
    entityTypes: ["command"],
    key: "platform.commands",
    moduleKey: "platform",
    searchableEntities: [{
      displayName: "Commands",
      entityType: "command",
      moduleKey: "platform",
      quickSearchFields: ["label", "description"],
      rankingStrategy: "exact-first",
      resultType: "command",
    }],
    source: "command",
    search: (query, context) => commands
      .filter((command) => !command.supportedExperiences || command.supportedExperiences.includes(context.experience))
      .filter((command) => !command.requiredPermission || context.grantedPermissions?.has(command.requiredPermission))
      .filter((command) => matchesSearchText(query, command.label, command.description))
      .map((command) => ({
        appKey: command.appKey,
        commandKey: command.key,
        entityId: command.key,
        entityType: "command",
        moduleKey: "platform",
        rank: 0,
        requiredPermissions: command.requiredPermission ? [command.requiredPermission] : [],
        title: command.label,
        type: "command",
      })),
  });
}

export function createNavigationSearchProvider(
  navigation: readonly NavigationContribution[],
): SearchProvider {
  return defineSearchProvider({
    entityTypes: ["navigation"],
    key: "platform.navigation",
    moduleKey: "platform",
    searchableEntities: [{
      displayName: "Navigation",
      entityType: "navigation",
      moduleKey: "platform",
      quickSearchFields: ["label"],
      rankingStrategy: "exact-first",
      resultType: "navigation",
    }],
    source: "navigation",
    search: (query, context) => navigation
      .filter((item) => !item.supportedExperiences || item.supportedExperiences.includes(context.experience))
      .filter((item) => !item.requiredPermission || context.grantedPermissions?.has(item.requiredPermission))
      .filter((item) => matchesSearchText(query, item.label))
      .map((item) => ({
        appKey: item.appKey,
        entityId: item.key,
        entityType: "navigation",
        href: item.href,
        moduleKey: "platform",
        rank: 0,
        requiredPermissions: item.requiredPermission ? [item.requiredPermission] : [],
        title: item.label,
        type: "navigation",
      })),
  });
}

export function createDocumentSearchProviderContract(
  documentType: DocumentType | string,
  moduleKey: string,
  requiredPermissions: readonly PermissionKey[] = [],
): SearchProvider {
  return defineSearchProvider({
    entityTypes: [String(documentType)],
    key: `${moduleKey}.${String(documentType)}.documents`,
    moduleKey,
    requiredPermissions,
    searchableEntities: [{
      displayName: String(documentType),
      entityType: String(documentType),
      moduleKey,
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions,
        sensitivity: "internal",
      },
      quickSearchFields: ["documentNumber", "title", "status"],
      rankingStrategy: "weighted",
      resultType: "document",
    }],
    source: "document",
  });
}

export function createPartySearchProviderContract(
  roleTypes: readonly PartyRoleType[] = [],
  requiredPermissions: readonly PermissionKey[] = [],
): SearchProvider {
  return defineSearchProvider({
    entityTypes: ["party"],
    key: "platform.party.search",
    moduleKey: "party",
    requiredPermissions,
    searchableEntities: [{
      displayName: "Parties",
      entityType: "party",
      moduleKey: "party",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions,
        sensitivity: "sensitive",
      },
      quickSearchFields: ["displayName", "legalName", "partyNumber", ...roleTypes],
      rankingStrategy: "weighted",
      resultType: "party",
    }],
    source: "party",
  });
}

function isSearchProviderAllowed(provider: SearchProvider, context: SearchContext): boolean {
  return (!provider.supportedExperiences || provider.supportedExperiences.includes(context.experience))
    && (!provider.appKey || !context.appKey || provider.appKey === context.appKey)
    && hasSearchPermissions(provider.requiredPermissions, context.grantedPermissions)
    && (!provider.requiredPermission || Boolean(context.grantedPermissions?.has(provider.requiredPermission as PermissionKey)));
}

function hasSearchPermissions(
  requiredPermissions: readonly (PermissionKey | string)[] | undefined,
  grantedPermissions: ReadonlySet<PermissionKey> | undefined,
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  if (!grantedPermissions) {
    return false;
  }

  return requiredPermissions.every((permission) => grantedPermissions.has(permission as PermissionKey));
}

function scoreSearchResult(
  result: SearchResult,
  query: NormalizedSearchQuery,
  context: SearchContext,
  policy: SearchRankingPolicy,
): number {
  const title = result.title.toLowerCase();
  const exact = title === query.normalizedTerm ? policy.exactMatchBoost : 0;
  const prefix = title.startsWith(query.normalizedTerm) ? policy.prefixMatchBoost : 0;
  const fuzzy = query.tokens.some((token) => title.includes(token)) ? policy.fuzzyMatchBoost : 0;
  const recent = context.recentEntityIds?.includes(result.entityId) ? policy.recentBoost : 0;
  const favorite = context.favoriteEntityIds?.includes(result.entityId) ? policy.favoriteBoost : 0;
  const frequent = context.frequentlyUsedEntityIds?.includes(result.entityId) ? policy.frequentlyUsedBoost : 0;
  const appPriority = result.appKey ? (context.appPriorities?.[result.appKey] ?? 0) * policy.appPriorityBoost : 0;
  const entityPriority = (context.entityPriorities?.[result.entityType] ?? 0) * policy.entityPriorityBoost;

  return exact + prefix + fuzzy + recent + favorite + frequent + appPriority + entityPriority;
}

function matchesSearchText(
  query: NormalizedSearchQuery,
  ...values: readonly (string | undefined)[]
): boolean {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();

  return query.tokens.length === 0
    ? false
    : query.tokens.every((token) => haystack.includes(token));
}

function dedupeProviders(providers: readonly SearchProvider[]): readonly SearchProvider[] {
  const byKey = new Map<string, SearchProvider>();

  for (const provider of providers) {
    byKey.set(provider.key, provider);
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
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
