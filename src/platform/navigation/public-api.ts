import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type NavigationPlacement =
  | "app-launcher"
  | "topbar"
  | "contextual-sidebar"
  | "command-palette"
  | "quick-actions";

export type NavigationContext = Readonly<{
  experience: AccessExperience;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  activePath?: string | null;
}>;

export type NavigationContribution = Readonly<{
  key: string;
  appKey: string;
  label: string;
  href?: string;
  placement: NavigationPlacement;
  order?: number;
  parentKey?: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
}>;

export type CommandDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  description?: string;
  requiredPermission?: PermissionKey;
  href?: string;
  actionKey?: string;
}>;

export type QuickActionDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  href?: string;
  commandKey?: string;
  requiredPermission?: PermissionKey;
}>;

export function defineNavigationContribution<TContribution extends NavigationContribution>(
  contribution: TContribution,
): TContribution {
  return contribution;
}

export function defineCommand<TCommand extends CommandDefinition>(
  command: TCommand,
): TCommand {
  return command;
}
