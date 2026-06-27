import { defineModuleManifest } from "@/core/module";

import { TAXPROFILES_PERMISSION_LIST } from "./permissions/permission-registry";

export const taxProfilesModuleManifest = defineModuleManifest({
  key: "tax-profiles",
  name: "Tax Profiles",
  access: "erp",
  permissions: TAXPROFILES_PERMISSION_LIST,
  statuses: ["active", "inactive"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, audit, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/master-data/tax-profiles"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
