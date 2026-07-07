import "server-only";

import { createInventoryLookupExecutors, resolveInventoryLookupScan } from "@/features/inventory/routes/entity-lookup-runtime.adapter";
import { createHrLookupExecutors } from "@/features/hr/routes/entity-lookup-runtime.adapter";
import { createPurchasingLookupExecutors } from "@/features/purchasing/routes/entity-lookup-runtime.adapter";
import { resolveBranchRequestContext, type BranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import {
  createLookupSessionCache,
  getLookupCacheHitRatio,
  pruneLookupSessionCache,
  readLookupSearchCache,
  readLookupSelectedCache,
  writeLookupSearchCache,
  writeLookupSelectedCache,
  type OxLookupSessionCache,
} from "@/platform/operator-experience/lookup-cache";
import {
  createRuntimeMeasurementEvent,
  evaluatePerformanceBudget,
} from "@/platform/operator-experience/enterprise-runtime";
import { recordTelemetryEvent } from "@/platform/observability/server";
import { OX_LOOKUP_PROVIDERS } from "@/platform/operator-experience/lookup-providers";
import {
  createLookupProviderRegistry,
  executeLookupRequest,
  type OxLookupPage,
  type OxLookupProviderRegistry,
  type OxLookupRequest,
  type OxLookupScope,
} from "@/platform/operator-experience/lookup-runtime";
import type { OxLookupOption } from "@/platform/operator-experience/public-api";

declare global {
  var __nexoraLookupSessionCache: OxLookupSessionCache | undefined;
}

function getLookupSessionCache(): OxLookupSessionCache {
  if (!globalThis.__nexoraLookupSessionCache) {
    globalThis.__nexoraLookupSessionCache = createLookupSessionCache();
  }
  return globalThis.__nexoraLookupSessionCache;
}

async function createLookupRuntime(context: BranchRequestContext) {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  return createLookupProviderRegistry(OX_LOOKUP_PROVIDERS, {
    ...createInventoryLookupExecutors(context, supabase),
    ...createPurchasingLookupExecutors(context, supabase),
    ...createHrLookupExecutors(context, supabase),
  });
}

function createLookupScope(context: BranchRequestContext): OxLookupScope {
  return {
    branchId: context.branchId,
    companyId: context.companyId,
    permissionFingerprint: context.userId,
    tenantId: context.tenantId,
  };
}

export async function runEntityLookupRequest(
  request: OxLookupRequest,
): Promise<OxLookupPage & Readonly<{ hydrated?: readonly OxLookupOption[] }>> {
  const startedAt = performance.now();
  const context = await resolveBranchRequestContext("erp");
  const scope = createLookupScope(context);
  const cache = getLookupSessionCache();
  pruneLookupSessionCache(cache);

  const registry = await createLookupRuntime(context);
  const provider = registry.providers[request.providerKey];
  if (!provider) {
    throw new Error(`Unknown lookup provider "${request.providerKey}".`);
  }

  const pageSize = request.pageSize ?? provider.pageSize;
  const hydrateIds = request.hydrateIds ?? [];
  const budgetKey = hydrateIds.length > 0
    ? "lookup.barcode.resolve"
    : request.mode === "barcode" || request.mode === "qr"
      ? "lookup.barcode.resolve"
      : "lookup.product.search";

  try {
    if (hydrateIds.length > 0) {
      const cached = hydrateIds
        .map((id) => readLookupSelectedCache(cache, scope, request.providerKey, id))
        .filter((option) => option !== null);
      if (cached.length === hydrateIds.length) {
        return {
          hydrated: cached,
          minSearchLength: provider.minSearchLength,
          nextCursor: null,
          options: [],
          pageSize,
          rejectedRawIdentifier: false,
        };
      }
    } else if (!hydrateIds.length) {
      const cached = readLookupSearchCache(
        cache,
        scope,
        request.providerKey,
        request.term ?? null,
        request.cursor ?? null,
        pageSize,
      );
      if (cached) return cached;
    }

    const page = await executeLookupRequest(registry, scope, request);

    if (page.hydrated?.length) {
      writeLookupSelectedCache(cache, scope, request.providerKey, page.hydrated);
    } else if (page.options.length > 0) {
      writeLookupSearchCache(
        cache,
        scope,
        request.providerKey,
        request.term ?? null,
        request.cursor ?? null,
        pageSize,
        page,
      );
    }

    return page;
  } finally {
    const durationMs = performance.now() - startedAt;
    const evaluation = evaluatePerformanceBudget(budgetKey, durationMs);
    void recordTelemetryEvent({
      branchId: context.branchId,
      companyId: context.companyId,
      correlationId: context.correlationId,
      metadata: {
        cacheHitRatio: getLookupCacheHitRatio(cache),
        fromCache: false,
        hydrateCount: hydrateIds.length,
        providerKey: request.providerKey,
        withinBudget: evaluation.withinBudget,
      },
      metrics: [
        { name: "duration", unit: "ms", value: durationMs },
        { name: evaluation.withinBudget ? "cache_hit_ratio" : "cache_miss_ratio", unit: "percent", value: getLookupCacheHitRatio(cache) * 100 },
      ],
      name: budgetKey,
      outcome: evaluation.withinBudget ? "success" : "timeout",
      severity: evaluation.budget?.severity ?? "info",
      source: "query",
      tenantId: context.tenantId,
    }).catch(() => undefined);
    if (!evaluation.withinBudget) {
      void recordTelemetryEvent(createRuntimeMeasurementEvent({
        correlationId: context.correlationId,
        durationMs,
        metadata: { providerKey: request.providerKey },
        operationKey: budgetKey,
      })).catch(() => undefined);
    }
  }
}

export async function hydrateLookupOptions(providerKey: string, ids: readonly string[]) {
  if (ids.length === 0) return [] as readonly { id: string; label: string }[];
  const page = await runEntityLookupRequest({ hydrateIds: [...new Set(ids)], providerKey });
  return (page.hydrated ?? []).map((option) => ({ id: option.id, label: option.businessName }));
}

export async function resolveEntityLookupScan(providerKey: string, term: string) {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return resolveInventoryLookupScan(context, supabase, providerKey, term);
}

export async function getLookupProviderRegistry(): Promise<OxLookupProviderRegistry> {
  const context = await resolveBranchRequestContext("erp");
  return createLookupRuntime(context);
}
