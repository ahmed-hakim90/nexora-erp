"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { WORKSPACE_STORAGE_KEY } from "./app-catalog";
import {
  EMPTY_WORKSPACE_PREFERENCES,
  closeWorkspaceApp,
  hideApp,
  normalizeWorkspacePreferences,
  recordRecentApp,
  recordRecentDocument,
  reorderApps,
  toggleFavoriteApp,
  togglePinnedApp,
  unhideApp,
  type WorkspacePreferences,
  type WorkspaceRecentApp,
  type WorkspaceRecentDocument,
} from "./preferences";

export type WorkspacePreferenceActions = Readonly<{
  toggleFavorite: (appKey: string) => void;
  togglePin: (appKey: string) => void;
  hide: (appKey: string) => void;
  unhide: (appKey: string) => void;
  reorder: (appKeys: readonly string[]) => void;
  recordAppOpen: (app: Omit<WorkspaceRecentApp, "openedAt"> & { openedAt?: string }) => void;
  recordDocumentOpen: (
    document: Omit<WorkspaceRecentDocument, "openedAt"> & { openedAt?: string },
  ) => void;
  closeWorkspace: (appKey: string) => void;
  reset: () => void;
}>;

export function useWorkspacePreferences(
  storageKey = WORKSPACE_STORAGE_KEY,
): readonly [WorkspacePreferences, WorkspacePreferenceActions] {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() =>
    readPreferences(storageKey),
  );

  useEffect(() => {
    writePreferences(storageKey, preferences);
  }, [preferences, storageKey]);

  const update = useCallback(
    (reducer: (current: WorkspacePreferences) => WorkspacePreferences) => {
      setPreferences((current) => normalizeWorkspacePreferences(reducer(current)));
    },
    [],
  );

  const actions = useMemo<WorkspacePreferenceActions>(
    () => ({
      closeWorkspace: (appKey) => update((current) => closeWorkspaceApp(current, appKey)),
      hide: (appKey) => update((current) => hideApp(current, appKey)),
      recordAppOpen: (app) => update((current) => recordRecentApp(current, app)),
      recordDocumentOpen: (document) =>
        update((current) => recordRecentDocument(current, document)),
      reorder: (appKeys) => update((current) => reorderApps(current, appKeys)),
      reset: () => setPreferences(EMPTY_WORKSPACE_PREFERENCES),
      toggleFavorite: (appKey) => update((current) => toggleFavoriteApp(current, appKey)),
      togglePin: (appKey) => update((current) => togglePinnedApp(current, appKey)),
      unhide: (appKey) => update((current) => unhideApp(current, appKey)),
    }),
    [update],
  );

  return [preferences, actions];
}

function readPreferences(storageKey: string): WorkspacePreferences {
  if (typeof window === "undefined") {
    return EMPTY_WORKSPACE_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return EMPTY_WORKSPACE_PREFERENCES;
    }

    return normalizeWorkspacePreferences(JSON.parse(raw));
  } catch {
    return EMPTY_WORKSPACE_PREFERENCES;
  }
}

function writePreferences(storageKey: string, preferences: WorkspacePreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Preferences are a progressive enhancement. If storage is full or blocked,
    // keep the workspace usable with in-memory state for the current session.
  }
}
