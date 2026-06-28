import assert from "node:assert/strict";
import test from "node:test";

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
} from "@/shared/workspace/preferences";

test("workspace preference reducers toggle favorites and pins", () => {
  const favorite = toggleFavoriteApp(EMPTY_WORKSPACE_PREFERENCES, "finance");
  const unfavorite = toggleFavoriteApp(favorite, "finance");
  const pinned = togglePinnedApp(EMPTY_WORKSPACE_PREFERENCES, "inventory");
  const unpinned = togglePinnedApp(pinned, "inventory");

  assert.deepEqual(favorite.favoriteAppKeys, ["finance"]);
  assert.deepEqual(unfavorite.favoriteAppKeys, []);
  assert.deepEqual(pinned.pinnedAppKeys, ["inventory"]);
  assert.deepEqual(pinned.openWorkspaceAppKeys, ["inventory"]);
  assert.deepEqual(unpinned.pinnedAppKeys, []);
});

test("workspace preference reducers hide and unhide apps cleanly", () => {
  const starting = normalizeWorkspacePreferences({
    favoriteAppKeys: ["crm"],
    openWorkspaceAppKeys: ["crm"],
    pinnedAppKeys: ["crm"],
  });
  const hidden = hideApp(starting, "crm");
  const unhidden = unhideApp(hidden, "crm");

  assert.deepEqual(hidden.hiddenAppKeys, ["crm"]);
  assert.deepEqual(hidden.favoriteAppKeys, []);
  assert.deepEqual(hidden.pinnedAppKeys, []);
  assert.deepEqual(hidden.openWorkspaceAppKeys, []);
  assert.deepEqual(unhidden.hiddenAppKeys, []);
});

test("workspace preference reducers reorder apps without duplicates", () => {
  const preferences = reorderApps(EMPTY_WORKSPACE_PREFERENCES, [
    "manufacturing",
    "finance",
    "finance",
    "inventory",
  ]);

  assert.deepEqual(preferences.appOrder, ["manufacturing", "finance", "inventory"]);
});

test("workspace preference reducers record recent apps with dedupe and cap", () => {
  let preferences = EMPTY_WORKSPACE_PREFERENCES;

  for (let index = 0; index < 14; index += 1) {
    preferences = recordRecentApp(preferences, {
      appKey: `app-${index}`,
      label: `App ${index}`,
      openedAt: `2026-06-27T09:${String(index).padStart(2, "0")}:00.000Z`,
    });
  }

  preferences = recordRecentApp(preferences, {
    appKey: "app-3",
    label: "App 3",
    openedAt: "2026-06-27T10:00:00.000Z",
  });

  assert.equal(preferences.recentApps.length, 12);
  assert.equal(preferences.recentApps[0]?.appKey, "app-3");
  assert.equal(preferences.recentApps.filter((app) => app.appKey === "app-3").length, 1);
  assert.equal(preferences.openWorkspaceAppKeys.includes("app-3"), true);
});

test("workspace preference reducers record recent documents and close tabs", () => {
  const withDocument = recordRecentDocument(EMPTY_WORKSPACE_PREFERENCES, {
    key: "journal-definition",
    openedAt: "2026-06-27T10:00:00.000Z",
    sourceLabel: "Finance",
    title: "Journal Definition",
    type: "Recent Journal Definition",
  });
  const withTab = recordRecentApp(withDocument, {
    appKey: "finance",
    label: "Finance",
  });
  const closed = closeWorkspaceApp(withTab, "finance");

  assert.equal(withDocument.recentDocuments[0]?.title, "Journal Definition");
  assert.equal(withDocument.recentDocuments[0]?.sourceLabel, "Finance");
  assert.deepEqual(closed.openWorkspaceAppKeys, []);
});
