import "server-only";

import { headers } from "next/headers";

import { ApplicationError } from "@/core/errors";
import type { AccessExperience } from "@/core/context";

import type { AuthenticatedUser } from "./authenticated-context";
import { getAuthenticationProvider } from "./providers";
import type { CurrentSession, CurrentUser, PlatformPrincipal } from "./public-api";

export async function getCurrentSession(
  requestedExperience: AccessExperience = "system",
): Promise<CurrentSession | null> {
  const requestHeaders = await headers();
  const provider = getAuthenticationProvider();
  return provider.resolveSession({
    headers: requestHeaders,
    requestedExperience,
  });
}

export async function requireCurrentSession(
  requestedExperience: AccessExperience = "system",
): Promise<CurrentSession> {
  const session = await getCurrentSession(requestedExperience);

  if (!session) {
    throw new ApplicationError({
      code: "AUTHENTICATION_ERROR",
      message: "Authentication is required.",
    });
  }

  return session;
}

export async function refreshCurrentSession(): Promise<CurrentSession | null> {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return getAuthenticationProvider().refreshSession(session);
}

export async function invalidateCurrentSession(): Promise<void> {
  const session = await getCurrentSession();

  if (session) {
    await getAuthenticationProvider().invalidateSession(session);
  }
}

export async function resolveCurrentIdentity() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return getAuthenticationProvider().resolveCurrentIdentity(session);
}

export async function getCurrentPrincipal(): Promise<PlatformPrincipal | null> {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return (
    (await getAuthenticationProvider().resolveCurrentPrincipal(session)) ??
    session.principal
  );
}

export async function requireCurrentPrincipal(): Promise<PlatformPrincipal> {
  const principal = await getCurrentPrincipal();

  if (!principal) {
    throw new ApplicationError({
      code: "AUTHENTICATION_ERROR",
      message: "Authentication is required.",
    });
  }

  return principal;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const currentUser =
    (await getAuthenticationProvider().resolveCurrentUser(session)) ??
    ({
      displayName: session.identity.displayName,
      email: session.identity.email,
      id: session.identity.id,
      identity: session.identity,
      principal: session.principal,
      providerKey: session.providerKey,
      providerSubject: session.providerSubject,
    } satisfies CurrentUser);

  return {
    accessToken: session.credential.accessToken ?? session.accessToken ?? "",
    displayName: currentUser.displayName,
    email: currentUser.email,
    id: currentUser.id,
    identity: currentUser.identity,
    principal: currentUser.principal,
    providerSubject: currentUser.providerSubject,
  };
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new ApplicationError({
      code: "AUTHENTICATION_ERROR",
      message: "Authentication is required.",
    });
  }

  return user;
}
