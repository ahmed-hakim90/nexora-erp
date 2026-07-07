import {
  createSlowOperationEvent,
  createTelemetryEvent,
  definePerformanceBudget,
  type PerformanceBudget,
  type TelemetryMetric,
} from "@/platform/observability/public-api";

export const ENTERPRISE_PERFORMANCE_BUDGETS = [
  definePerformanceBudget({
    key: "lookup.product.search",
    maxDurationMs: 150,
    severity: "warning",
    source: "query",
  }),
  definePerformanceBudget({
    key: "lookup.barcode.resolve",
    maxDurationMs: 100,
    severity: "warning",
    source: "query",
  }),
  definePerformanceBudget({
    key: "inventory.goods-receipt.save",
    maxDurationMs: 300,
    severity: "warning",
    source: "runtime",
  }),
  definePerformanceBudget({
    key: "inventory.goods-issue.post",
    maxDurationMs: 500,
    severity: "warning",
    source: "runtime",
  }),
  definePerformanceBudget({
    key: "inventory.warehouse-transfer.post",
    maxDurationMs: 500,
    severity: "warning",
    source: "runtime",
  }),
  definePerformanceBudget({
    key: "manufacturing.dpr.save",
    maxDurationMs: 300,
    severity: "warning",
    source: "runtime",
  }),
  definePerformanceBudget({
    key: "workspace.route.navigation",
    maxDurationMs: 300,
    severity: "info",
    source: "runtime",
  }),
  definePerformanceBudget({
    key: "warehouse.execution.initial-load",
    maxDurationMs: 2000,
    severity: "warning",
    source: "runtime",
  }),
] as const satisfies readonly PerformanceBudget[];

export type EnterprisePerformanceBudgetKey = (typeof ENTERPRISE_PERFORMANCE_BUDGETS)[number]["key"];

const budgetByKey = new Map<string, PerformanceBudget>(
  ENTERPRISE_PERFORMANCE_BUDGETS.map((budget) => [budget.key, budget]),
);

export function getEnterprisePerformanceBudget(key: string): PerformanceBudget | null {
  return budgetByKey.get(key) ?? null;
}

export function evaluatePerformanceBudget(
  key: string,
  durationMs: number,
): Readonly<{ withinBudget: boolean; budget: PerformanceBudget | null; overrunMs: number }> {
  const budget = getEnterprisePerformanceBudget(key);
  if (!budget?.maxDurationMs) {
    return { budget, overrunMs: 0, withinBudget: true };
  }
  const overrunMs = Math.max(durationMs - budget.maxDurationMs, 0);
  return { budget, overrunMs, withinBudget: overrunMs === 0 };
}

export type RuntimeMeasurement = Readonly<{
  operationKey: string;
  durationMs: number;
  correlationId: string;
  metadata?: Readonly<Record<string, unknown>>;
  metrics?: readonly TelemetryMetric[];
}>;

export function createRuntimeMeasurementEvent(measurement: RuntimeMeasurement) {
  const evaluation = evaluatePerformanceBudget(measurement.operationKey, measurement.durationMs);
  if (!evaluation.withinBudget && evaluation.budget) {
    return createSlowOperationEvent({
      budget: evaluation.budget,
      correlationId: measurement.correlationId,
      durationMs: measurement.durationMs,
      metadata: measurement.metadata,
      operationKey: measurement.operationKey,
      source: evaluation.budget.source,
    });
  }

  return createTelemetryEvent({
    correlationId: measurement.correlationId,
    metadata: measurement.metadata,
    metrics: [
      ...(measurement.metrics ?? []),
      { name: "duration", unit: "ms", value: measurement.durationMs },
    ],
    name: measurement.operationKey,
    outcome: "success",
    severity: evaluation.budget?.severity ?? "info",
    source: evaluation.budget?.source ?? "runtime",
  });
}

export type ConcurrencyScenario = Readonly<{
  key: string;
  operators: number;
  operationsPerOperator: number;
  operation: () => Promise<void> | void;
}>;

export type ConcurrencyScenarioResult = Readonly<{
  key: string;
  operators: number;
  totalOperations: number;
  durationMs: number;
  operationsPerSecond: number;
  failures: number;
}>;

export async function simulateConcurrencyScenario(
  scenario: ConcurrencyScenario,
): Promise<ConcurrencyScenarioResult> {
  const startedAt = performance.now();
  let failures = 0;

  await Promise.all(
    Array.from({ length: scenario.operators }, async () => {
      for (let index = 0; index < scenario.operationsPerOperator; index += 1) {
        try {
          await scenario.operation();
        } catch {
          failures += 1;
        }
      }
    }),
  );

  const durationMs = performance.now() - startedAt;
  const totalOperations = scenario.operators * scenario.operationsPerOperator;

  return {
    durationMs,
    failures,
    key: scenario.key,
    operationsPerSecond: durationMs > 0 ? (totalOperations / durationMs) * 1000 : totalOperations,
    operators: scenario.operators,
    totalOperations,
  };
}

export const ENTERPRISE_SCALE_TARGETS = {
  documents: 10_000_000,
  locations: 50_000,
  lots: 500_000,
  parties: 1_000_000,
  products: 100_000,
  serialNumbers: 2_000_000,
  warehouses: 500,
} as const;

export function assessScaleCertification(input: Readonly<{
  entityType: keyof typeof ENTERPRISE_SCALE_TARGETS;
  observedMaxLatencyMs: number;
  budgetKey: EnterprisePerformanceBudgetKey;
  pageSize: number;
}>): Readonly<{ certified: boolean; targetVolume: number; withinBudget: boolean }> {
  const evaluation = evaluatePerformanceBudget(input.budgetKey, input.observedMaxLatencyMs);
  return {
    certified: evaluation.withinBudget && input.pageSize <= 100,
    targetVolume: ENTERPRISE_SCALE_TARGETS[input.entityType],
    withinBudget: evaluation.withinBudget,
  };
}
