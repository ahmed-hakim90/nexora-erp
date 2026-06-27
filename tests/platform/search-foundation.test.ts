import assert from "node:assert/strict";
import test from "node:test";

import {
  createCommandSearchProvider,
  createDocumentSearchProviderContract,
  createNavigationSearchProvider,
  createPartySearchProviderContract,
  createSearchProviderRegistry,
  definePermissionKey,
  defineSearchProvider,
  discoverSearchableEntities,
  executeSearch,
  filterSearchResultsForContext,
  listSearchProviders,
  normalizeSearchQuery,
  rankSearchResults,
  registerSearchProvider,
  tokenizeSearchTerm,
  unregisterSearchProvider,
  validateSearchProvider,
  type SearchContext,
  type SearchProvider,
  type SearchResult,
} from "@/platform/public-api";

const viewInventory = definePermissionKey("inventory.search.view");
const viewParty = definePermissionKey("party.search.view");

const context: SearchContext = {
  appKey: "inventory",
  branchId: "branch-1",
  companyId: "company-1",
  entityPriorities: { command: 2 },
  experience: "erp",
  favoriteEntityIds: ["cmd.open"],
  frequentlyUsedEntityIds: ["nav.inventory"],
  grantedPermissions: new Set([viewInventory]),
  recentEntityIds: ["doc-1"],
  tenantId: "tenant-1",
};

const provider = defineSearchProvider({
  appKey: "inventory",
  entityTypes: ["item"],
  key: "inventory.items",
  moduleKey: "inventory",
  requiredPermissions: [viewInventory],
  searchableEntities: [
    {
      appKey: "inventory",
      displayName: "Items",
      entityType: "item",
      indexPolicy: {
        enabled: true,
        fields: ["sku", "name"],
        languageReadiness: ["ar", "en"],
        refresh: "event-driven",
      },
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [viewInventory],
        sensitivity: "internal",
      },
      quickSearchFields: ["sku", "name"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
  ],
  source: "app",
  supportedExperiences: ["erp"],
});

test("search provider registration, listing, discovery, and unregister work", () => {
  const registry = registerSearchProvider(createSearchProviderRegistry(), provider);

  assert.deepEqual(listSearchProviders(registry, { source: "app" }).map((item) => item.key), [
    "inventory.items",
  ]);
  assert.deepEqual(discoverSearchableEntities(registry, { resultType: "record" }).map((entity) => entity.entityType), [
    "item",
  ]);
  assert.deepEqual(unregisterSearchProvider(registry, "inventory.items").providers, []);
});

test("search provider validation catches missing keys and duplicate entity types", () => {
  assert.deepEqual(validateSearchProvider(provider), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateSearchProvider({
    entityTypes: ["item", "item"],
    key: "",
    moduleKey: "",
  }), {
    errors: [
      "Search provider key is required.",
      "Search provider module key is required.",
      "Duplicate search provider entity type: item",
    ],
    valid: false,
  });
});

test("query normalization trims, lowercases, tokenizes Arabic and English, and clamps limits", () => {
  assert.deepEqual(normalizeSearchQuery({
    limit: 500,
    term: "  INV   فاتورة  100 ",
    tenantId: "tenant-1",
  }), {
    limit: 50,
    normalizedTerm: "inv فاتورة 100",
    pageSize: 50,
    term: "  INV   فاتورة  100 ",
    tenantId: "tenant-1",
    tokens: ["inv", "فاتورة", "100"],
  });
  assert.deepEqual(tokenizeSearchTerm("customer، supplier; أمر"), [
    "customer",
    "supplier",
    "أمر",
  ]);
});

test("permission, tenant, branch, experience, and app filters hide unavailable results", () => {
  const results: readonly SearchResult[] = [
    {
      appKey: "inventory",
      branchId: "branch-1",
      companyId: "company-1",
      entityId: "doc-1",
      entityType: "item",
      experience: "erp",
      moduleKey: "inventory",
      rank: 0,
      requiredPermissions: [viewInventory],
      tenantId: "tenant-1",
      title: "Inventory Item",
    },
    {
      appKey: "inventory",
      entityId: "hidden",
      entityType: "item",
      moduleKey: "inventory",
      rank: 0,
      requiredPermissions: [viewParty],
      tenantId: "tenant-1",
      title: "Hidden Item",
    },
    {
      entityId: "wrong-tenant",
      entityType: "item",
      moduleKey: "inventory",
      rank: 0,
      tenantId: "tenant-2",
      title: "Wrong Tenant",
    },
  ];

  assert.deepEqual(filterSearchResultsForContext(results, context).map((result) => result.entityId), [
    "doc-1",
  ]);
});

test("ranking policy boosts exact, prefix, fuzzy, recent, favorites, frequent, app, and entity priority", () => {
  const query = normalizeSearchQuery({ term: "open", tenantId: "tenant-1" });
  const ranked = rankSearchResults([
    {
      appKey: "inventory",
      entityId: "cmd.open",
      entityType: "command",
      moduleKey: "platform",
      rank: 0,
      title: "Open",
    },
    {
      appKey: "inventory",
      entityId: "nav.inventory",
      entityType: "navigation",
      moduleKey: "platform",
      rank: 0,
      title: "Open Inventory",
    },
  ], query, context);

  assert.deepEqual(ranked.map((result) => result.entityId), [
    "cmd.open",
    "nav.inventory",
  ]);
  assert.ok((ranked[0]?.rank ?? 0) > (ranked[1]?.rank ?? 0));
});

test("command and navigation search providers expose integration contracts", async () => {
  const commandProvider = createCommandSearchProvider([
    {
      actionType: "open-page",
      appKey: "inventory",
      category: "navigation",
      href: "/inventory",
      key: "cmd.open",
      label: "Open Inventory",
      requiredPermission: viewInventory,
      scope: "global",
      supportedExperiences: ["erp"],
    },
  ]);
  const navigationProvider = createNavigationSearchProvider([
    {
      appKey: "inventory",
      href: "/inventory",
      key: "nav.inventory",
      label: "Inventory",
      placement: "app-launcher",
      requiredPermission: viewInventory,
      supportedExperiences: ["erp"],
    },
  ]);
  const registry = createSearchProviderRegistry([commandProvider, navigationProvider]);
  const page = await executeSearch(registry, {
    appKey: "inventory",
    term: "inventory",
    tenantId: "tenant-1",
  }, context);

  assert.deepEqual(page.records.map((result) => result.type).sort(), [
    "command",
    "navigation",
  ]);
});

test("document and party provider contracts are discoverable without business data search", () => {
  const documentProvider = createDocumentSearchProviderContract("platform.document", "platform", [viewInventory]);
  const partyProvider = createPartySearchProviderContract(["customer", "supplier"], [viewParty]);
  const registry = createSearchProviderRegistry([documentProvider, partyProvider]);

  assert.deepEqual(discoverSearchableEntities(registry, { source: "document" }).map((entity) => entity.resultType), [
    "document",
  ]);
  assert.deepEqual(discoverSearchableEntities(registry, { source: "party" })[0]?.quickSearchFields, [
    "displayName",
    "legalName",
    "partyNumber",
    "customer",
    "supplier",
  ]);
});

test("executeSearch respects provider permissions and returns paginated ranked results", async () => {
  const searchableProvider: SearchProvider = defineSearchProvider({
    entityTypes: ["item"],
    key: "inventory.runtime",
    moduleKey: "inventory",
    requiredPermissions: [viewInventory],
    search: () => [
      {
        appKey: "inventory",
        entityId: "doc-1",
        entityType: "item",
        moduleKey: "inventory",
        rank: 1,
        requiredPermissions: [viewInventory],
        tenantId: "tenant-1",
        title: "Inventory Item",
      },
    ],
    source: "app",
    supportedExperiences: ["erp"],
  });
  const registry = createSearchProviderRegistry([searchableProvider]);

  assert.deepEqual((await executeSearch(registry, {
    pageSize: 1,
    term: "inventory",
    tenantId: "tenant-1",
  }, context)).records.map((result) => result.entityId), ["doc-1"]);
  assert.deepEqual((await executeSearch(registry, {
    term: "inventory",
    tenantId: "tenant-1",
  }, {
    ...context,
    grantedPermissions: new Set(),
  })).records, []);
});
