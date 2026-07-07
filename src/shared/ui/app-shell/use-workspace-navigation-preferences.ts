"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  WorkspaceNavigationItem,
  WorkspaceNavigationPreferences,
  WorkspaceNavigationRecentEntry,
} from "./workspace-navigation.types";
import { workspaceNavigationStorageKey } from "./workspace-navigation.utils";

const RECENT_LIMIT = 8;
const EMPTY_PREFERENCES: WorkspaceNavigationPreferences = {
  expandedGroupKeys: [],
  favoriteKeys: [],
  recentKeys: [],
};

export function useWorkspaceNavigationPreferences(
  workspaceKey: string,
): Readonly<{
  preferences: WorkspaceNavigationPreferences;
  toggleFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  recordRecent: (item: WorkspaceNavigationItem) => void;
  recentItems: readonly WorkspaceNavigationRecentEntry[];
  toggleGroupExpanded: (groupKey: string) => void;
  isGroupExpanded: (groupKey: string, defaultExpanded?: boolean) => boolean;
}> {
  const storageKey = workspaceNavigationStorageKey(workspaceKey);
  const [preferences, setPreferences] = useState<WorkspaceNavigationPreferences>(() =>
    readPreferences(storageKey),
  );

  useEffect(() => {
    writePreferences(storageKey, preferences);
  }, [preferences, storageKey]);

  const toggleFavorite = useCallback((itemId: string) => {
    setPreferences((current) => ({
      ...current,
      favoriteKeys: toggleString(current.favoriteKeys, itemId),
    }));
  }, []);

  const isFavorite = useCallback(
    (itemId: string) => preferences.favoriteKeys.includes(itemId),
    [preferences.favoriteKeys],
  );

  const recordRecent = useCallback((item: WorkspaceNavigationItem) => {
    const entry: WorkspaceNavigationRecentEntry = {
      id: item.id,
      openedAt: new Date().toISOString(),
      route: item.route,
      title: item.title,
    };
    setPreferences((current) => ({
      ...current,
      recentKeys: [
        entry,
        ...current.recentKeys.filter((recent) => recent.id !== item.id),
      ].slice(0, RECENT_LIMIT),
    }));
  }, []);

  const toggleGroupExpanded = useCallback((groupKey: string) => {
    setPreferences((current) => {
      const collapsedMarker = `!${groupKey}`;
      if (current.expandedGroupKeys.includes(groupKey)) {
        return {
          ...current,
          expandedGroupKeys: [
            ...current.expandedGroupKeys.filter((key) => key !== groupKey),
            collapsedMarker,
          ],
        };
      }
      if (current.expandedGroupKeys.includes(collapsedMarker)) {
        return {
          ...current,
          expandedGroupKeys: current.expandedGroupKeys.filter((key) => key !== collapsedMarker),
        };
      }
      return {
        ...current,
        expandedGroupKeys: [...current.expandedGroupKeys, collapsedMarker],
      };
    });
  }, []);

  const isGroupExpanded = useCallback(
    (groupKey: string, defaultExpanded = true) => {
      if (preferences.expandedGroupKeys.includes(`!${groupKey}`)) {
        return false;
      }
      if (preferences.expandedGroupKeys.includes(groupKey)) {
        return true;
      }
      return defaultExpanded;
    },
    [preferences.expandedGroupKeys],
  );

  const recentItems = useMemo(() => preferences.recentKeys, [preferences.recentKeys]);

  return {
    isFavorite,
    isGroupExpanded,
    preferences,
    recentItems,
    recordRecent,
    toggleFavorite,
    toggleGroupExpanded,
  };
}

function readPreferences(storageKey: string): WorkspaceNavigationPreferences {
  if (typeof window === "undefined") {
    return EMPTY_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return EMPTY_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<WorkspaceNavigationPreferences>;
    return {
      expandedGroupKeys: readStringArray(parsed.expandedGroupKeys),
      favoriteKeys: readStringArray(parsed.favoriteKeys),
      recentKeys: readRecentEntries(parsed.recentKeys),
    };
  } catch {
    return EMPTY_PREFERENCES;
  }
}

function writePreferences(
  storageKey: string,
  preferences: WorkspaceNavigationPreferences,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Ignore quota errors — navigation still works without persistence.
  }
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readRecentEntries(value: unknown): readonly WorkspaceNavigationRecentEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry !== "object"
      || entry === null
      || typeof (entry as WorkspaceNavigationRecentEntry).id !== "string"
      || typeof (entry as WorkspaceNavigationRecentEntry).title !== "string"
      || typeof (entry as WorkspaceNavigationRecentEntry).route !== "string"
    ) {
      return [];
    }
    const recent = entry as WorkspaceNavigationRecentEntry;
    return [
      {
        id: recent.id,
        openedAt: typeof recent.openedAt === "string" ? recent.openedAt : new Date().toISOString(),
        route: recent.route,
        title: recent.title,
      },
    ];
  });
}

function toggleString(values: readonly string[], value: string): readonly string[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
