import { defineModuleManifest } from "@/core/module";

import { BUSINESS_DOCUMENT_PERMISSION_LIST } from "./permissions/permission-registry";

export const businessDocumentsModuleManifest = defineModuleManifest({
  key: "business-documents",
  name: "Business Document Framework",
  access: "erp",
  permissions: BUSINESS_DOCUMENT_PERMISSION_LIST,
  statuses: ["draft", "open", "posted", "cancelled", "closed"],
  dependencies: [
    {
      moduleKey: "platform",
      type: "platform",
      reason: "Uses tenancy, RBAC, audit, numbering, workflow, approval, file, export, and RLS platform foundations.",
    },
  ],
  navigation: ["/erp/documents"],
  reports: [],
  prints: [],
  featureFlags: [],
  sensitiveData: "standard",
});
