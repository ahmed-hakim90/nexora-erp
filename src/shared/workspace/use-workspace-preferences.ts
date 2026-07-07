"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const PREFERENCES_SYNC_EVENT = "nexora:workspace-preferences";
const SAVE_DEBOUNCE_MS = 500;

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

export type UseWorkspacePreferencesOptions = Readonly<{
  databasePersisted?: boolean;
  initialPreferences?: WorkspacePreferences | null;
  storageKey?: string;
  syncRemote?: boolean;
}>;

export function useWorkspacePreferences(
  options: string | UseWorkspacePreferencesOptions = WORKSPACE_STORAGE_KEY,
): readonly [WorkspacePreferences, WorkspacePreferenceActions] {
  const config = typeof options === "string" ? { storageKey: options } : options;
  const storageKey = config.storageKey ?? WORKSPACE_STORAGE_KEY;
  const syncRemote = config.syncRemote ?? true;
  const databasePersisted = config.databasePersisted ?? false;
  const initialServerPreferences = normalizeWorkspacePreferences(config.initialPreferences);
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() =>
    createInitialPreferences({
      databasePersisted,
      initialPreferences: initialServerPreferences,
      storageKey,
    }),
  );
  const currentSerializedRef = useRef(JSON.stringify(preferences));
  const incomingEventSerializedRef = useRef<string | null>(null);
  const skipNextRemoteSaveRef = useRef(false);
  const lastSavedSerializedRef = useRef(
    databasePersisted || !hasWorkspacePreferencesData(preferences)
      ? JSON.stringify(preferences)
      : JSON.stringify(initialServerPreferences),
  );

  useEffect(() => {
    const serialized = JSON.stringify(preferences);

    currentSerializedRef.current = serialized;
    writePreferences(storageKey, preferences);

    if (incomingEventSerializedRef.current === serialized) {
      incomingEventSerializedRef.current = null;
      return;
    }

    window.dispatchEvent(
      new CustomEvent(PREFERENCES_SYNC_EVENT, {
        detail: {
          preferences,
          serialized,
          storageKey,
        },
      }),
    );
  }, [preferences, storageKey]);

  useEffect(() => {
    function handlePreferenceSync(event: Event) {
      if (!(event instanceof CustomEvent) || !event.detail || event.detail.storageKey !== storageKey) {
        return;
      }

      const next = normalizeWorkspacePreferences(event.detail.preferences);
      const serialized = JSON.stringify(next);

      if (serialized === currentSerializedRef.current) {
        return;
      }

      incomingEventSerializedRef.current = serialized;
      skipNextRemoteSaveRef.current = true;
      setPreferences(next);
    }

    window.addEventListener(PREFERENCES_SYNC_EVENT, handlePreferenceSync);

    return () => window.removeEventListener(PREFERENCES_SYNC_EVENT, handlePreferenceSync);
  }, [storageKey]);

  useEffect(() => {
    if (!syncRemote) {
      return;
    }

    const serialized = JSON.stringify(preferences);

    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false;
      lastSavedSerializedRef.current = serialized;
      return;
    }

    if (serialized === lastSavedSerializedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void savePreferences(preferences).then((saved) => {
        if (saved) {
          lastSavedSerializedRef.current = JSON.stringify(saved);
        }
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [preferences, syncRemote]);

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

function createInitialPreferences(options: Readonly<{
  databasePersisted: boolean;
  initialPreferences: WorkspacePreferences;
  storageKey: string;
}>): WorkspacePreferences {
  const storedPreferences = readPreferences(options.storageKey);

  if (!options.databasePersisted && hasWorkspacePreferencesData(storedPreferences)) {
    return storedPreferences;
  }

  if (options.databasePersisted || hasWorkspacePreferencesData(options.initialPreferences)) {
    return options.initialPreferences;
  }

  return storedPreferences;
}

function hasWorkspacePreferencesData(preferences: WorkspacePreferences): boolean {
  return (
    preferences.appOrder.length > 0
    || preferences.favoriteAppKeys.length > 0
    || preferences.hiddenAppKeys.length > 0
    || preferences.openWorkspaceAppKeys.length > 0
    || preferences.pinnedAppKeys.length > 0
    || preferences.recentApps.length > 0
    || preferences.recentDocuments.length > 0
  );
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

async function savePreferences(preferences: WorkspacePreferences): Promise<WorkspacePreferences | null> {
  try {
    const response = await fetch("/api/workspace/preferences", {
      body: JSON.stringify({ preferences }),
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { preferences?: unknown };

    return normalizeWorkspacePreferences(body.preferences);
  } catch {
    return null;
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
