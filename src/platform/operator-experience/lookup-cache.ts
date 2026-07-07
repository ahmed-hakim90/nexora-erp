import type { OxLookupOption } from "./public-api";
import { createLookupScopeKey, type OxLookupPage, type OxLookupScope } from "./lookup-runtime";

export type OxLookupCacheEntry = Readonly<{
  page: OxLookupPage;
  expiresAt: number;
}>;

export type OxLookupSessionCache = Readonly<{
  search: Map<string, OxLookupCacheEntry>;
  selected: Map<string, OxLookupOption>;
  stats: OxLookupCacheStats;
}>;

export type OxLookupCacheStats = {
  searchHits: number;
  searchMisses: number;
  selectedHits: number;
  selectedMisses: number;
  evictions: number;
};

export const OX_LOOKUP_CACHE_TTL_MS = 60_000;
export const OX_LOOKUP_SELECTED_CACHE_TTL_MS = 300_000;
export const OX_LOOKUP_CACHE_MAX_SEARCH_ENTRIES = 500;
export const OX_LOOKUP_CACHE_MAX_SELECTED_ENTRIES = 1000;

export function createLookupSessionCache(): OxLookupSessionCache {
  return {
    search: new Map(),
    selected: new Map(),
    stats: {
      evictions: 0,
      searchHits: 0,
      searchMisses: 0,
      selectedHits: 0,
      selectedMisses: 0,
    },
  };
}

function createSearchCacheKey(
  scope: OxLookupScope,
  providerKey: string,
  term: string | null,
  cursor: string | null,
  pageSize: number,
): string {
  return `${createLookupScopeKey(scope, providerKey)}:search:${term ?? ""}:${cursor ?? ""}:${pageSize}`;
}

function createSelectedCacheKey(scope: OxLookupScope, providerKey: string, id: string): string {
  return `${createLookupScopeKey(scope, providerKey)}:selected:${id}`;
}

function touchStats(
  cache: OxLookupSessionCache,
  patch: Partial<OxLookupCacheStats>,
): OxLookupCacheStats {
  const next = { ...cache.stats, ...patch };
  Object.assign(cache.stats, next);
  return next;
}

function enforceSearchCacheLimit(cache: OxLookupSessionCache): void {
  while (cache.search.size > OX_LOOKUP_CACHE_MAX_SEARCH_ENTRIES) {
    const oldestKey = cache.search.keys().next().value;
    if (!oldestKey) break;
    cache.search.delete(oldestKey);
    touchStats(cache, { evictions: cache.stats.evictions + 1 });
  }
}

function enforceSelectedCacheLimit(cache: OxLookupSessionCache): void {
  while (cache.selected.size > OX_LOOKUP_CACHE_MAX_SELECTED_ENTRIES) {
    const oldestKey = cache.selected.keys().next().value;
    if (!oldestKey) break;
    cache.selected.delete(oldestKey);
    touchStats(cache, { evictions: cache.stats.evictions + 1 });
  }
}

export function readLookupSearchCache(
  cache: OxLookupSessionCache,
  scope: OxLookupScope,
  providerKey: string,
  term: string | null,
  cursor: string | null,
  pageSize: number,
  now = Date.now(),
): OxLookupPage | null {
  const key = createSearchCacheKey(scope, providerKey, term, cursor, pageSize);
  const entry = cache.search.get(key);
  if (!entry || entry.expiresAt <= now) {
    cache.search.delete(key);
    touchStats(cache, { searchMisses: cache.stats.searchMisses + 1 });
    return null;
  }
  touchStats(cache, { searchHits: cache.stats.searchHits + 1 });
  return { ...entry.page, fromCache: true };
}

export function writeLookupSearchCache(
  cache: OxLookupSessionCache,
  scope: OxLookupScope,
  providerKey: string,
  term: string | null,
  cursor: string | null,
  pageSize: number,
  page: OxLookupPage,
  ttlMs = OX_LOOKUP_CACHE_TTL_MS,
  now = Date.now(),
): void {
  const key = createSearchCacheKey(scope, providerKey, term, cursor, pageSize);
  cache.search.set(key, { expiresAt: now + ttlMs, page });
  enforceSearchCacheLimit(cache);
}

export function readLookupSelectedCache(
  cache: OxLookupSessionCache,
  scope: OxLookupScope,
  providerKey: string,
  id: string,
): OxLookupOption | null {
  const key = createSelectedCacheKey(scope, providerKey, id);
  const value = cache.selected.get(key) ?? null;
  touchStats(cache, value ? { selectedHits: cache.stats.selectedHits + 1 } : { selectedMisses: cache.stats.selectedMisses + 1 });
  return value;
}

export function writeLookupSelectedCache(
  cache: OxLookupSessionCache,
  scope: OxLookupScope,
  providerKey: string,
  options: readonly OxLookupOption[],
): void {
  for (const option of options) {
    const key = createSelectedCacheKey(scope, providerKey, option.id);
    cache.selected.set(key, option);
  }
  enforceSelectedCacheLimit(cache);
}

export function pruneLookupSessionCache(
  cache: OxLookupSessionCache,
  now = Date.now(),
): void {
  for (const [key, entry] of cache.search.entries()) {
    if (entry.expiresAt <= now) {
      cache.search.delete(key);
      touchStats(cache, { evictions: cache.stats.evictions + 1 });
    }
  }
}

export function getLookupCacheHitRatio(cache: OxLookupSessionCache): number {
  const total = cache.stats.searchHits + cache.stats.searchMisses;
  if (total === 0) return 0;
  return cache.stats.searchHits / total;
}

export function resetLookupCacheStats(cache: OxLookupSessionCache): OxLookupCacheStats {
  cache.stats.searchHits = 0;
  cache.stats.searchMisses = 0;
  cache.stats.selectedHits = 0;
  cache.stats.selectedMisses = 0;
  cache.stats.evictions = 0;
  return cache.stats;
}
