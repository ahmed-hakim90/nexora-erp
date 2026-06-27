import type { AccessExperience } from "@/core/context";
import type { AuditActor, AuditSeverity } from "@/platform/audit/public-api";

export type TelemetryCorrelationMetadata = Readonly<{
  correlationId: string;
  requestId?: string;
}>;

export type TelemetrySeverity = AuditSeverity;

export type TelemetrySource =
  | "runtime"
  | "api"
  | "database"
  | "query"
  | "report"
  | "print"
  | "export"
  | "import"
  | "background-job"
  | "webhook"
  | "connector"
  | "automation"
  | "ai-action"
  | "system";

export type TelemetryMetric = Readonly<{
  name: string;
  value: number;
  unit: "count" | "ms" | "bytes" | "rows" | "percent";
  tags?: Readonly<Record<string, string>>;
}>;

export type TelemetrySpan = Readonly<{
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
}>;

export type TelemetryEvent = Readonly<{
  id?: string;
  name: string;
  source: TelemetrySource;
  severity: TelemetrySeverity;
  outcome: "success" | "failure" | "error" | "timeout" | "cancelled";
  correlationId: string;
  requestId?: string | null;
  actor?: AuditActor;
  tenantId?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience;
  sourceKey?: string | null;
  metrics?: readonly TelemetryMetric[];
  span?: TelemetrySpan;
  metadata?: Readonly<Record<string, unknown>>;
  timestamp: string;
}>;

export type PerformanceBudget = Readonly<{
  key: string;
  source: TelemetrySource;
  maxDurationMs?: number;
  maxRowsScanned?: number;
  maxPayloadBytes?: number;
  severity: TelemetrySeverity;
}>;

export type SlowOperation = Readonly<{
  operationKey: string;
  source: TelemetrySource;
  durationMs: number;
  budget?: PerformanceBudget;
  correlationId: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

function sanitizeTelemetryMetadata(
  metadata: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) => !["password", "secret", "token", "accessToken", "refreshToken"].includes(key),
    ),
  );
}

export function createTelemetryEvent(
  event: Omit<TelemetryEvent, "timestamp"> & Partial<Pick<TelemetryEvent, "timestamp">>,
): TelemetryEvent {
  return {
    ...event,
    metadata: sanitizeTelemetryMetadata(event.metadata),
    metrics: event.metrics ?? [],
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
}

export function definePerformanceBudget<TBudget extends PerformanceBudget>(
  budget: TBudget,
): TBudget {
  return budget;
}

export function createSlowOperationEvent(operation: SlowOperation): TelemetryEvent {
  return createTelemetryEvent({
    correlationId: operation.correlationId,
    metadata: operation.metadata,
    metrics: [
      {
        name: "duration",
        unit: "ms",
        value: operation.durationMs,
      },
    ],
    name: operation.operationKey,
    outcome: "success",
    severity: operation.budget?.severity ?? "warning",
    source: operation.source,
  });
}
