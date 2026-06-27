export type RuntimeBoundaryKind =
  | "browser-safe"
  | "server-only"
  | "edge-safe"
  | "background-worker";

export type BoundaryKind = RuntimeBoundaryKind;

export type RuntimeBoundary = Readonly<{
  kind: RuntimeBoundaryKind;
  name: string;
  description: string;
  mayUseBrowserApis: boolean;
  mayUseServerSecrets: boolean;
}>;

export const BROWSER_SAFE_BOUNDARY = {
  description: "May run in the browser and must not access server-only secrets.",
  kind: "browser-safe",
  mayUseBrowserApis: true,
  mayUseServerSecrets: false,
  name: "Browser safe",
} satisfies RuntimeBoundary;

export const SERVER_ONLY_RUNTIME_BOUNDARY = {
  description: "Runs only on the server and may access request-scoped services.",
  kind: "server-only",
  mayUseBrowserApis: false,
  mayUseServerSecrets: true,
  name: "Server only",
} satisfies RuntimeBoundary;

export function defineRuntimeBoundary<TBoundary extends RuntimeBoundary>(
  boundary: TBoundary,
): TBoundary {
  return boundary;
}
