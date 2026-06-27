export type BrandingScope = "tenant" | "company" | "branch" | "app";

export type CompanyBranding = Readonly<{
  scope: BrandingScope;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  legalName: string;
  displayName: string;
  logoFileId?: string | null;
  primaryColorToken?: string | null;
  documentHeaderText?: string | null;
  documentFooterText?: string | null;
  reportFooterText?: string | null;
  notificationSenderName?: string | null;
}>;

export type BrandingContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  outputType: "shell" | "document" | "report" | "print" | "notification" | "dashboard";
}>;

export function defineCompanyBranding<TBranding extends CompanyBranding>(
  branding: TBranding,
): TBranding {
  return branding;
}
