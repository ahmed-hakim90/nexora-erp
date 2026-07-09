"use client";

import { useMemo } from "react";

import {
  appMessageKey,
  pickLocalizedLabel,
} from "@/platform/localization/public-api";
import { useEnterpriseUi } from "../providers/enterprise-ui-context";
import { EnterpriseWorkspaceNavigation } from "./enterprise-workspace-navigation";
import type {
  WorkspaceIdentity,
  WorkspaceNavItem,
  WorkspaceNavigationItem,
} from "./workspace-navigation.types";

export type WorkspaceNavProps = Readonly<{
  workspace: WorkspaceIdentity;
  items: readonly WorkspaceNavItem[];
}>;

/** Platform workspace navigation — localizes labels then delegates to EnterpriseWorkspaceNavigation. */
export function WorkspaceNav({ workspace, items }: WorkspaceNavProps) {
  const { locale, t } = useEnterpriseUi();
  const navigationItems: readonly WorkspaceNavigationItem[] = useMemo(
    () =>
      items.map((item) => ({
        badge: item.badge,
        favorite: undefined,
        fullTitle: item.fullLabel,
        group: item.group,
        hidden: item.hidden,
        icon: item.icon,
        id: item.key,
        isActive: item.isActive,
        mobileLabel: item.mobileLabel
          ? pickLocalizedLabel(locale, item.mobileLabel, item.labelAr)
          : undefined,
        permission: undefined,
        priority: item.priority,
        route: item.href,
        title: pickLocalizedLabel(locale, item.label, item.labelAr),
      })),
    [items, locale],
  );
  const localizedWorkspace = useMemo(() => {
    const key = appMessageKey(workspace.key);
    return {
      ...workspace,
      name: key ? t(key) : workspace.name,
    };
  }, [t, workspace]);

  return (
    <EnterpriseWorkspaceNavigation
      items={navigationItems}
      workspace={localizedWorkspace}
    />
  );
}

export type { WorkspaceIdentity, WorkspaceNavItem } from "./workspace-navigation.types";
