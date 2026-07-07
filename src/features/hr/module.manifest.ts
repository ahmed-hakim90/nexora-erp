import { defineModuleManifest } from "@/core/module";

import { HR_PERMISSION_LIST } from "./permissions/permission-registry";

export const hrModuleManifest = defineModuleManifest({
  key: "hr",
  name: "HR Core Foundation",
  access: "erp",
  permissions: HR_PERMISSION_LIST,
  statuses: ["draft", "active", "inactive", "locked", "archived"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses Platform tenancy, company/branch scope, party registry, RLS, permissions, document, event, audit, search, import/export, reporting, printing, dashboard, and job contracts.",
    },
  ],
  navigation: [
    "/erp/hr",
  ],
  reports: ["hr.foundation.readiness"],
  prints: ["hr.foundation.readiness-print"],
  featureFlags: [],
  sensitiveData: "restricted",
});
