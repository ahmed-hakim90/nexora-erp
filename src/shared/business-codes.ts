export type BusinessCodeCase = "lower" | "upper";

export type BusinessCodeScope = "tenant" | "company" | "branch";

export type BusinessCodeConfig = Readonly<{
  prefix: string;
  scope: BusinessCodeScope;
  sequenceWidth?: number;
  storageCase?: BusinessCodeCase;
  displayCase?: BusinessCodeCase;
}>;

const DEFAULT_SEQUENCE_WIDTH = 4;

export function normalizeBusinessCode(value: string, config: BusinessCodeConfig) {
  const trimmed = value.trim();
  return config.storageCase === "upper" ? trimmed.toUpperCase() : trimmed.toLowerCase();
}

export function displayBusinessCode(value: unknown, config?: BusinessCodeConfig) {
  const text = value === null || value === undefined ? "" : String(value);
  if (!config) return text;
  return config.displayCase === "lower" ? text.toLowerCase() : text.toUpperCase();
}

export function formatBusinessCodeSequence(prefix: string, sequence: number, config?: Pick<BusinessCodeConfig, "sequenceWidth" | "storageCase">) {
  const width = config?.sequenceWidth ?? DEFAULT_SEQUENCE_WIDTH;
  const code = `${prefix}-${String(sequence).padStart(width, "0")}`;
  return config?.storageCase === "upper" ? code.toUpperCase() : code.toLowerCase();
}

export function parseBusinessCodeSequence(value: unknown, prefix: string) {
  if (typeof value !== "string") return null;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = value.trim().match(new RegExp(`^${escapedPrefix}-(\\d+)$`, "iu"));
  return match ? Number(match[1]) : null;
}
