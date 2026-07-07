import type { SearchResult } from "@/platform/search/public-api";

import {
  createOxLookupQuery,
  normalizeOxLookupOption,
  type OxLookupOption,
  type OxLookupProviderContract,
  type OxLookupQuery,
} from "./public-api";

export const OX_LOOKUP_DEFAULT_PAGE_SIZE = 25;
export const OX_LOOKUP_MAX_PAGE_SIZE = 100;
export const OX_LOOKUP_DEFAULT_DEBOUNCE_MS = 300;

export type OxLookupScope = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  permissionFingerprint?: string | null;
}>;

export type OxLookupRequest = Readonly<{
  providerKey: string;
  term?: string | null;
  mode?: OxLookupQuery["mode"];
  cursor?: string | null;
  pageSize?: number;
  hydrateIds?: readonly string[];
  recentIds?: readonly string[];
  favoriteIds?: readonly string[];
}>;

export type OxLookupPage = Readonly<{
  options: readonly OxLookupOption[];
  nextCursor: string | null;
  pageSize: number;
  rejectedRawIdentifier: boolean;
  minSearchLength: number;
  fromCache?: boolean;
}>;

export type OxLookupCursor = Readonly<{
  sortKey: string;
  id: string;
}>;

export type OxLookupExecutor = Readonly<{
  search: (input: OxLookupSearchInput) => Promise<OxLookupPage>;
  hydrate?: (input: OxLookupHydrateInput) => Promise<readonly OxLookupOption[]>;
}>;

export type OxLookupSearchInput = Readonly<{
  scope: OxLookupScope;
  provider: OxLookupProviderContract;
  query: OxLookupQuery;
  cursor: OxLookupCursor | null;
  pageSize: number;
  recentIds: readonly string[];
  favoriteIds: readonly string[];
}>;

export type OxLookupHydrateInput = Readonly<{
  scope: OxLookupScope;
  provider: OxLookupProviderContract;
  ids: readonly string[];
}>;

export type OxLookupProviderRegistry = Readonly<{
  providers: Readonly<Record<string, OxLookupProviderContract>>;
  executors: Readonly<Record<string, OxLookupExecutor>>;
}>;

export function createLookupProviderRegistry(
  providers: readonly OxLookupProviderContract[],
  executors: Readonly<Record<string, OxLookupExecutor>>,
): OxLookupProviderRegistry {
  const providerMap: Record<string, OxLookupProviderContract> = {};
  for (const provider of providers) {
    providerMap[provider.key] = provider;
  }
  return { executors, providers: providerMap };
}

export function getLookupProvider(
  registry: OxLookupProviderRegistry,
  providerKey: string,
): OxLookupProviderContract | null {
  return registry.providers[providerKey] ?? null;
}

export function resolveBoundedLookupPageSize(
  requested: number | undefined,
  provider: OxLookupProviderContract,
): number {
  const fallback = provider.pageSize || OX_LOOKUP_DEFAULT_PAGE_SIZE;
  const value = requested ?? fallback;
  return Math.min(Math.max(value, 1), OX_LOOKUP_MAX_PAGE_SIZE);
}

export function createLookupScopeKey(scope: OxLookupScope, providerKey: string): string {
  return [
    scope.tenantId,
    scope.companyId ?? "",
    scope.branchId ?? "",
    scope.permissionFingerprint ?? "",
    providerKey,
  ].join(":");
}

export function encodeLookupCursor(cursor: OxLookupCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeLookupCursor(value: string | null | undefined): OxLookupCursor | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OxLookupCursor;
    if (!parsed?.id || !parsed?.sortKey) return null;
    return { id: String(parsed.id), sortKey: String(parsed.sortKey) };
  } catch {
    return null;
  }
}

export function searchResultToLookupOption(result: SearchResult): OxLookupOption | null {
  const businessCode = typeof result.metadata?.businessCode === "string" ? result.metadata.businessCode : null;
  const status = typeof result.metadata?.status === "string" ? result.metadata.status : null;
  const thumbnailUrl = typeof result.metadata?.thumbnailUrl === "string" ? result.metadata.thumbnailUrl : null;
  return normalizeOxLookupOption({
    businessCode,
    businessName: result.title,
    entityType: result.entityType,
    id: result.entityId,
    isFavorite: Boolean(result.metadata?.isFavorite),
    isRecent: Boolean(result.metadata?.isRecent),
    status,
    subtitle: result.subtitle ?? null,
    thumbnailUrl,
  });
}

export function lookupOptionToEntityLookupOption(option: OxLookupOption): Readonly<{
  id: string;
  label: string;
  subtitle?: string;
  meta?: string;
  metadata?: Readonly<Record<string, unknown>>;
  disabled?: boolean;
}> {
  return {
    disabled: option.disabled,
    id: option.id,
    label: option.businessName,
    meta: [option.businessCode, option.status].filter(Boolean).join(" · ") || undefined,
    metadata: option.metadata,
    subtitle: option.subtitle ?? option.businessCode ?? undefined,
  };
}

export function mergeLookupOptionsWithRecentsAndFavorites(
  options: readonly OxLookupOption[],
  recentIds: readonly string[],
  favoriteIds: readonly string[],
): readonly OxLookupOption[] {
  const recent = new Set(recentIds);
  const favorite = new Set(favoriteIds);
  const seen = new Set<string>();
  const merged: OxLookupOption[] = [];

  for (const option of options) {
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    merged.push({
      ...option,
      isFavorite: option.isFavorite || favorite.has(option.id),
      isRecent: option.isRecent || recent.has(option.id),
    });
  }

  return merged.sort((left, right) => {
    const leftScore = (left.isFavorite ? 2 : 0) + (left.isRecent ? 1 : 0);
    const rightScore = (right.isFavorite ? 2 : 0) + (right.isRecent ? 1 : 0);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return left.businessName.localeCompare(right.businessName);
  });
}

export function shouldExecuteLookupSearch(
  query: OxLookupQuery,
  hydrateIds: readonly string[],
): boolean {
  if (hydrateIds.length > 0) return false;
  if (query.rejectedRawIdentifier) return false;
  if (query.mode !== "manual") return Boolean(query.term);
  return Boolean(query.term);
}

export function createLookupSearchPage(
  rows: readonly OxLookupOption[],
  pageSize: number,
  getCursor: (option: OxLookupOption) => OxLookupCursor,
): OxLookupPage {
  const normalized = rows
    .map((row) => normalizeOxLookupOption(row))
    .filter((row): row is OxLookupOption => row !== null);
  const hasMore = normalized.length > pageSize;
  const options = normalized.slice(0, pageSize);
  const nextCursor = hasMore && options.length > 0 ? encodeLookupCursor(getCursor(options.at(-1)!)) : null;
  return {
    minSearchLength: 0,
    nextCursor,
    options,
    pageSize,
    rejectedRawIdentifier: false,
  };
}

export function paginateLookupOptions(
  options: readonly OxLookupOption[],
  pageSize: number,
  cursor: OxLookupCursor | null,
  getCursor: (option: OxLookupOption) => OxLookupCursor,
): OxLookupPage {
  const sorted = [...options].sort((left, right) => {
    const leftKey = getCursor(left).sortKey;
    const rightKey = getCursor(right).sortKey;
    if (leftKey !== rightKey) return leftKey.localeCompare(rightKey);
    return left.id.localeCompare(right.id);
  });

  const filtered = cursor
    ? sorted.filter((option) => {
        const key = getCursor(option);
        return key.sortKey > cursor.sortKey || (key.sortKey === cursor.sortKey && key.id > cursor.id);
      })
    : sorted;

  return createLookupSearchPage(filtered, pageSize, getCursor);
}

export function simulateLargeLookupDataset(
  count: number,
  entityType: string,
  prefix = "Record",
): readonly OxLookupOption[] {
  return Array.from({ length: count }, (_, index) => ({
    businessCode: `${prefix}-${String(index + 1).padStart(6, "0")}`,
    businessName: `${prefix} ${index + 1}`,
    entityType,
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    status: index % 7 === 0 ? "inactive" : "active",
    subtitle: `Simulated ${entityType} record`,
  }));
}

export async function executeLookupRequest(
  registry: OxLookupProviderRegistry,
  scope: OxLookupScope,
  request: OxLookupRequest,
): Promise<OxLookupPage & Readonly<{ hydrated?: readonly OxLookupOption[] }>> {
  const provider = getLookupProvider(registry, request.providerKey);
  if (!provider) {
    throw new Error(`Unknown lookup provider "${request.providerKey}".`);
  }

  const executor = registry.executors[request.providerKey];
  if (!executor) {
    throw new Error(`Lookup provider "${request.providerKey}" is not executable.`);
  }

  const pageSize = resolveBoundedLookupPageSize(request.pageSize, provider);
  const query = createOxLookupQuery(request.term ?? "", {
    minSearchLength: provider.minSearchLength,
    mode: request.mode ?? "manual",
  });
  const hydrateIds = request.hydrateIds ?? [];
  const recentIds = request.recentIds ?? [];
  const favoriteIds = request.favoriteIds ?? [];

  if (hydrateIds.length > 0 && executor.hydrate) {
    const hydrated = await executor.hydrate({
      ids: hydrateIds,
      provider,
      scope,
    });
    return {
      hydrated: mergeLookupOptionsWithRecentsAndFavorites(hydrated, recentIds, favoriteIds),
      minSearchLength: provider.minSearchLength,
      nextCursor: null,
      options: [],
      pageSize,
      rejectedRawIdentifier: false,
    };
  }

  if (!shouldExecuteLookupSearch(query, hydrateIds)) {
    return {
      minSearchLength: provider.minSearchLength,
      nextCursor: null,
      options: [],
      pageSize,
      rejectedRawIdentifier: query.rejectedRawIdentifier,
    };
  }

  const page = await executor.search({
    cursor: decodeLookupCursor(request.cursor),
    favoriteIds,
    pageSize,
    provider,
    query,
    recentIds,
    scope,
  });

  return {
    ...page,
    options: mergeLookupOptionsWithRecentsAndFavorites(page.options, recentIds, favoriteIds),
  };
}
