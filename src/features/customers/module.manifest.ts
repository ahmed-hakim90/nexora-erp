import { defineModuleManifest } from "@/core/module";

import { CUSTOMERS_PERMISSION_LIST } from "./permissions/permission-registry";

export const customersModuleManifest = defineModuleManifest({
  key: "customers",
  name: "Customers",
  access: "erp",
  permissions: CUSTOMERS_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/customers"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "sensitive",
});
