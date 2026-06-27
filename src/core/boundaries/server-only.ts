import "server-only";

// Import this file at the top of infrastructure modules that must never enter
// the browser bundle. It documents and enforces the server-only boundary.
export const SERVER_ONLY_BOUNDARY = "server-only";

export function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("This module is restricted to the server runtime.");
  }
}
