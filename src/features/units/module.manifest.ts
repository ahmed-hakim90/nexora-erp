import { defineModuleManifest } from "@/core/module";

import { UNITS_PERMISSION_LIST } from "./permissions/permission-registry";

export const unitsModuleManifest = defineModuleManifest({
  key: "units",
  name: "Units",
  access: "erp",
  permissions: UNITS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/units"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
