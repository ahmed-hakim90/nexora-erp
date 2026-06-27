import { defineModuleManifest } from "@/core/module";

import { WAREHOUSELOCATIONS_PERMISSION_LIST } from "./permissions/permission-registry";

export const warehouseLocationsModuleManifest = defineModuleManifest({
  key: "warehouse-locations",
  name: "Warehouse Locations",
  access: "erp",
  permissions: WAREHOUSELOCATIONS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/warehouse-locations"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
