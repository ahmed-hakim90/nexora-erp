import "server-only";

import type { AuthenticatedUser } from "./authenticated-context";
import { getAuthenticationProvider } from "./providers";
import type { PublicUserProfile } from "./public-api";

export async function getCurrentProfile(
  user: AuthenticatedUser,
): Promise<PublicUserProfile | null> {
  const currentUser = await getAuthenticationProvider().resolveCurrentUser({
    accessToken: user.accessToken,
    credential: {
      accessToken: user.accessToken,
      type: "bearer",
    },
    identity: user.identity,
    principal: user.principal,
    providerKey: user.identity.providerKey,
    providerSubject: user.providerSubject,
  });

  if (!currentUser) {
    return null;
  }

  return {
    displayName: currentUser.displayName,
    email: currentUser.email,
    id: currentUser.id,
  };
}
