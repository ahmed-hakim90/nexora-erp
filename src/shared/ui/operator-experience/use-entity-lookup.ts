"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  lookupOptionToEntityLookupOption,
  OX_LOOKUP_DEFAULT_DEBOUNCE_MS,
} from "@/platform/operator-experience/lookup-runtime";
import type { OxLookupOption } from "@/platform/operator-experience/public-api";
import type { EntityLookupOption } from "@/shared/ui/primitives/entity-lookup";

const RECENT_LOOKUP_STORAGE_KEY = "nexora.lookup.recent";

type LookupApiResponse = Readonly<{
  options?: readonly OxLookupOption[];
  hydrated?: readonly OxLookupOption[];
  nextCursor?: string | null;
  rejectedRawIdentifier?: boolean;
  minSearchLength?: number;
  fromCache?: boolean;
}>;

function readRecentIds(providerKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_LOOKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed[providerKey] ?? [];
  } catch {
    return [];
  }
}

function writeRecentId(providerKey: string, id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const raw = window.sessionStorage.getItem(RECENT_LOOKUP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    const current = parsed[providerKey] ?? [];
    parsed[providerKey] = [id, ...current.filter((item) => item !== id)].slice(0, 8);
    window.sessionStorage.setItem(RECENT_LOOKUP_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures.
  }
}

export function useEntityLookup(input: Readonly<{
  providerKey: string;
  value?: string;
  debounceMs?: number;
  recentIds?: readonly string[];
  favoriteIds?: readonly string[];
}>) {
  const [options, setOptions] = useState<EntityLookupOption[]>([]);
  const [hydratedOption, setHydratedOption] = useState<EntityLookupOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rejectedRawIdentifier, setRejectedRawIdentifier] = useState(false);
  const [minSearchLength, setMinSearchLength] = useState(2);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const recentOptionIds = useMemo(
    () => [...(input.recentIds ?? []), ...readRecentIds(input.providerKey)],
    [input.providerKey, input.recentIds],
  );

  const fetchLookup = useCallback(async (params: Readonly<{
    term?: string;
    cursor?: string | null;
    hydrate?: readonly string[];
    append?: boolean;
    mode?: "manual" | "barcode" | "qr";
  }>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (params.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const url = new URL(`/api/lookup/${encodeURIComponent(input.providerKey)}`, window.location.origin);
      if (params.term) url.searchParams.set("term", params.term);
      if (params.cursor) url.searchParams.set("cursor", params.cursor);
      if (params.mode) url.searchParams.set("mode", params.mode);
      if (params.hydrate?.length) url.searchParams.set("hydrate", params.hydrate.join(","));
      if (recentOptionIds.length) url.searchParams.set("recent", recentOptionIds.join(","));
      if (input.favoriteIds?.length) url.searchParams.set("favorites", input.favoriteIds.join(","));

      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        if (!params.append) setOptions([]);
        return;
      }

      const payload = await response.json() as LookupApiResponse;
      setRejectedRawIdentifier(Boolean(payload.rejectedRawIdentifier));
      setMinSearchLength(payload.minSearchLength ?? 2);
      setNextCursor(payload.nextCursor ?? null);

      const mapped = (payload.hydrated ?? payload.options ?? [])
        .map((option) => lookupOptionToEntityLookupOption(option));

      if (params.hydrate?.length && mapped[0]) {
        setHydratedOption(mapped[0]);
      }

      setOptions((current) => {
        if (params.append) {
          const seen = new Set(current.map((option) => option.id));
          return [...current, ...mapped.filter((option) => !seen.has(option.id))];
        }
        return mapped;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!params.append) setOptions([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [input.favoriteIds, input.providerKey, recentOptionIds]);

  useEffect(() => {
    if (!input.value) return;
    if (options.some((option) => option.id === input.value)) return;
    if (hydratedOption?.id === input.value) return;
    // Hydration fetch updates selection asynchronously after the selected id changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lookup hydration is intentionally tied to value changes
    void fetchLookup({ hydrate: [input.value] });
  }, [fetchLookup, hydratedOption?.id, input.value, options]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  const onSearchChange = useCallback((query: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void fetchLookup({ term: query.trim() || undefined });
    }, input.debounceMs ?? OX_LOOKUP_DEFAULT_DEBOUNCE_MS);
  }, [fetchLookup, input.debounceMs]);

  const onValueChange = useCallback((nextValue: string) => {
    if (nextValue) writeRecentId(input.providerKey, nextValue);
    if (!nextValue) setHydratedOption(null);
  }, [input.providerKey]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    void fetchLookup({ append: true, cursor: nextCursor });
  }, [fetchLookup, loadingMore, nextCursor]);

  const mergedOptions = useMemo(() => {
    const selected = input.value
      ? options.find((option) => option.id === input.value) ?? (hydratedOption?.id === input.value ? hydratedOption : null)
      : null;
    if (!selected) return options;
    if (options.some((option) => option.id === selected.id)) return options;
    return [selected, ...options];
  }, [hydratedOption, input.value, options]);

  return {
    emptyMessage: rejectedRawIdentifier
      ? "Search by business code or name, not raw system identifiers."
      : minSearchLength > 0
        ? `Type at least ${minSearchLength} characters to search.`
        : "No matches found.",
    hasMore: Boolean(nextCursor),
    loadMore,
    loading,
    loadingMore,
    minSearchLength,
    onSearchChange,
    onValueChange,
    options: mergedOptions,
    recentOptionIds,
  };
}

export async function resolveLookupScan(providerKey: string, term: string) {
  const response = await fetch(`/api/lookup/${encodeURIComponent(providerKey)}`, {
    body: JSON.stringify({ term }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return null;
  const payload = await response.json() as { option?: OxLookupOption };
  return payload.option ?? null;
}
