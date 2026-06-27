export type SearchRankingStrategy = "exact-first" | "weighted" | "recent-first";
export type SearchResultType =
  | "record"
  | "navigation"
  | "command"
  | "report"
  | "dashboard"
  | "setting"
  | "document";

export type SearchableEntityDefinition = Readonly<{
  moduleKey: string;
  entityType: string;
  displayName: string;
  quickSearchFields: readonly string[];
  rankingStrategy: SearchRankingStrategy;
}>;

export type SearchQuery = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  term: string;
  moduleKeys?: readonly string[];
  resultTypes?: readonly SearchResultType[];
  limit?: number;
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
}>;

export type SearchProvider = Readonly<{
  key: string;
  moduleKey: string;
  entityTypes: readonly string[];
  requiredPermission: string;
}>;

export function defineSearchProvider<TProvider extends SearchProvider>(
  provider: TProvider,
): TProvider {
  return provider;
}
