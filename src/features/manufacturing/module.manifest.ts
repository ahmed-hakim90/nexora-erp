import { defineModuleManifest } from "@/core/module";

import { MANUFACTURING_PERMISSION_LIST } from "./permissions/permission-registry";

export const manufacturingModuleManifest = defineModuleManifest({
  access: "erp",
  dependencies: [
    {
      moduleKey: "platform",
      reason: "Uses Platform v1.0 tenancy, RLS, permissions, document, event, workflow, approval, notification, search, report, print, dashboard, import/export, background job, and cost contracts.",
      type: "platform",
    },
    {
      moduleKey: "finance",
      reason: "Uses Finance Foundation posting-readiness contracts only; no finance logic is implemented.",
      type: "reference",
    },
    {
      moduleKey: "inventory",
      reason: "Uses Inventory Foundation raw material issue, WIP, receipt, return, and material return contracts only.",
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
    "/erp/manufacturing/workstations",
    "/erp/manufacturing/machines",
    "/erp/manufacturing/production-cells",
    "/erp/manufacturing/plans",
    "/erp/manufacturing/targets",
    "/erp/manufacturing/daily-reports",
    "/erp/manufacturing/orders",
    "/erp/manufacturing/boms",
    "/erp/manufacturing/routings",
    "/erp/manufacturing/operations",
  ],
  permissions: MANUFACTURING_PERMISSION_LIST,
  prints: [],
  reports: [],
  sensitiveData: "sensitive",
  statuses: ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"],
});
