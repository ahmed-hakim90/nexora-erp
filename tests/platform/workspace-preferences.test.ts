import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

const root = process.cwd();
const workspacePreferencesMigrationPath = path.join(
  root,
  "supabase/migrations/20260628160400_user_workspace_preferences.sql",
);

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

test("workspace preferences normalize untrusted persisted JSON safely", () => {
  const preferences = normalizeWorkspacePreferences({
    appOrder: ["finance", "", "finance", 1],
    favoriteAppKeys: "inventory",
    hiddenAppKeys: ["manufacturing", null],
    openWorkspaceAppKeys: ["finance"],
    pinnedAppKeys: ["finance", "finance"],
    recentApps: [
      {
        appKey: "finance",
        href: "/erp/finance",
        label: "Finance",
        openedAt: "2026-06-28T10:00:00.000Z",
      },
      { appKey: "broken" },
    ],
    recentDocuments: [
      {
        key: "doc-1",
        sourceLabel: "Finance",
        title: "Journal",
        type: "Journal",
      },
      { key: "broken-doc", title: "Broken" },
    ],
  });

  assert.deepEqual(preferences.appOrder, ["finance"]);
  assert.deepEqual(preferences.favoriteAppKeys, []);
  assert.deepEqual(preferences.hiddenAppKeys, ["manufacturing"]);
  assert.deepEqual(preferences.pinnedAppKeys, ["finance"]);
  assert.equal(preferences.recentApps.length, 1);
  assert.equal(preferences.recentDocuments.length, 1);
});

test("workspace preferences migration persists one RLS-scoped row per tenant user", () => {
  const sql = fs.readFileSync(workspacePreferencesMigrationPath, "utf8");
  const expectedFragments = [
    "create table if not exists public.user_workspace_preferences",
    "preferences jsonb not null default '{}'::jsonb",
    "constraint user_workspace_preferences_user_uq unique (tenant_id, user_id)",
    "alter table public.user_workspace_preferences enable row level security",
    "alter table public.user_workspace_preferences force row level security",
    "create policy user_workspace_preferences_own_select",
    "create policy user_workspace_preferences_own_write",
    "user_id = public.current_user_id()",
    "public.is_tenant_member(tenant_id)",
  ];

  for (const fragment of expectedFragments) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }
});
