import { defineModuleManifest } from "@/core/module";

import { INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";

export const inventoryModuleManifest = defineModuleManifest({
  key: "inventory",
  name: "Inventory Transactions",
  access: "erp",
  permissions: INVENTORY_PERMISSION_LIST,
  statuses: ["draft", "submitted", "posted", "cancelled", "reversed"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenant, branch, permission, and RLS platform foundations.",
    },
  ],
  navigation: [
    "/erp/inventory",
    "/erp/inventory/events",
    "/erp/inventory/endpoints",
    "/erp/inventory/routes",
    "/erp/inventory/messages",
    "/erp/inventory/stock-ledger",
    "/erp/inventory/stock-balances",
    "/erp/inventory/posting-batches",
    "/erp/inventory/transactions",
    "/erp/inventory/stock-adjustment/new",
    "/erp/inventory/warehouse-transfer/new",
    "/erp/inventory/goods-receipt/new",
    "/erp/inventory/goods-issue/new",
    "/erp/inventory/cycle-count/new",
  ],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
