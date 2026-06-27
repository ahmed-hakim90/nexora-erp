export type CorrelationId = string & {
  readonly __brand: "CorrelationId";
};

const CORRELATION_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;

export function createCorrelationId(): CorrelationId {
  return crypto.randomUUID() as CorrelationId;
}

export function isCorrelationId(value: unknown): value is CorrelationId {
  return typeof value === "string" && CORRELATION_ID_PATTERN.test(value);
}

export function normalizeCorrelationId(value: unknown): CorrelationId {
  return isCorrelationId(value) ? value : createCorrelationId();
}
