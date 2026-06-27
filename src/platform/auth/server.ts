import "server-only";

import type { AccessExperience } from "@/core/context";
import { ApplicationError } from "@/core/errors";
import { resolveRequestContext } from "@/core/context/server";
import {
  requireBranch,
  requireCompany,
  requireEmployee,
  requireTenant,
} from "@/platform/tenancy/server";

import type {
  AuthenticatedRequestContext,
  BranchRequestContext,
  CompanyRequestContext,
  EmployeeRequestContext,
  TenantRequestContext,
} from "./authenticated-context";
import {
  getCurrentPrincipal,
  getCurrentSession,
  getCurrentUser,
  invalidateCurrentSession,
  refreshCurrentSession,
  requireCurrentPrincipal,
  requireCurrentSession,
  requireCurrentUser,
  resolveCurrentIdentity,
} from "./current-user";
import { getCurrentProfile } from "./profile";
import {
  configureAuthenticationProvider,
  getAuthenticationProvider,
} from "./providers";

export {
  configureAuthenticationProvider,
  getAuthenticationProvider,
  getCurrentPrincipal,
  getCurrentSession,
  getCurrentUser,
  invalidateCurrentSession,
  refreshCurrentSession,
  requireCurrentPrincipal,
  requireCurrentSession,
  requireCurrentUser,
  resolveCurrentIdentity,
};
export { getCurrentProfile };
export type {
  AuthenticatedRequestContext,
  AuthenticatedUser,
  BranchRequestContext,
  CompanyRequestContext,
  EmployeeRequestContext,
  TenantRequestContext,
} from "./authenticated-context";
export type {
  AuthenticationProvider,
  AuthenticationProviderSessionRequest,
  CurrentBranch,
  CurrentCompany,
  CurrentEmployee,
  CurrentSession,
  CurrentTenant,
  CurrentUser,
  ExperienceAccess,
  IdentityProviderCapability,
  IdentityProviderKey,
  IdentityType,
  PlatformActor,
  PlatformExperience,
  PlatformIdentity,
  PlatformPrincipal,
  SessionContext,
  SessionCredential,
  SessionSelection,
  TenantContextSelection,
} from "./public-api";

export async function resolveAuthenticatedRequestContext(
  experience: AccessExperience,
): Promise<AuthenticatedRequestContext> {
  const [baseContext, session] = await Promise.all([
    resolveRequestContext(experience),
    requireCurrentSession(experience),
  ]);
  const currentUser = await getAuthenticationProvider().resolveCurrentUser(session);
  const currentPrincipal =
    (await getAuthenticationProvider().resolveCurrentPrincipal(session)) ??
    session.principal;
  const userId = currentUser?.id ?? session.identity.id;
  const accessToken = session.credential.accessToken ?? session.accessToken ?? "";

  return {
    ...baseContext,
    accessToken,
    credential: session.credential,
    currentUser: currentUser ?? {
      displayName: session.identity.displayName,
      email: session.identity.email,
      id: userId,
      identity: session.identity,
      principal: currentPrincipal,
      providerKey: session.providerKey,
      providerSubject: session.providerSubject,
    },
    currentPrincipal,
    identity: session.identity,
    identityId: session.identity.id,
    principal: currentPrincipal,
    principalId: currentPrincipal.id,
    providerKey: session.providerKey,
    session,
    userId,
  };
}

export const resolveSessionContext = resolveAuthenticatedRequestContext;

export async function resolveExperienceContext(
  experience: AccessExperience,
): Promise<AuthenticatedRequestContext> {
  const context = await resolveAuthenticatedRequestContext(experience);

  if (context.experience !== experience) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      correlationId: context.correlationId,
      message: "Request experience does not match the required platform experience.",
    });
  }

  return context;
}

export async function resolveTenantRequestContext(
  experience: AccessExperience,
): Promise<TenantRequestContext> {
  const context = await resolveAuthenticatedRequestContext(experience);
  const tenantId = await requireTenant();

  return {
    ...context,
    tenantId,
  };
}

export async function requireExperienceAccess(
  experience: AccessExperience,
): Promise<AuthenticatedRequestContext> {
  const context = await resolveAuthenticatedRequestContext(experience);

  if (context.experience !== experience) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      correlationId: context.correlationId,
      message: "Request experience does not match the required platform experience.",
    });
  }

  return context;
}

export async function resolveCompanyRequestContext(
  experience: AccessExperience,
): Promise<CompanyRequestContext> {
  const context = await resolveTenantRequestContext(experience);
  const companyId = await requireCompany();

  return {
    ...context,
    companyId,
  };
}

export async function resolveBranchRequestContext(
  experience: AccessExperience,
): Promise<BranchRequestContext> {
  const context = await resolveCompanyRequestContext(experience);
  const branchId = await requireBranch();

  return {
    ...context,
    branchId,
  };
}

export async function resolveEmployeeRequestContext(
  experience: AccessExperience,
): Promise<EmployeeRequestContext> {
  const context = await resolveTenantRequestContext(experience);
  const employeeId = await requireEmployee();

  return {
    ...context,
    employeeId,
  };
}
