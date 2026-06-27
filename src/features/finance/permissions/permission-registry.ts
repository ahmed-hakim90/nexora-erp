import { definePermissionKey } from "@/platform/permissions/public-api";

export const FINANCE_PERMISSIONS = {
  accountsManage: definePermissionKey("finance.accounts.manage"),
  accountsView: definePermissionKey("finance.accounts.view"),
  auditView: definePermissionKey("finance.audit.view"),
  currenciesManage: definePermissionKey("finance.currencies.manage"),
  currenciesView: definePermissionKey("finance.currencies.view"),
  dimensionsManage: definePermissionKey("finance.dimensions.manage"),
  dimensionsView: definePermissionKey("finance.dimensions.view"),
  fiscalPeriodsManage: definePermissionKey("finance.fiscal-periods.manage"),
  fiscalPeriodsView: definePermissionKey("finance.fiscal-periods.view"),
  hooksManage: definePermissionKey("finance.document-hooks.manage"),
  journalsManage: definePermissionKey("finance.journals.manage"),
  journalsView: definePermissionKey("finance.journals.view"),
  paymentTermsManage: definePermissionKey("finance.payment-terms.manage"),
  paymentTermsView: definePermissionKey("finance.payment-terms.view"),
  postingReadinessView: definePermissionKey("finance.posting-readiness.view"),
  reportsView: definePermissionKey("finance.reports.view"),
  taxDefinitionsManage: definePermissionKey("finance.tax-definitions.manage"),
  taxDefinitionsView: definePermissionKey("finance.tax-definitions.view"),
} as const;

export const FINANCE_PERMISSION_LIST = Object.values(FINANCE_PERMISSIONS);
