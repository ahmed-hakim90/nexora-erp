export type CertificationStatus = "draft" | "in_review" | "certified" | "rejected" | "deprecated";

export type MarketplaceListing = Readonly<{
  key: string;
  appKey: string;
  title: string;
  summary: string;
  version: string;
  certificationStatus: CertificationStatus;
  requiredDependencies: readonly string[];
  categories: readonly string[];
}>;

export type ConnectorCatalogEntry = Readonly<{
  key: string;
  title: string;
  direction: "inbound" | "outbound" | "bidirectional";
  requiresCredentials: boolean;
  certificationStatus: CertificationStatus;
}>;

export type InstallationRequest = Readonly<{
  listingKey: string;
  tenantId: string;
  requestedByUserId: string;
  requestedAt: string;
  status: "requested" | "approved" | "rejected" | "installed";
}>;

export function defineMarketplaceListing<TListing extends MarketplaceListing>(
  listing: TListing,
): TListing {
  return listing;
}
