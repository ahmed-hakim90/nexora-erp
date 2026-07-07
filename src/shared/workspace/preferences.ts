const RECENT_LIMIT = 12;
const RECENT_DOCUMENT_LIMIT = 10;

export type WorkspaceRecentApp = Readonly<{
  appKey: string;
  href?: string;
  label: string;
  openedAt: string;
}>;

export type WorkspaceRecentDocument = Readonly<{
  key: string;
  title: string;
  type: string;
  href?: string;
  openedAt: string;
  sourceLabel?: string;
}>;

export type WorkspacePreferences = Readonly<{
  favoriteAppKeys: readonly string[];
  pinnedAppKeys: readonly string[];
  hiddenAppKeys: readonly string[];
  appOrder: readonly string[];
  recentApps: readonly WorkspaceRecentApp[];
  recentDocuments: readonly WorkspaceRecentDocument[];
  openWorkspaceAppKeys: readonly string[];
}>;

export const EMPTY_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  appOrder: [],
  favoriteAppKeys: [],
  hiddenAppKeys: [],
  openWorkspaceAppKeys: [],
  pinnedAppKeys: [],
  recentApps: [],
  recentDocuments: [],
};

export function normalizeWorkspacePreferences(preferences?: unknown): WorkspacePreferences {
  const input = isRecord(preferences) ? preferences : {};

  return {
    appOrder: dedupeStrings(readStringArray(input.appOrder)),
    favoriteAppKeys: dedupeStrings(readStringArray(input.favoriteAppKeys)),
    hiddenAppKeys: dedupeStrings(readStringArray(input.hiddenAppKeys)),
    openWorkspaceAppKeys: dedupeStrings(readStringArray(input.openWorkspaceAppKeys)),
    pinnedAppKeys: dedupeStrings(readStringArray(input.pinnedAppKeys)),
    recentApps: dedupeRecentApps(readRecentApps(input.recentApps)),
    recentDocuments: dedupeRecentDocuments(readRecentDocuments(input.recentDocuments)),
  };
}

export function toggleFavoriteApp(
  preferences: WorkspacePreferences,
  appKey: string,
): WorkspacePreferences {
  return {
    ...preferences,
    favoriteAppKeys: toggleString(preferences.favoriteAppKeys, appKey),
  };
}

export function togglePinnedApp(
  preferences: WorkspacePreferences,
  appKey: string,
): WorkspacePreferences {
  return {
    ...preferences,
    pinnedAppKeys: toggleString(preferences.pinnedAppKeys, appKey),
    openWorkspaceAppKeys: addString(preferences.openWorkspaceAppKeys, appKey),
  };
}

export function hideApp(
  preferences: WorkspacePreferences,
  appKey: string,
): WorkspacePreferences {
  return {
    ...preferences,
    favoriteAppKeys: removeString(preferences.favoriteAppKeys, appKey),
    hiddenAppKeys: addString(preferences.hiddenAppKeys, appKey),
    openWorkspaceAppKeys: removeString(preferences.openWorkspaceAppKeys, appKey),
    pinnedAppKeys: removeString(preferences.pinnedAppKeys, appKey),
  };
}

export function unhideApp(
  preferences: WorkspacePreferences,
  appKey: string,
): WorkspacePreferences {
  return {
    ...preferences,
    hiddenAppKeys: removeString(preferences.hiddenAppKeys, appKey),
  };
}

export function reorderApps(
  preferences: WorkspacePreferences,
  appKeys: readonly string[],
): WorkspacePreferences {
  return {
    ...preferences,
    appOrder: dedupeStrings(appKeys),
  };
}

export function recordRecentApp(
  preferences: WorkspacePreferences,
  recentApp: Omit<WorkspaceRecentApp, "openedAt"> & { openedAt?: string },
  options: Readonly<{ limit?: number }> = {},
): WorkspacePreferences {
  const openedAt = recentApp.openedAt ?? new Date().toISOString();
  const next: WorkspaceRecentApp = {
    appKey: recentApp.appKey,
    href: recentApp.href,
    label: recentApp.label,
    openedAt,
  };

  return {
    ...preferences,
    openWorkspaceAppKeys: addString(preferences.openWorkspaceAppKeys, recentApp.appKey),
    recentApps: [
      next,
      ...preferences.recentApps.filter((item) => item.appKey !== recentApp.appKey),
    ].slice(0, options.limit ?? RECENT_LIMIT),
  };
}

export function closeWorkspaceApp(
  preferences: WorkspacePreferences,
  appKey: string,
): WorkspacePreferences {
  return {
    ...preferences,
    openWorkspaceAppKeys: removeString(preferences.openWorkspaceAppKeys, appKey),
  };
}

export function recordRecentDocument(
  preferences: WorkspacePreferences,
  document: Omit<WorkspaceRecentDocument, "openedAt"> & { openedAt?: string },
  options: Readonly<{ limit?: number }> = {},
): WorkspacePreferences {
  const openedAt = document.openedAt ?? new Date().toISOString();
  const next: WorkspaceRecentDocument = {
    href: document.href,
    key: document.key,
    openedAt,
    sourceLabel: document.sourceLabel,
    title: document.title,
    type: document.type,
  };

  return {
    ...preferences,
    recentDocuments: [
      next,
      ...preferences.recentDocuments.filter((item) => item.key !== document.key),
    ].slice(0, options.limit ?? RECENT_DOCUMENT_LIMIT),
  };
}

function addString(values: readonly string[], value: string): readonly string[] {
  if (!value || values.includes(value)) {
    return values;
  }

  return [...values, value];
}

function removeString(values: readonly string[], value: string): readonly string[] {
  return values.filter((candidate) => candidate !== value);
}

function toggleString(values: readonly string[], value: string): readonly string[] {
  if (!value) {
    return values;
  }

  return values.includes(value) ? removeString(values, value) : [...values, value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((candidate): candidate is string => typeof candidate === "string");
}

function readRecentApps(value: unknown): readonly WorkspaceRecentApp[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.appKey !== "string" || typeof candidate.label !== "string") {
      return [];
    }

    return [
      {
        appKey: candidate.appKey,
        href: typeof candidate.href === "string" ? candidate.href : undefined,
        label: candidate.label,
        openedAt: typeof candidate.openedAt === "string" ? candidate.openedAt : new Date(0).toISOString(),
      },
    ];
  });
}

function readRecentDocuments(value: unknown): readonly WorkspaceRecentDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (
      !isRecord(candidate)
      || typeof candidate.key !== "string"
      || typeof candidate.title !== "string"
      || typeof candidate.type !== "string"
    ) {
      return [];
    }

    return [
      {
        href: typeof candidate.href === "string" ? candidate.href : undefined,
        key: candidate.key,
        openedAt: typeof candidate.openedAt === "string" ? candidate.openedAt : new Date(0).toISOString(),
        sourceLabel: typeof candidate.sourceLabel === "string" ? candidate.sourceLabel : undefined,
        title: candidate.title,
        type: candidate.type,
      },
    ];
  });
}

function dedupeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

function dedupeRecentApps(values: readonly WorkspaceRecentApp[]): readonly WorkspaceRecentApp[] {
  const byKey = new Map<string, WorkspaceRecentApp>();

  for (const item of values) {
    if (item.appKey && !byKey.has(item.appKey)) {
      byKey.set(item.appKey, item);
    }
  }

  return [...byKey.values()].slice(0, RECENT_LIMIT);
}

function dedupeRecentDocuments(
  values: readonly WorkspaceRecentDocument[],
): readonly WorkspaceRecentDocument[] {
  const byKey = new Map<string, WorkspaceRecentDocument>();

  for (const item of values) {
    if (item.key && !byKey.has(item.key)) {
      byKey.set(item.key, item);
    }
  }

  return [...byKey.values()].slice(0, RECENT_DOCUMENT_LIMIT);
}
