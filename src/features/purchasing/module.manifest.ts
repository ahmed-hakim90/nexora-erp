import { defineModuleManifest } from "@/core/module";

import { PURCHASING_PERMISSION_LIST } from "./permissions/permission-registry";

export const purchasingModuleManifest = defineModuleManifest({
  access: "erp",
  dependencies: [
    {
      moduleKey: "business-documents",
      reason: "Purchasing documents use Sprint 6 document shells, comments, timeline, and attachments.",
      type: "platform",
    },
    {
      moduleKey: "inventory",
      reason: "Purchase receipt posting delegates to public inventory transaction services.",
      type: "reference",
    },
  ],
  featureFlags: [],
  key: "purchasing",
  name: "Purchasing Foundation",
  navigation: [
    "/erp/purchasing/requests",
    "/erp/purchasing/requests/new",
    "/erp/purchasing/rfqs",
    "/erp/purchasing/rfqs/new",
    "/erp/purchasing/orders",
    "/erp/purchasing/orders/new",
    "/erp/purchasing/receipts",
    "/erp/purchasing/receipts/new",
  ],
  permissions: PURCHASING_PERMISSION_LIST,
  prints: [],
  reports: [],
  sensitiveData: "standard",
  statuses: [
    "draft",
    "submitted",
    "approved",
    "rejected",
    "sent",
    "quoted",
    "confirmed",
    "partially_received",
    "received",
    "posted",
    "reversed",
    "closed",
    "cancelled",
  ],
});
