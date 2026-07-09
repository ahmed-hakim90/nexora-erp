import type { ReactNode } from "react";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Settings2,
  Target,
  UserCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { SupportedLocale } from "@/platform/localization/public-api";

import type {
  WorkspaceNavigationGroupKey,
  WorkspaceNavigationItem,
  WorkspaceNavigationSection,
} from "./workspace-navigation.types";
import {
  buildNavigationSections as buildNavigationSectionsCore,
  filterNavigationSections,
  getVisibleNavigationItems,
  matchesNavigationQuery,
  navigationItemToWorkspaceNavItem,
  resolveActiveNavigationIndex,
  resolveWorkspaceNavGroupLabel,
  sortNavigationItems,
  WORKSPACE_NAV_GROUP_LABELS,
  workspaceNavigationStorageKey,
  workspaceNavItemToNavigationItem,
  workspaceNavItemsToNavigationItems,
} from "./workspace-navigation.logic";

export const WORKSPACE_NAV_GROUP_ICONS: Readonly<
  Record<WorkspaceNavigationGroupKey, LucideIcon>
> = {
  administration: Settings2,
  attendance: CalendarDays,
  documents: FileText,
  employment: Briefcase,
  financial: Wallet,
  general: LayoutDashboard,
  "master-data": FileText,
  operations: Briefcase,
  overview: LayoutDashboard,
  payroll: Wallet,
  personal: UserCircle,
  reports: BarChart3,
  settings: Settings2,
  talent: Target,
  transactions: Briefcase,
};

export {
  filterNavigationSections,
  getVisibleNavigationItems,
  matchesNavigationQuery,
  navigationItemToWorkspaceNavItem,
  resolveActiveNavigationIndex,
  resolveWorkspaceNavGroupLabel,
  sortNavigationItems,
  WORKSPACE_NAV_GROUP_LABELS,
  workspaceNavigationStorageKey,
  workspaceNavItemToNavigationItem,
  workspaceNavItemsToNavigationItems,
};

export function buildNavigationSections(
  items: readonly WorkspaceNavigationItem[],
  favoriteKeys: readonly string[] = [],
  locale: SupportedLocale = "en",
): readonly WorkspaceNavigationSection[] {
  return buildNavigationSectionsCore(
    items,
    favoriteKeys,
    (groupKey) => {
      const knownKey = groupKey as WorkspaceNavigationGroupKey;
      return (WORKSPACE_NAV_GROUP_ICONS[knownKey] ?? LayoutDashboard) as unknown as ReactNode;
    },
    locale,
  );
}
