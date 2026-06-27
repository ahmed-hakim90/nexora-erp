export {
  PARTY_PLATFORM_PERMISSION_LIST,
  PARTY_PLATFORM_PERMISSIONS,
} from "./permissions";
export type { PartyPlatformPermission } from "./permissions";

export const PARTY_ROLE_TYPES = [
  "customer",
  "supplier",
  "employee",
  "driver",
  "company",
  "branch",
  "manufacturer",
  "distributor",
  "carrier",
  "service-center",
  "vendor",
  "government-entity",
  "individual",
] as const;

export const PARTY_ADDRESS_TYPES = [
  "billing",
  "shipping",
  "warehouse",
  "office",
  "factory",
  "branch",
  "home",
] as const;

export type PartyRoleType = (typeof PARTY_ROLE_TYPES)[number];
export type PartyAddressType = (typeof PARTY_ADDRESS_TYPES)[number];
export type PartyStatus = "active" | "inactive" | "blocked" | "archived" | "pending-approval";
export type PartyKind = "organization" | "individual" | "government" | "internal";
export type PreferredContactMethod =
  | "email"
  | "mobile"
  | "phone"
  | "whatsapp"
  | "website"
  | "none";
export type PartyTimelineEventType =
  | "created"
  | "updated"
  | "role_assigned"
  | "role_removed"
  | "contact_added"
  | "address_added"
  | "attachment_added"
  | "note_added"
  | "status_changed";

export type Party = Readonly<{
  id?: string;
  tenantId: string;
  partyNumber?: string | null;
  displayName: string;
  legalName?: string | null;
  kind: PartyKind;
  status: PartyStatus;
  preferredLanguage?: "ar" | "en" | string | null;
  timezone?: string | null;
  website?: string | null;
  notes?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PartyRole = Readonly<{
  partyId: string;
  roleType: PartyRoleType;
  categoryKey?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  isPrimary?: boolean;
}>;

export type PartyCategory = Readonly<{
  key: string;
  tenantId: string;
  label: string;
  roleType?: PartyRoleType | null;
  description?: string | null;
}>;

export type PartyContact = Readonly<{
  partyId: string;
  name: string;
  jobTitle?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  notes?: string | null;
  preferredContactMethod: PreferredContactMethod;
  isDefault?: boolean;
}>;

export type PartyAddress = Readonly<{
  partyId: string;
  type: PartyAddressType;
  country: string;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  line1?: string | null;
  line2?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}>;

export type PartyCommunicationProfile = Readonly<{
  partyId: string;
  phones?: readonly string[];
  emails?: readonly string[];
  website?: string | null;
  socialLinks?: Readonly<Record<string, string>>;
  whatsapp?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  preferredContactMethod?: PreferredContactMethod;
}>;

export type PartyLegalIdentity = Readonly<{
  partyId: string;
  legalName?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
  commercialRegistration?: string | null;
  nationalId?: string | null;
  passportNumber?: string | null;
  registrationCountry?: string | null;
}>;

export type PartyAttachmentLink = Readonly<{
  partyId: string;
  fileAttachmentId: string;
  attachmentRole: "document" | "contract" | "certificate" | "image" | "file" | string;
  notes?: string | null;
}>;

export type PartyTimelineEvent = Readonly<{
  partyId: string;
  eventType: PartyTimelineEventType;
  body?: string | null;
  mentionedUserIds?: readonly string[];
  isInternal?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export function defineParty<TParty extends Party>(party: TParty): TParty {
  return party;
}

export function definePartyCategory<TCategory extends PartyCategory>(
  category: TCategory,
): TCategory {
  return category;
}

export function definePartyRole<TRole extends PartyRole>(role: TRole): TRole {
  return role;
}

export function definePartyContact<TContact extends PartyContact>(
  contact: TContact,
): TContact {
  return contact;
}

export function definePartyAddress<TAddress extends PartyAddress>(
  address: TAddress,
): TAddress {
  return address;
}

