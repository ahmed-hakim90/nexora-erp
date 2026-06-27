import { defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

import { FINANCE_PERMISSIONS } from "./permissions/permission-registry";

export const financeAppManifest = defineAppManifest({
  capabilities: [
    { key: "finance.navigation", requiredPermission: FINANCE_PERMISSIONS.accountsView, type: "navigation" },
    { key: "finance.search", requiredPermission: FINANCE_PERMISSIONS.accountsView, type: "search" },
    { key: "finance.reports", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "report" },
    { key: "finance.prints", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "print" },
    { key: "finance.dashboards", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "dashboard" },
    { key: "finance.document-hooks", requiredPermission: FINANCE_PERMISSIONS.hooksManage, type: "workflow" },
  ],
  category: "finance",
  commands: [
    {
      actionType: "open-page",
      appKey: "finance",
      category: "navigation",
      href: "/erp/finance",
      key: "finance.open",
      label: "Open Finance Foundation",
      order: 10,
      requiredPermission: FINANCE_PERMISSIONS.accountsView,
      scope: "global",
      supportedExperiences: ["erp"],
    },
  ],
  dashboards: [
    { key: "finance.foundation.dashboard-readiness", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "dashboard" },
  ],
  dependencies: [
    { appKey: "platform", reason: "Relies on Platform v1.0 app registry, security, data/RLS, document, event, reporting, printing, dashboard, audit, job, and cost contracts." },
    { appKey: "business-documents", isOptional: true, reason: "Future financial documents will be registered through document contracts only." },
  ],
  description: "Foundation-only Finance app for chart of accounts, journals, fiscal definitions, dimensions, and financial readiness contracts.",
  experiences: ["erp"],
  featureFlags: [],
  icon: "landmark",
  key: "finance",
  name: "Finance Foundation",
  navigation: [
    {
      appKey: "finance",
      href: "/erp/finance",
      key: "finance.launcher",
      kind: "app",
      label: "Finance",
      order: 20,
      placement: "app-launcher",
      requiredPermission: FINANCE_PERMISSIONS.accountsView,
      supportedExperiences: ["erp"],
    },
    {
      appKey: "finance",
      href: "/erp/finance",
      key: "finance.sidebar",
      label: "Finance Foundation",
      order: 20,
      placement: "contextual-sidebar",
      requiredPermission: FINANCE_PERMISSIONS.accountsView,
      supportedExperiences: ["erp"],
    },
  ],
  permissions: [
    FINANCE_PERMISSIONS.accountsView,
  ],
  prints: [
    { key: "finance.foundation.print-readiness", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "print" },
  ],
  quickActions: [],
  reports: [
    { key: "finance.foundation.report-readiness", requiredPermission: FINANCE_PERMISSIONS.reportsView, type: "report" },
  ],
  routes: [
    {
      experience: "erp",
      key: "finance.home",
      label: "Finance Foundation",
      path: "/erp/finance",
      requiredPermission: FINANCE_PERMISSIONS.accountsView,
    },
  ],
  sensitiveData: "sensitive",
  settings: [
    { key: "finance.foundation.settings", requiredPermission: FINANCE_PERMISSIONS.accountsManage, type: "setting" },
  ],
  statuses: ["draft", "active", "inactive", "locked", "archived"],
  version: "1.0.0",
} satisfies AppManifest);
