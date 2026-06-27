import { defineModuleManifest } from "@/core/module";

import { PRODUCTCATEGORIES_PERMISSION_LIST } from "./permissions/permission-registry";

export const productCategoriesModuleManifest = defineModuleManifest({
  key: "product-categories",
  name: "Product Categories",
  access: "erp",
  permissions: PRODUCTCATEGORIES_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/product-categories"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
