import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  PartyAddress,
  PartyContact,
  PartyRole,
  PartyRoleType,
  PartyStatus,
} from "./public-api";

const TERMINAL_PARTY_STATUSES = new Set<PartyStatus>(["archived"]);

export function assertUniquePartyRoles(roles: readonly PartyRole[]): void {
  const seen = new Set<PartyRoleType>();

  for (const role of roles) {
    if (seen.has(role.roleType)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "A party cannot have duplicate active role assignments.",
      });
    }

    seen.add(role.roleType);
  }
}

export function partyHasRole(
  roles: readonly PartyRole[],
  roleType: PartyRoleType,
): boolean {
  return roles.some((role) => role.roleType === roleType);
}

export function assertPartyStatusTransition(params: {
  from: PartyStatus;
  to: PartyStatus;
}): void {
  if (params.from === params.to) {
    return;
  }

  if (TERMINAL_PARTY_STATUSES.has(params.from)) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Archived parties cannot transition to another status.",
    });
  }
}

export function selectDefaultPartyContact(
  contacts: readonly PartyContact[],
): PartyContact | null {
  return contacts.find((contact) => contact.isDefault) ?? contacts[0] ?? null;
}

export function selectDefaultPartyAddress(
  addresses: readonly PartyAddress[],
  type?: PartyAddress["type"],
): PartyAddress | null {
  const candidates = type
    ? addresses.filter((address) => address.type === type)
    : addresses;

  return candidates.find((address) => address.isDefault) ?? candidates[0] ?? null;
}

