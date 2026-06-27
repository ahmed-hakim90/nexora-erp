import type { AccessExperience, ActorType, RequestContext } from "@/core/context";

export type IdentityProviderKey = string & {
  readonly __brand: "IdentityProviderKey";
};

export type IdentityType =
  | "user"
  | "employee"
  | "customer"
  | "supplier"
  | "driver"
  | "technician"
  | "service-account"
  | "integration"
  | "automation"
  | "ai-agent";

export type PrincipalType = IdentityType;

export type PlatformExperience = AccessExperience;
export type ExperienceAccess = AccessExperience;

export type IdentityProviderCapability =
  | "password"
  | "oauth"
  | "sso"
  | "refresh"
  | "invalidate"
  | "service-account"
  | "mfa"
  | "enterprise-directory";

export type PlatformIdentity = Readonly<{
  id: string;
  type: IdentityType;
  providerKey: IdentityProviderKey;
  providerSubject: string;
  email?: string;
  displayName?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PlatformActor = Readonly<{
  actorType: ActorType;
  identity: PlatformIdentity;
  principal: PlatformPrincipal;
}>;

export type PlatformPrincipal = Readonly<{
  id: string;
  type: PrincipalType;
  identityId: string;
  identity: PlatformIdentity;
  providerKey: IdentityProviderKey;
  providerSubject: string;
  email?: string;
  displayName?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type CurrentUser = Readonly<{
  id: string;
  providerKey: IdentityProviderKey;
  providerSubject: string;
  email?: string;
  displayName?: string;
  identity: PlatformIdentity;
  principal: PlatformPrincipal;
}>;

export type PublicUserProfile = Readonly<{
  id: string;
  email?: string;
  displayName?: string;
}>;

export type SessionCredential = Readonly<{
  type: "bearer" | "cookie" | "service-token" | "none";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}>;

export type CurrentSession = Readonly<{
  id?: string;
  providerKey: IdentityProviderKey;
  providerSubject: string;
  identity: PlatformIdentity;
  principal: PlatformPrincipal;
  credential: SessionCredential;
  issuedAt?: string;
  expiresAt?: string;
  accessToken?: string;
}>;

export type SessionContext = RequestContext &
  Readonly<{
    session: CurrentSession;
    identity: PlatformIdentity;
    principal: PlatformPrincipal;
    currentPrincipal: PlatformPrincipal;
    currentUser?: CurrentUser;
    userId?: string;
    identityId: string;
    principalId: string;
    providerKey: IdentityProviderKey;
    credential: SessionCredential;
    accessToken?: string;
  }>;

export type TenantContextSelection = Readonly<{
  tenantId?: string;
  companyId?: string;
  branchId?: string;
  employeeId?: string;
  experience: PlatformExperience;
}>;

export type SessionSelection = TenantContextSelection;

export type CurrentTenant = Readonly<{
  tenantId: string;
}>;

export type CurrentCompany = CurrentTenant &
  Readonly<{
    companyId: string;
  }>;

export type CurrentBranch = CurrentCompany &
  Readonly<{
    branchId: string;
  }>;

export type CurrentEmployee = CurrentTenant &
  Readonly<{
    employeeId: string;
  }>;

export type AuthenticationProviderSessionRequest = Readonly<{
  headers: Pick<Headers, "get">;
  requestedExperience: PlatformExperience;
}>;

export type AuthenticationProvider = Readonly<{
  key: IdentityProviderKey;
  label: string;
  capabilities: readonly IdentityProviderCapability[];
  resolveSession(
    request: AuthenticationProviderSessionRequest,
  ): Promise<CurrentSession | null>;
  refreshSession(session: CurrentSession): Promise<CurrentSession | null>;
  invalidateSession(session: CurrentSession): Promise<void>;
  resolveCurrentIdentity(session: CurrentSession): Promise<PlatformIdentity | null>;
  resolveCurrentPrincipal(session: CurrentSession): Promise<PlatformPrincipal | null>;
  resolveCurrentUser(session: CurrentSession): Promise<CurrentUser | null>;
}>;

export function defineIdentityProviderKey(value: string): IdentityProviderKey {
  return value as IdentityProviderKey;
}

export function defineAuthenticationProvider<TProvider extends AuthenticationProvider>(
  provider: TProvider,
): TProvider {
  return provider;
}
