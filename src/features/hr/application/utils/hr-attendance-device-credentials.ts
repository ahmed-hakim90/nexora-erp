import "server-only";

export function readDeviceMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function readDeviceCredentials(metadata: Record<string, unknown>): Record<string, unknown> {
  const credentials = metadata.credentials;
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) return {};
  return credentials as Record<string, unknown>;
}

export function mergeCommKeyIntoMetadata(
  metadata: Record<string, unknown>,
  commKey?: string,
): Record<string, unknown> {
  if (commKey === undefined) return metadata;

  const trimmed = commKey.trim();
  if (!trimmed) return metadata;

  const credentials = { ...readDeviceCredentials(metadata), commKey: trimmed };
  return { ...metadata, credentials };
}

export function stripCredentialsFromMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  if (!metadata.credentials) return metadata;
  const next = { ...metadata };
  delete next.credentials;
  return next;
}
