import { definePermissionKey } from "@/platform/permissions/public-api";

export const PARTY_PLATFORM_PERMISSIONS = {
  view: definePermissionKey("party.parties.view"),
  create: definePermissionKey("party.parties.create"),
  edit: definePermissionKey("party.parties.edit"),
  delete: definePermissionKey("party.parties.delete"),
  manageContacts: definePermissionKey("party.contacts.manage"),
  manageAddresses: definePermissionKey("party.addresses.manage"),
  manageAttachments: definePermissionKey("party.attachments.manage"),
  assignRoles: definePermissionKey("party.roles.assign"),
  manageCategories: definePermissionKey("party.categories.manage"),
} as const;

export type PartyPlatformPermission =
  (typeof PARTY_PLATFORM_PERMISSIONS)[keyof typeof PARTY_PLATFORM_PERMISSIONS];

export const PARTY_PLATFORM_PERMISSION_LIST = Object.values(PARTY_PLATFORM_PERMISSIONS);

