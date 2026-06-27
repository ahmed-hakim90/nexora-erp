import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionAppLifecycle,
  defineAppManifest,
  definePermissionKey,
  generateNavigation,
  getAvailableAppsForContext,
  registerCommands,
  transitionAppLifecycle,
  validateAppDependencies,
  validateAppManifest,
  type AppEntitlement,
  type AppManifest,
  type AppRegistrySnapshot,
  type InstalledApp,
  type PermissionKey,
} from "@/platform/public-api";

const viewInventory = definePermissionKey("inventory.app.view");
const createInventory = definePermissionKey("inventory.item.create");
const viewEmployee = definePermissionKey("employee.portal.view");

const inventoryManifest = defineAppManifest({
  capabilities: [
    { key: "inventory-home", requiredPermission: viewInventory, type: "route" },
    { key: "create-item", requiredPermission: createInventory, type: "command" },
  ],
  category: "inventory",
  commands: [
    {
      actionType: "open-page",
      appKey: "inventory",
      category: "navigation",
      href: "/inventory",
      key: "inventory.open",
      label: "Open Inventory",
      order: 1,
      requiredPermission: viewInventory,
      scope: "global",
      supportedExperiences: ["erp"],
    },
    {
      actionType: "create-record",
      appKey: "inventory",
      category: "create",
      key: "inventory.item.create",
      label: "Create Item",
      order: 2,
      requiredPermission: createInventory,
      scope: "app",
      supportedExperiences: ["erp"],
    },
  ],
  dashboards: [],
  dependencies: [],
  description: "Inventory foundation app shell contribution.",
  experiences: ["erp"],
  featureFlags: ["inventory.enabled"],
  icon: "boxes",
  key: "inventory",
  name: "Inventory",
  navigation: [
    {
      appKey: "inventory",
      href: "/inventory",
      key: "inventory.launcher",
      kind: "app",
      label: "Inventory",
      order: 10,
      placement: "app-launcher",
      requiredPermission: viewInventory,
      requiredFeatureFlag: "inventory.enabled",
      supportedExperiences: ["erp"],
    },
    {
      appKey: "inventory",
      href: "/inventory",
      key: "inventory.sidebar",
      label: "Inventory",
      order: 10,
      placement: "contextual-sidebar",
      requiredPermission: viewInventory,
      supportedExperiences: ["erp"],
    },
    {
      appKey: "inventory",
      href: "/inventory/mobile",
      key: "inventory.mobile",
      label: "Inventory",
      order: 10,
      placement: "mobile-navigation",
      requiredPermission: viewInventory,
      supportedExperiences: ["erp"],
    },
  ],
  permissions: [viewInventory],
  prints: [],
  quickActions: [
    {
      appKey: "inventory",
      commandKey: "inventory.item.create",
      key: "inventory.quick-create",
      label: "Create Item",
      order: 1,
      requiredPermission: createInventory,
      scope: "app",
      supportedExperiences: ["erp"],
    },
  ],
  reports: [],
  routes: [
    {
      experience: "erp",
      key: "inventory.home",
      label: "Inventory",
      path: "/inventory",
      requiredPermission: viewInventory,
    },
  ],
  sensitiveData: "standard",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

const employeeManifest = defineAppManifest({
  capabilities: [{ key: "employee-home", requiredPermission: viewEmployee, type: "route" }],
  category: "hr",
  commands: [
    {
      actionType: "open-page",
      appKey: "employee-self-service",
      category: "navigation",
      href: "/portal/employee",
      key: "employee.open",
      label: "Open Employee Portal",
      requiredPermission: viewEmployee,
      scope: "global",
      supportedExperiences: ["employee-portal"],
    },
  ],
  dashboards: [],
  dependencies: [{ appKey: "inventory", isOptional: true, reason: "Can show issued equipment later." }],
  description: "Employee self-service portal contribution.",
  experiences: ["employee-portal"],
  key: "employee-self-service",
  name: "Employee Self Service",
  navigation: [
    {
      appKey: "employee-self-service",
      href: "/portal/employee",
      key: "employee.launcher",
      kind: "app",
      label: "Employee Portal",
      placement: "app-launcher",
      requiredPermission: viewEmployee,
      supportedExperiences: ["employee-portal"],
    },
  ],
  permissions: [viewEmployee],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [
    {
      experience: "employee-portal",
      key: "employee.home",
      label: "Employee Portal",
      path: "/portal/employee",
      requiredPermission: viewEmployee,
    },
  ],
  sensitiveData: "standard",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

const installedApps: readonly InstalledApp[] = [
  {
    appKey: "inventory",
    installedVersion: "1.0.0",
    state: "enabled",
    tenantId: "tenant-1",
  },
  {
    appKey: "employee-self-service",
    installedVersion: "1.0.0",
    state: "enabled",
    tenantId: "tenant-1",
  },
];

const entitlements: readonly AppEntitlement[] = [
  { appKey: "inventory", state: "enabled", tenantId: "tenant-1" },
  { appKey: "employee-self-service", state: "enabled", tenantId: "tenant-1" },
];

const snapshot: AppRegistrySnapshot = {
  entitlements,
  installedApps,
  manifests: [inventoryManifest, employeeManifest],
};

const grantedInventoryPermissions = new Set<PermissionKey>([
  viewInventory,
  createInventory,
]);

test("app manifest validation enforces required fields, semver, routes, and dependencies", () => {
  assert.deepEqual(validateAppManifest(inventoryManifest, [inventoryManifest]), {
    errors: [],
    valid: true,
  });

  assert.deepEqual(validateAppManifest({
    ...inventoryManifest,
    description: "",
    routes: [
      ...inventoryManifest.routes,
      {
        experience: "erp",
        key: "inventory.home",
        label: "Duplicate",
        path: "/inventory/duplicate",
      },
    ],
    version: "one",
  }, [inventoryManifest]), {
    errors: [
      "App description is required.",
      "App version must use semantic versioning.",
      "Duplicate route: inventory.home",
    ],
    valid: false,
  });
});

test("dependency validation rejects missing required dependencies and self dependencies", () => {
  assert.deepEqual(validateAppDependencies({
    ...inventoryManifest,
    dependencies: [
      { appKey: "inventory", reason: "Invalid self dependency." },
      { appKey: "finance", reason: "Required finance dependency." },
    ],
  }, [inventoryManifest]), [
    "App cannot depend on itself: inventory",
    "Missing required dependency: finance",
  ]);
});

test("lifecycle helpers validate and apply allowed app transitions", () => {
  const installed = transitionAppLifecycle({
    appKey: "inventory",
    installedVersion: "1.0.0",
    state: "available",
    tenantId: "tenant-1",
  }, "install");

  assert.equal(installed.state, "installed");
  assert.equal(canTransitionAppLifecycle("installed", "enable"), true);
  assert.equal(canTransitionAppLifecycle("archived", "health-check"), false);
  assert.throws(() => transitionAppLifecycle(installed, "suspend"), /Cannot suspend app/);
});

test("available apps are filtered by installation, entitlement, experience, permissions, and feature flags", () => {
  assert.deepEqual(getAvailableAppsForContext(snapshot, {
    enabledFeatureFlags: new Set(["inventory.enabled"]),
    experience: "erp",
    grantedPermissions: grantedInventoryPermissions,
    tenantId: "tenant-1",
  }).map((manifest) => manifest.key), ["inventory"]);

  assert.deepEqual(getAvailableAppsForContext(snapshot, {
    enabledFeatureFlags: new Set(["inventory.enabled"]),
    experience: "employee-portal",
    grantedPermissions: new Set([viewEmployee]),
    tenantId: "tenant-1",
  }).map((manifest) => manifest.key), ["employee-self-service"]);

  assert.deepEqual(getAvailableAppsForContext(snapshot, {
    experience: "api",
    grantedPermissions: grantedInventoryPermissions,
    tenantId: "tenant-1",
  }), []);
});

test("navigation generation produces launcher, sidebar, mobile, breadcrumbs, favorites, and recents", () => {
  const navigation = generateNavigation(snapshot, {
    activePath: "/inventory",
    enabledFeatureFlags: new Set(["inventory.enabled"]),
    experience: "erp",
    grantedPermissions: grantedInventoryPermissions,
    preferences: {
      favoriteNavigationKeys: ["inventory.launcher"],
      recentAppKeys: ["inventory"],
    },
    tenantId: "tenant-1",
  });

  assert.deepEqual(navigation.appLauncher.map((item) => item.key), ["inventory.launcher"]);
  assert.deepEqual(navigation.contextualSidebar.map((item) => item.key), ["inventory.sidebar"]);
  assert.deepEqual(navigation.mobileNavigation.map((item) => item.key), ["inventory.mobile"]);
  assert.deepEqual(navigation.favorites.map((item) => item.key), ["inventory.launcher"]);
  assert.deepEqual(navigation.recentApps.map((item) => item.key), [
    "inventory.launcher",
    "inventory.sidebar",
    "inventory.mobile",
  ]);
  assert.deepEqual(navigation.breadcrumbs.map((breadcrumb) => breadcrumb.label), [
    "Home",
    "Inventory",
    "Inventory",
  ]);
});

test("permission-filtered navigation hides missing-permission contributions", () => {
  const navigation = generateNavigation(snapshot, {
    enabledFeatureFlags: new Set(["inventory.enabled"]),
    experience: "erp",
    grantedPermissions: new Set<PermissionKey>(),
    tenantId: "tenant-1",
  });

  assert.deepEqual(navigation.appLauncher, []);
  assert.deepEqual(navigation.contextualSidebar, []);
});

test("command registration and quick actions are permission and experience aware", () => {
  const registry = registerCommands([inventoryManifest, employeeManifest], {
    enabledFeatureFlags: new Set(["inventory.enabled"]),
    experience: "erp",
    grantedPermissions: grantedInventoryPermissions,
    preferences: {
      favoriteCommandKeys: ["inventory.item.create"],
      recentCommandKeys: ["inventory.open"],
    },
    tenantId: "tenant-1",
  });

  assert.deepEqual(registry.commands.map((command) => command.key), [
    "inventory.open",
    "inventory.item.create",
  ]);
  assert.deepEqual(registry.quickActions.map((quickAction) => quickAction.key), [
    "inventory.quick-create",
  ]);
  assert.deepEqual(registry.favoriteCommands.map((command) => command.commandKey), [
    "inventory.item.create",
  ]);
  assert.deepEqual(registry.recentCommands.map((command) => command.commandKey), [
    "inventory.open",
  ]);

  assert.deepEqual(registerCommands([inventoryManifest, employeeManifest], {
    experience: "employee-portal",
    grantedPermissions: new Set([viewEmployee]),
    tenantId: "tenant-1",
  }).commands.map((command) => command.key), ["employee.open"]);
});
