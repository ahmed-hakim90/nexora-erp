import { definePermissionKey } from "./permission-key";

export const PLATFORM_PERMISSIONS = {
  accessErp: definePermissionKey("platform.erp.access"),
  accessPortal: definePermissionKey("platform.portal.access"),
  accessAdmin: definePermissionKey("platform.admin.access"),
  accessMarketplace: definePermissionKey("platform.marketplace.access"),
  accessConnector: definePermissionKey("platform.connector.access"),
  accessAutomation: definePermissionKey("platform.automation.access"),
  accessAi: definePermissionKey("platform.ai.access"),
  accessSandbox: definePermissionKey("platform.sandbox.access"),
  readUsers: definePermissionKey("platform.user.read"),
  manageUsers: definePermissionKey("platform.user.manage"),
  manageTenant: definePermissionKey("platform.tenant.manage"),
  manageBranches: definePermissionKey("platform.branch.manage"),
  readMemberships: definePermissionKey("platform.membership.read"),
  manageMemberships: definePermissionKey("platform.membership.manage"),
  manageRoles: definePermissionKey("platform.role.manage"),
  readPermissions: definePermissionKey("platform.permission.read"),
  readAuditLog: definePermissionKey("platform.audit.read"),
  manageFeatureFlags: definePermissionKey("platform.feature-flag.manage"),
  manageSettings: definePermissionKey("platform.settings.manage"),
} as const;

export type PlatformPermission =
  (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];
