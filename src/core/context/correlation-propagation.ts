import type { CorrelationId } from "./correlation-id";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export type CorrelationHeaders = Readonly<
  Record<typeof CORRELATION_ID_HEADER, string>
>;

export type CorrelationMetadata = Readonly<{
  correlationId: string;
}>;

export type CorrelationPropagationStrategy = Readonly<{
  responseHeaders: CorrelationHeaders;
  backgroundJob: CorrelationMetadata;
  outboxEvent: CorrelationMetadata;
  auditLog: CorrelationMetadata;
  externalCallHeaders: CorrelationHeaders;
}>;

export function createCorrelationHeaders(
  correlationId: CorrelationId | string,
): CorrelationHeaders {
  return {
    [CORRELATION_ID_HEADER]: correlationId,
  };
}

export function createCorrelationMetadata(
  correlationId: CorrelationId | string,
): CorrelationMetadata {
  return {
    correlationId,
  };
}

export function createCorrelationPropagationStrategy(
  correlationId: CorrelationId | string,
): CorrelationPropagationStrategy {
  return {
    auditLog: createCorrelationMetadata(correlationId),
    backgroundJob: createCorrelationMetadata(correlationId),
    externalCallHeaders: createCorrelationHeaders(correlationId),
    outboxEvent: createCorrelationMetadata(correlationId),
    responseHeaders: createCorrelationHeaders(correlationId),
  };
}
