import { defineModuleManifest } from "@/core/module";

import { BRANDS_PERMISSION_LIST } from "./permissions/permission-registry";

export const brandsModuleManifest = defineModuleManifest({
  key: "brands",
  name: "Brands",
  access: "erp",
  permissions: BRANDS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/brands"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
