import assert from "node:assert/strict";
import test from "node:test";

import {
  createLookupProviderRegistry,
  createLookupScopeKey,
  decodeLookupCursor,
  executeLookupRequest,
  mergeLookupOptionsWithRecentsAndFavorites,
  paginateLookupOptions,
  resolveBoundedLookupPageSize,
  searchResultToLookupOption,
  shouldExecuteLookupSearch,
  simulateLargeLookupDataset,
  type OxLookupExecutor,
} from "@/platform/operator-experience/lookup-runtime";
import {
  createLookupSessionCache,
  getLookupCacheHitRatio,
  OX_LOOKUP_CACHE_MAX_SEARCH_ENTRIES,
  readLookupSearchCache,
  writeLookupSearchCache,
} from "@/platform/operator-experience/lookup-cache";
import {
  ENTERPRISE_PERFORMANCE_BUDGETS,
  evaluatePerformanceBudget,
  simulateConcurrencyScenario,
} from "@/platform/operator-experience/enterprise-runtime";
import { OX_LOOKUP_PROVIDERS, getOxLookupProvider } from "@/platform/operator-experience/lookup-providers";
import { createOxLookupQuery, defineOxLookupProvider } from "@/platform/operator-experience/public-api";

test("lookup runtime registers standard providers", () => {
  assert.equal(OX_LOOKUP_PROVIDERS.length >= 10, true);
  assert.equal(getOxLookupProvider("inventory.products.lookup")?.entityType, "product");
  assert.equal(getOxLookupProvider("purchasing.suppliers.lookup")?.entityType, "supplier");
  assert.equal(getOxLookupProvider("platform.users.lookup")?.entityType, "user");
  assert.equal(getOxLookupProvider("platform.users.lookup")?.supportsSelectedRecordHydration, true);
});

test("lookup runtime enforces bounded page sizes", () => {
  const provider = defineOxLookupProvider({
    entityType: "product",
    key: "test.products.lookup",
    hydrateProviderKey: "test.products.hydrate",
    minSearchLength: 2,
    pageSize: 25,
    searchProviderKey: "test.products",
    supportsAsyncLoading: true,
    supportsBarcodeSearch: true,
    supportsFavorites: true,
    supportsKeyboardNavigation: true,
    supportsQrSearch: true,
    supportsRecent: true,
    supportsRemoteSearch: true,
    supportsSelectedRecordHydration: true,
  });

  assert.equal(resolveBoundedLookupPageSize(undefined, provider), 25);
  assert.equal(resolveBoundedLookupPageSize(500, provider), 100);
});

test("lookup runtime paginates large datasets with cursors", () => {
  const dataset = simulateLargeLookupDataset(120, "product");
  const firstPage = paginateLookupOptions(dataset, 25, null, (option) => ({
    id: option.id,
    sortKey: option.businessName,
  }));
  assert.equal(firstPage.options.length, 25);
  assert.ok(firstPage.nextCursor);

  const cursor = decodeLookupCursor(firstPage.nextCursor);
  const secondPage = paginateLookupOptions(dataset, 25, cursor, (option) => ({
    id: option.id,
    sortKey: option.businessName,
  }));
  assert.equal(secondPage.options.length, 25);
  assert.notEqual(secondPage.options[0]?.id, firstPage.options[0]?.id);
});

test("lookup runtime merges recents and favorites without duplicates", () => {
  const merged = mergeLookupOptionsWithRecentsAndFavorites(
    [
      { businessName: "Alpha", entityType: "product", id: "1" },
      { businessName: "Beta", entityType: "product", id: "2" },
      { businessName: "Gamma", entityType: "product", id: "3" },
    ],
    ["2"],
    ["1"],
  );

  assert.equal(merged.length, 3);
  assert.equal(merged[0]?.id, "1");
  assert.equal(merged[0]?.isFavorite, true);
  assert.equal(merged.find((option) => option.id === "2")?.isRecent, true);
});

test("lookup runtime executes async provider search and hydration", async () => {
  const calls: string[] = [];
  const executor: OxLookupExecutor = {
    hydrate: async ({ ids }) => ids.map((id) => ({
      businessCode: "SKU-1",
      businessName: `Product ${id}`,
      entityType: "product",
      id,
    })),
    search: async ({ pageSize, query }) => {
      calls.push(query.term ?? "");
      return {
        minSearchLength: 2,
        nextCursor: null,
        options: [{ businessCode: "SKU-1", businessName: "Product 1", entityType: "product", id: "product-1" }],
        pageSize,
        rejectedRawIdentifier: false,
      };
    },
  };

  const registry = createLookupProviderRegistry(OX_LOOKUP_PROVIDERS, {
    "inventory.products.lookup": executor,
  });

  const searchResult = await executeLookupRequest(registry, {
    branchId: "branch-1",
    companyId: "company-1",
    permissionFingerprint: "user-1",
    tenantId: "tenant-1",
  }, {
    providerKey: "inventory.products.lookup",
    term: "prod",
  });

  assert.deepEqual(calls, ["prod"]);
  assert.equal(searchResult.options[0]?.businessName, "Product 1");

  const hydrateResult = await executeLookupRequest(registry, {
    branchId: "branch-1",
    companyId: "company-1",
    permissionFingerprint: "user-1",
    tenantId: "tenant-1",
  }, {
    hydrateIds: ["product-9"],
    providerKey: "inventory.products.lookup",
  });

  assert.equal(hydrateResult.hydrated?.[0]?.id, "product-9");
});

test("lookup runtime rejects manual raw identifiers", () => {
  const query = createOxLookupQuery("0fdb5917-f533-4ad5-9b4d-91f427dd7ed4");
  assert.equal(shouldExecuteLookupSearch(query, []), false);
  assert.equal(query.rejectedRawIdentifier, true);
});

test("lookup cache scopes entries by tenant company branch and provider", () => {
  const cache = createLookupSessionCache();
  const scope = {
    branchId: "branch-1",
    companyId: "company-1",
    permissionFingerprint: "user-1",
    tenantId: "tenant-1",
  };

  writeLookupSearchCache(cache, scope, "inventory.products.lookup", "abc", null, 25, {
    minSearchLength: 2,
    nextCursor: null,
    options: [{ businessName: "Cached Product", entityType: "product", id: "1" }],
    pageSize: 25,
    rejectedRawIdentifier: false,
  });

  const hit = readLookupSearchCache(cache, scope, "inventory.products.lookup", "abc", null, 25);
  const miss = readLookupSearchCache(cache, {
    ...scope,
    companyId: "company-2",
  }, "inventory.products.lookup", "abc", null, 25);

  assert.equal(hit?.options[0]?.businessName, "Cached Product");
  assert.equal(hit?.fromCache, true);
  assert.equal(miss, null);
  assert.equal(createLookupScopeKey(scope, "inventory.products.lookup").includes("tenant-1"), true);
});

test("lookup runtime maps search results into business-facing options", () => {
  const option = searchResultToLookupOption({
    entityId: "product-1",
    entityType: "product",
    metadata: { businessCode: "SKU-1", status: "active" },
    moduleKey: "inventory",
    rank: 0,
    subtitle: "SKU-1",
    title: "Finished Good",
  });

  assert.equal(option?.businessName, "Finished Good");
  assert.equal(option?.businessCode, "SKU-1");
});

test("lookup runtime simulates large dataset pagination performance characteristics", () => {
  const dataset = simulateLargeLookupDataset(50_000, "serial");
  const start = performance.now();
  const page = paginateLookupOptions(dataset, 25, null, (option) => ({
    id: option.id,
    sortKey: option.businessCode ?? option.businessName,
  }));
  const elapsed = performance.now() - start;

  assert.equal(page.options.length, 25);
  assert.ok(elapsed < 250, `Expected pagination under 250ms, got ${elapsed.toFixed(1)}ms`);
});

test("enterprise performance budgets define lookup and posting targets", () => {
  assert.equal(ENTERPRISE_PERFORMANCE_BUDGETS.length >= 8, true);
  assert.equal(evaluatePerformanceBudget("lookup.product.search", 120).withinBudget, true);
  assert.equal(evaluatePerformanceBudget("lookup.product.search", 220).withinBudget, false);
});

test("lookup cache tracks hit ratio and enforces entry limits", () => {
  const cache = createLookupSessionCache();
  const scope = { branchId: "b1", companyId: "c1", permissionFingerprint: "u1", tenantId: "t1" };
  writeLookupSearchCache(cache, scope, "inventory.products.lookup", "abc", null, 25, {
    minSearchLength: 2,
    nextCursor: null,
    options: [{ businessName: "Product", entityType: "product", id: "1" }],
    pageSize: 25,
    rejectedRawIdentifier: false,
  });
  readLookupSearchCache(cache, scope, "inventory.products.lookup", "abc", null, 25);
  readLookupSearchCache(cache, scope, "inventory.products.lookup", "missing", null, 25);
  assert.ok(getLookupCacheHitRatio(cache) > 0);
  for (let index = 0; index < OX_LOOKUP_CACHE_MAX_SEARCH_ENTRIES + 5; index += 1) {
    writeLookupSearchCache(cache, scope, "inventory.products.lookup", `term-${index}`, null, 25, {
      minSearchLength: 2,
      nextCursor: null,
      options: [],
      pageSize: 25,
      rejectedRawIdentifier: false,
    });
  }
  assert.ok(cache.search.size <= OX_LOOKUP_CACHE_MAX_SEARCH_ENTRIES);
});

test("concurrency simulation reports operator throughput", async () => {
  let counter = 0;
  const result = await simulateConcurrencyScenario({
    key: "lookup.concurrent-search",
    operationsPerOperator: 5,
    operators: 20,
    operation: () => {
      counter += 1;
    },
  });
  assert.equal(result.totalOperations, 100);
  assert.equal(counter, 100);
  assert.equal(result.failures, 0);
});
