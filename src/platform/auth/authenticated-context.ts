import type { RequestContext } from "@/core/context";
import type {
  CurrentSession,
  CurrentUser,
  PlatformIdentity,
  PlatformPrincipal,
  SessionCredential,
} from "./public-api";

export type AuthenticatedUser = Readonly<{
  id: string;
  email?: string;
  displayName?: string;
  identity: PlatformIdentity;
  principal: PlatformPrincipal;
  providerSubject: string;
  accessToken: string;
}>;

export type AuthenticatedRequestContext = RequestContext &
  Readonly<{
    userId: string;
    identityId: string;
    identity: PlatformIdentity;
    principalId: string;
    principal: PlatformPrincipal;
    currentPrincipal: PlatformPrincipal;
    currentUser: CurrentUser;
    session: CurrentSession;
    credential: SessionCredential;
    providerKey: CurrentSession["providerKey"];
    accessToken: string;
  }>;

export type TenantRequestContext = AuthenticatedRequestContext &
  Readonly<{
    tenantId: string;
  }>;

export type CompanyRequestContext = TenantRequestContext &
  Readonly<{
    companyId: string;
  }>;

export type BranchRequestContext = CompanyRequestContext &
  Readonly<{
    branchId: string;
  }>;

export type EmployeeRequestContext = TenantRequestContext &
  Readonly<{
    employeeId: string;
  }>;
