import { defineModuleManifest } from "@/core/module";

import { SUPPLIERS_PERMISSION_LIST } from "./permissions/permission-registry";

export const suppliersModuleManifest = defineModuleManifest({
  key: "suppliers",
  name: "Suppliers",
  access: "erp",
  permissions: SUPPLIERS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/suppliers"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "sensitive",
});
