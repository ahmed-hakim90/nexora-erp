import { defineModuleManifest } from "@/core/module";

import { MANUFACTURING_PERMISSION_LIST } from "./permissions/permission-registry";

export const manufacturingModuleManifest = defineModuleManifest({
  access: "erp",
  dependencies: [
    {
      moduleKey: "products",
      reason: "BOMs, production standards, and routing plans reference public product master records.",
      type: "reference",
    },
    {
      moduleKey: "units",
      reason: "BOM material quantities reference public unit master records.",
      type: "reference",
    },
  ],
  featureFlags: [],
  key: "manufacturing",
  name: "Manufacturing Foundation",
  navigation: [
    "/erp/manufacturing",
    "/erp/manufacturing/production-lines",
    "/erp/manufacturing/work-centers",
    "/erp/manufacturing/manufacturing-profiles",
    "/erp/manufacturing/line-assignments",
    "/erp/manufacturing/production-standards",
    "/erp/manufacturing/boms",
    "/erp/manufacturing/routing-plans",
  ],
  permissions: MANUFACTURING_PERMISSION_LIST,
  prints: [],
  reports: [],
  sensitiveData: "standard",
  statuses: ["active", "inactive", "draft", "obsolete"],
});
