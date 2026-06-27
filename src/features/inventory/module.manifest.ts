import { defineModuleManifest } from "@/core/module";

import { INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";

export const inventoryModuleManifest = defineModuleManifest({
  key: "inventory",
  name: "Inventory Foundation",
  access: "erp",
  permissions: INVENTORY_PERMISSION_LIST,
  statuses: ["draft", "active", "inactive", "locked", "archived"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses Platform v1.0 tenancy, company/branch scope, RLS, permissions, document, event, search, import/export, reporting, printing, dashboard, job, and cost contracts.",
    },
    {
      moduleKey: "finance",
      type: "reference",
      reason: "Uses Finance Foundation posting-readiness contracts only; no accounting postings are implemented.",
    },
  ],
  navigation: [
    "/erp/inventory",
    "/erp/inventory/products",
    "/erp/inventory/uoms",
    "/erp/inventory/warehouses",
    "/erp/inventory/locations",
    "/erp/inventory/lots",
    "/erp/inventory/serials",
    "/erp/inventory/movement-contracts",
    "/erp/inventory/stock-balances",
    "/erp/inventory/reorder-rules",
  ],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "sensitive",
});
