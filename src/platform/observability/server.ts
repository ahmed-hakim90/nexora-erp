import "server-only";

import { logger } from "@/core/logger";
import { ok, type Result } from "@/core/result";
import { createRequestSupabaseClient } from "@/infrastructure/server";

import {
  createTelemetryEvent,
  type TelemetryEvent,
} from "./public-api";

function readAccessToken(
  event: Omit<TelemetryEvent, "timestamp"> & Partial<Pick<TelemetryEvent, "timestamp">>,
): string | null {
  const token = event.metadata?.accessToken;
  return typeof token === "string" && token.length > 0 ? token : null;
}

export async function recordTelemetryEvent(
  event: Omit<TelemetryEvent, "timestamp"> & Partial<Pick<TelemetryEvent, "timestamp">>,
): Promise<Result<TelemetryEvent>> {
  const accessToken = readAccessToken(event);
  const telemetryEvent = createTelemetryEvent(event);

  if (!accessToken) {
    logger.info("Telemetry event captured without request-scoped database credentials.", {
      correlationId: telemetryEvent.correlationId,
      name: telemetryEvent.name,
      source: telemetryEvent.source,
      tenantId: telemetryEvent.tenantId ?? undefined,
    });

    return ok(telemetryEvent);
  }

  const supabase = createRequestSupabaseClient({ accessToken });
  const { error } = await supabase.from("telemetry_events").insert({
    actor_principal_id: telemetryEvent.actor?.principalId,
    actor_type: telemetryEvent.actor?.type,
    branch_id: telemetryEvent.branchId,
    company_id: telemetryEvent.companyId,
    correlation_id: telemetryEvent.correlationId,
    event_name: telemetryEvent.name,
    experience: telemetryEvent.experience,
    metadata: telemetryEvent.metadata ?? {},
    metrics: telemetryEvent.metrics ?? [],
    outcome: telemetryEvent.outcome,
    request_id: telemetryEvent.requestId,
    severity: telemetryEvent.severity,
    source: telemetryEvent.source,
    source_key: telemetryEvent.sourceKey,
    span: telemetryEvent.span,
    tenant_id: telemetryEvent.tenantId,
    occurred_at: telemetryEvent.timestamp,
  });

  if (error) {
    logger.error("Telemetry event could not be recorded.", {
      correlationId: telemetryEvent.correlationId,
      error,
      name: telemetryEvent.name,
      source: telemetryEvent.source,
    });
  }

  return ok(telemetryEvent);
}
