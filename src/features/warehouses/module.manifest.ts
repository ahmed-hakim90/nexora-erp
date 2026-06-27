import { defineModuleManifest } from "@/core/module";

import { WAREHOUSES_PERMISSION_LIST } from "./permissions/permission-registry";

export const warehousesModuleManifest = defineModuleManifest({
  key: "warehouses",
  name: "Warehouses",
  access: "erp",
  permissions: WAREHOUSES_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/warehouses"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
