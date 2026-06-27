import { defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

import { INVENTORY_PERMISSIONS } from "./permissions/permission-registry";

export const inventoryAppManifest = defineAppManifest({
  capabilities: [
    { key: "inventory.navigation", requiredPermission: INVENTORY_PERMISSIONS.productsView, type: "navigation" },
    { key: "inventory.search", requiredPermission: INVENTORY_PERMISSIONS.searchView, type: "search" },
    { key: "inventory.reports", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "report" },
    { key: "inventory.prints", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "print" },
    { key: "inventory.dashboards", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "dashboard" },
    { key: "inventory.import-export", requiredPermission: INVENTORY_PERMISSIONS.importExportManage, type: "connector" },
    { key: "inventory.document-contracts", requiredPermission: INVENTORY_PERMISSIONS.movementsView, type: "workflow" },
  ],
  category: "operations",
  commands: [
    {
      actionType: "open-page",
      appKey: "inventory",
      category: "navigation",
      href: "/erp/inventory",
      key: "inventory.open",
      label: "Open Inventory Foundation",
      order: 30,
      requiredPermission: INVENTORY_PERMISSIONS.productsView,
      scope: "global",
      supportedExperiences: ["erp"],
    },
  ],
  dashboards: [
    { key: "inventory.foundation.dashboard-readiness", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "dashboard" },
  ],
  dependencies: [
    { appKey: "platform", reason: "Relies on Platform v1.0 app registry, security, data/RLS, document, event, search, import/export, report, print, dashboard, audit, job, and cost contracts." },
    { appKey: "finance", reason: "Consumes accepted Finance Foundation posting-readiness contracts without accounting postings." },
  ],
  description: "Foundation-only Inventory app for products, UOMs, warehouses, stock document contracts, quantities, reservations, reorder definitions, and integration readiness.",
  experiences: ["erp"],
  featureFlags: [],
  icon: "boxes",
  key: "inventory",
  name: "Inventory Foundation",
  navigation: [
    {
      appKey: "inventory",
      href: "/erp/inventory",
      key: "inventory.launcher",
      kind: "app",
      label: "Inventory",
      order: 30,
      placement: "app-launcher",
      requiredPermission: INVENTORY_PERMISSIONS.productsView,
      supportedExperiences: ["erp"],
    },
    {
      appKey: "inventory",
      href: "/erp/inventory",
      key: "inventory.sidebar",
      label: "Inventory Foundation",
      order: 30,
      placement: "contextual-sidebar",
      requiredPermission: INVENTORY_PERMISSIONS.productsView,
      supportedExperiences: ["erp"],
    },
  ],
  permissions: [
    INVENTORY_PERMISSIONS.productsView,
    INVENTORY_PERMISSIONS.uomsView,
    INVENTORY_PERMISSIONS.warehousesView,
    INVENTORY_PERMISSIONS.stockView,
  ],
  prints: [
    { key: "inventory.foundation.print-readiness", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "print" },
  ],
  quickActions: [],
  reports: [
    { key: "inventory.foundation.report-readiness", requiredPermission: INVENTORY_PERMISSIONS.reportsView, type: "report" },
  ],
  routes: [
    {
      experience: "erp",
      key: "inventory.home",
      label: "Inventory Foundation",
      path: "/erp/inventory",
      requiredPermission: INVENTORY_PERMISSIONS.productsView,
    },
  ],
  sensitiveData: "sensitive",
  settings: [
    { key: "inventory.foundation.settings", requiredPermission: INVENTORY_PERMISSIONS.warehousesManage, type: "setting" },
  ],
  statuses: ["draft", "active", "inactive", "locked", "archived"],
  version: "1.0.0",
} satisfies AppManifest);
