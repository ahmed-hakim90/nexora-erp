import "server-only";

import { PLATFORM_PERMISSIONS, type PermissionKey } from "@/platform/permissions/public-api";

import { requireErpRouteAccess, type ErpRouteAccess } from "./erp-security.server";

export type PlatformCapabilityKey =
  | "dashboard"
  | "notifications"
  | "settings"
  | "reports"
  | "featureFlags"
  | "preferences"
  | "search"
  | "workflow"
  | "approval"
  | "administration";

export type PlatformCapabilityAccess = Readonly<{
  permission: PermissionKey;
  resource: string;
}>;

export const ERP_PLATFORM_CAPABILITY_ACCESS: Readonly<Record<PlatformCapabilityKey, PlatformCapabilityAccess>> = {
  administration: {
    permission: PLATFORM_PERMISSIONS.accessAdmin,
    resource: "platform.administration",
  },
  approval: {
    permission: PLATFORM_PERMISSIONS.viewApproval,
    resource: "platform.approval-center",
  },
  dashboard: {
    permission: PLATFORM_PERMISSIONS.accessErp,
    resource: "platform.dashboard",
  },
  featureFlags: {
    permission: PLATFORM_PERMISSIONS.manageFeatureFlags,
    resource: "platform.feature-flags",
  },
  notifications: {
    permission: PLATFORM_PERMISSIONS.viewNotifications,
    resource: "platform.notifications",
  },
  preferences: {
    permission: PLATFORM_PERMISSIONS.accessErp,
    resource: "platform.preferences",
  },
  reports: {
    permission: PLATFORM_PERMISSIONS.viewExport,
    resource: "platform.report-center",
  },
  search: {
    permission: PLATFORM_PERMISSIONS.viewSearch,
    resource: "platform.search",
  },
  settings: {
    permission: PLATFORM_PERMISSIONS.manageSettings,
    resource: "platform.settings",
  },
  workflow: {
    permission: PLATFORM_PERMISSIONS.viewWorkflow,
    resource: "platform.workflow-center",
  },
};

export async function requirePlatformCapabilityAccess(
  capability: PlatformCapabilityKey,
): Promise<ErpRouteAccess> {
  const access = ERP_PLATFORM_CAPABILITY_ACCESS[capability];

  return requireErpRouteAccess({
    denialResource: access.resource,
    denialSource: `platform.capability.${capability}`,
    permission: access.permission,
  });
}
