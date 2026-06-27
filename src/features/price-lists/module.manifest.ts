import { defineModuleManifest } from "@/core/module";

import { PRICELISTS_PERMISSION_LIST } from "./permissions/permission-registry";

export const priceListsModuleManifest = defineModuleManifest({
  key: "price-lists",
  name: "Price Lists",
  access: "erp",
  permissions: PRICELISTS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/price-lists"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
