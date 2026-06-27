import { defineModuleManifest } from "@/core/module";

import { PRODUCTS_PERMISSION_LIST } from "./permissions/permission-registry";

export const productsModuleManifest = defineModuleManifest({
  key: "products",
  name: "Products",
  access: "erp",
  permissions: PRODUCTS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/products"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
