export type ListQueryState = Readonly<Record<string, string | undefined>>;

export const MODAL_QUERY_KEYS = ["create", "edit"] as const;

export type ModalQueryKey = (typeof MODAL_QUERY_KEYS)[number];

/**
 * Merge list query params with overrides. Pass `null` to remove a key.
 */
export function buildListQueryHref(
  basePath: string,
  current: ListQueryState,
  overrides: Readonly<Record<string, string | null | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Strip modal query params while preserving list filters, search, and pagination.
 */
export function buildModalCloseHref(
  basePath: string,
  current: ListQueryState,
  keysToStrip: readonly string[] = MODAL_QUERY_KEYS,
): string {
  const strip = new Set(keysToStrip);
  const overrides: Record<string, null> = {};
  for (const key of Object.keys(current)) {
    if (strip.has(key)) overrides[key] = null;
  }
  return buildListQueryHref(basePath, current, overrides);
}

export function isModalCreateOpen(query: ListQueryState): boolean {
  return query.create === "1";
}

export function modalEditId(query: ListQueryState): string | undefined {
  return query.edit;
}
