const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRawUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function formatHrDisplayLabel(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (isRawUuid(text)) return fallback;
  return text;
}

export function formatHrStatusLabel(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

export function readContactField(contactInfo: unknown, key: string): string | null {
  if (!contactInfo || typeof contactInfo !== "object" || Array.isArray(contactInfo)) return null;
  const value = (contactInfo as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}
