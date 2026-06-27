import "server-only";

import { createRequestSupabaseClient } from "@/infrastructure/server";

import {
  defineAuthenticationProvider,
  defineIdentityProviderKey,
  type AuthenticationProvider,
  type AuthenticationProviderSessionRequest,
  type CurrentSession,
  type CurrentUser,
  type PlatformIdentity,
  type PlatformPrincipal,
} from "./public-api";

const SUPABASE_PROVIDER_KEY = defineIdentityProviderKey("supabase");
const REFRESH_TOKEN_HEADER = "x-nexora-refresh-token";

function readBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

function mapSupabaseUser(params: {
  id: string;
  email?: string;
  displayName?: string;
}): PlatformIdentity {
  return {
    displayName: params.displayName,
    email: params.email,
    id: params.id,
    providerKey: SUPABASE_PROVIDER_KEY,
    providerSubject: params.id,
    type: "user",
  };
}

function mapSupabasePrincipal(identity: PlatformIdentity): PlatformPrincipal {
  return {
    displayName: identity.displayName,
    email: identity.email,
    id: identity.id,
    identity,
    identityId: identity.id,
    providerKey: identity.providerKey,
    providerSubject: identity.providerSubject,
    type: identity.type,
  };
}

async function resolveProfile(
  session: CurrentSession,
): Promise<CurrentUser | null> {
  const accessToken = session.credential.accessToken ?? session.accessToken;

  if (!accessToken) {
    return null;
  }

  const supabase = createRequestSupabaseClient({ accessToken });
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", session.identity.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return null;
  }

  const identity = mapSupabaseUser({
    displayName: data?.display_name ?? session.identity.displayName,
    email: data?.email ?? session.identity.email,
    id: session.identity.id,
  });
  const principal = mapSupabasePrincipal(identity);

  return {
    displayName: identity.displayName,
    email: identity.email,
    id: identity.id,
    identity,
    principal,
    providerKey: SUPABASE_PROVIDER_KEY,
    providerSubject: identity.providerSubject,
  };
}

export function createSupabaseAuthenticationProvider(): AuthenticationProvider {
  return defineAuthenticationProvider({
    capabilities: ["password", "oauth", "refresh", "invalidate"],
    key: SUPABASE_PROVIDER_KEY,
    label: "Supabase Auth",
    async resolveSession(
      request: AuthenticationProviderSessionRequest,
    ): Promise<CurrentSession | null> {
      const accessToken = readBearerToken(request.headers.get("authorization"));

      if (!accessToken) {
        return null;
      }

      const supabase = createRequestSupabaseClient({ accessToken });
      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error || !data.user) {
        return null;
      }

      const identity = mapSupabaseUser({
        email: data.user.email,
        id: data.user.id,
      });
      const principal = mapSupabasePrincipal(identity);
      const refreshToken = request.headers.get(REFRESH_TOKEN_HEADER) ?? undefined;

      return {
        accessToken,
        credential: {
          accessToken,
          refreshToken,
          type: "bearer",
        },
        identity,
        principal,
        providerKey: SUPABASE_PROVIDER_KEY,
        providerSubject: identity.providerSubject,
      };
    },
    async refreshSession(session): Promise<CurrentSession | null> {
      const refreshToken = session.credential.refreshToken;

      if (!refreshToken) {
        return session;
      }

      const accessToken = session.credential.accessToken ?? session.accessToken;

      if (!accessToken) {
        return null;
      }

      const supabase = createRequestSupabaseClient({ accessToken });
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session?.access_token || !data.user) {
        return null;
      }

      const identity = mapSupabaseUser({
        email: data.user.email,
        id: data.user.id,
      });
      const principal = mapSupabasePrincipal(identity);

      return {
        accessToken: data.session.access_token,
        credential: {
          accessToken: data.session.access_token,
          expiresAt: data.session.expires_at
            ? new Date(data.session.expires_at * 1000).toISOString()
            : undefined,
          refreshToken: data.session.refresh_token,
          type: "bearer",
        },
        expiresAt: data.session.expires_at
          ? new Date(data.session.expires_at * 1000).toISOString()
          : undefined,
        identity,
        principal,
        providerKey: SUPABASE_PROVIDER_KEY,
        providerSubject: identity.providerSubject,
      };
    },
    async invalidateSession(session): Promise<void> {
      const accessToken = session.credential.accessToken ?? session.accessToken;

      if (!accessToken) {
        return;
      }

      const supabase = createRequestSupabaseClient({ accessToken });
      await supabase.auth.signOut();
    },
    async resolveCurrentIdentity(session): Promise<PlatformIdentity | null> {
      return session.identity;
    },
    async resolveCurrentPrincipal(session): Promise<PlatformPrincipal | null> {
      return session.principal;
    },
    resolveCurrentUser: resolveProfile,
  });
}
