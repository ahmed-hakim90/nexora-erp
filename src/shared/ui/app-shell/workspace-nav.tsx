"use client";

import { EnterpriseWorkspaceNavigation } from "./enterprise-workspace-navigation";
import type {
  WorkspaceIdentity,
  WorkspaceNavItem,
  WorkspaceNavigationItem,
} from "./workspace-navigation.types";
import { workspaceNavItemsToNavigationItems } from "./workspace-navigation.utils";

export type WorkspaceNavProps = Readonly<{
  workspace: WorkspaceIdentity;
  items: readonly WorkspaceNavItem[];
}>;

/** Platform workspace navigation — delegates to EnterpriseWorkspaceNavigation. */
export function WorkspaceNav({ workspace, items }: WorkspaceNavProps) {
  const navigationItems: readonly WorkspaceNavigationItem[] = workspaceNavItemsToNavigationItems(items);

  return (
    <EnterpriseWorkspaceNavigation
      items={navigationItems}
      workspace={workspace}
    />
  );
}

export type { WorkspaceIdentity, WorkspaceNavItem } from "./workspace-navigation.types";
