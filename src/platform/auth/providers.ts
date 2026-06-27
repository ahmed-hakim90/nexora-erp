import "server-only";

import type { AuthenticationProvider } from "./public-api";
import { createSupabaseAuthenticationProvider } from "./supabase-provider";

let configuredProvider: AuthenticationProvider | null = null;

export function getAuthenticationProvider(): AuthenticationProvider {
  configuredProvider ??= createSupabaseAuthenticationProvider();
  return configuredProvider;
}

export function configureAuthenticationProvider(
  provider: AuthenticationProvider,
): void {
  configuredProvider = provider;
}
