import { definePermissionKey } from "@/platform/permissions/public-api";

export const FINANCIAL_PLATFORM_PERMISSIONS = {
  fiscalPeriodsView: definePermissionKey("financial.periods.view"),
  fiscalPeriodsManage: definePermissionKey("financial.periods.manage"),
  currenciesView: definePermissionKey("financial.currencies.view"),
  currenciesManage: definePermissionKey("financial.currencies.manage"),
  taxesView: definePermissionKey("financial.taxes.view"),
  taxesManage: definePermissionKey("financial.taxes.manage"),
  paymentsView: definePermissionKey("financial.payments.view"),
  paymentsManage: definePermissionKey("financial.payments.manage"),
  numberingView: definePermissionKey("financial.numbering.view"),
  numberingManage: definePermissionKey("financial.numbering.manage"),
  dimensionsView: definePermissionKey("financial.dimensions.view"),
  dimensionsManage: definePermissionKey("financial.dimensions.manage"),
  eventsView: definePermissionKey("financial.events.view"),
  eventsExecute: definePermissionKey("financial.events.execute"),
  postingSubmit: definePermissionKey("financial.posting.submit"),
  postingApprove: definePermissionKey("financial.posting.approve"),
  postingPost: definePermissionKey("financial.posting.post"),
  postingReverse: definePermissionKey("financial.posting.reverse"),
} as const;

export type FinancialPlatformPermission =
  (typeof FINANCIAL_PLATFORM_PERMISSIONS)[keyof typeof FINANCIAL_PLATFORM_PERMISSIONS];

export const FINANCIAL_PLATFORM_PERMISSION_LIST = Object.values(
  FINANCIAL_PLATFORM_PERMISSIONS,
);

