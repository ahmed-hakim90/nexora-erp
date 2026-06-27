import "server-only";

import type { PermissionSet } from "@/platform/permissions/public-api";
import { hasPermission } from "@/platform/permissions/public-api";

import type {
  CommandDefinition,
  NavigationContribution,
  NavigationContext,
  QuickActionDefinition,
} from "./public-api";

function canUsePermission(
  requiredPermission: NavigationContribution["requiredPermission"],
  permissions: PermissionSet,
): boolean {
  return requiredPermission ? hasPermission(permissions, requiredPermission) : true;
}

export function getNavigationForContext(params: {
  context: NavigationContext;
  contributions: readonly NavigationContribution[];
  permissions: PermissionSet;
}): readonly NavigationContribution[] {
  return params.contributions
    .filter((item) => item.appKey === params.context.appKey || item.placement === "app-launcher")
    .filter((item) => canUsePermission(item.requiredPermission, params.permissions))
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getCommandsForContext(params: {
  commands: readonly CommandDefinition[];
  permissions: PermissionSet;
}): readonly CommandDefinition[] {
  return params.commands.filter((command) =>
    canUsePermission(command.requiredPermission, params.permissions),
  );
}

export function getQuickActionsForContext(params: {
  actions: readonly QuickActionDefinition[];
  permissions: PermissionSet;
}): readonly QuickActionDefinition[] {
  return params.actions.filter((action) =>
    canUsePermission(action.requiredPermission, params.permissions),
  );
}
