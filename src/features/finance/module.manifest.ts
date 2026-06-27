import { defineModuleManifest } from "@/core/module";

import { FINANCE_PERMISSION_LIST } from "./permissions/permission-registry";

export const financeModuleManifest = defineModuleManifest({
  access: "erp",
  dependencies: [
    {
      moduleKey: "platform",
      reason: "Uses Platform v1.0 tenancy, RLS, permissions, app registry, document, event, search, report, print, dashboard, audit, job, and cost contracts.",
      type: "platform",
    },
    {
      moduleKey: "business-documents",
      reason: "Future financial documents will attach through the Document Engine; no financial document workflow is implemented here.",
      type: "platform",
    },
  ],
  featureFlags: [],
  key: "finance",
  name: "Finance Foundation",
  navigation: [
    "/erp/finance",
    "/erp/finance/chart-of-accounts",
    "/erp/finance/journals",
    "/erp/finance/fiscal-periods",
    "/erp/finance/currencies",
    "/erp/finance/taxes",
    "/erp/finance/payment-terms",
    "/erp/finance/dimensions",
  ],
  permissions: FINANCE_PERMISSION_LIST,
  prints: [],
  reports: [],
  sensitiveData: "sensitive",
  statuses: ["draft", "active", "inactive", "locked", "archived"],
});
