import type { ReactNode } from "react";

import {
  navGroupMessageKey,
  translate,
  type SupportedLocale,
} from "@/platform/localization/public-api";

import type {
  WorkspaceNavItem,
  WorkspaceNavigationGroupKey,
  WorkspaceNavigationItem,
  WorkspaceNavigationSection,
} from "./workspace-navigation.types";

export const WORKSPACE_NAV_GROUP_LABELS: Readonly<
  Record<WorkspaceNavigationGroupKey, string>
> = {
  administration: "Administration",
  attendance: "Attendance",
  documents: "Documents",
  employment: "Employment",
  financial: "Financial",
  general: "General",
  "master-data": "Master Data",
  operations: "Operations",
  overview: "Overview",
  payroll: "Payroll",
  personal: "Personal",
  reports: "Reports",
  settings: "Settings",
  talent: "Talent",
  transactions: "Transactions",
};

export function resolveWorkspaceNavGroupLabel(
  groupKey: string,
  locale: SupportedLocale = "en",
): string {
  const messageKey = navGroupMessageKey(groupKey);
  if (messageKey) {
    return translate(locale, messageKey);
  }
  const known = WORKSPACE_NAV_GROUP_LABELS[groupKey as WorkspaceNavigationGroupKey];
  return known ?? formatGroupLabel(groupKey);
}

const GROUP_ORDER: readonly WorkspaceNavigationGroupKey[] = [
  "overview",
  "personal",
  "employment",
  "financial",
  "attendance",
  "payroll",
  "operations",
  "master-data",
  "transactions",
  "talent",
  "documents",
  "reports",
  "administration",
  "settings",
  "general",
];

export function workspaceNavItemToNavigationItem(
  item: WorkspaceNavItem,
): WorkspaceNavigationItem {
  return {
    badge: item.badge,
    favorite: undefined,
    fullTitle: item.fullLabel,
    group: item.group,
    hidden: item.hidden,
    icon: item.icon,
    id: item.key,
    isActive: item.isActive,
    mobileLabel: item.mobileLabel,
    permission: undefined,
    priority: item.priority,
    route: item.href,
    title: item.label,
  };
}

export function workspaceNavItemsToNavigationItems(
  items: readonly WorkspaceNavItem[],
): readonly WorkspaceNavigationItem[] {
  return items.map(workspaceNavItemToNavigationItem);
}

export function navigationItemToWorkspaceNavItem(
  item: WorkspaceNavigationItem,
): WorkspaceNavItem {
  return {
    badge: item.badge,
    fullLabel: item.fullTitle,
    group: item.group,
    hidden: item.hidden,
    href: item.route,
    icon: item.icon,
    isActive: item.isActive,
    key: item.id,
    label: item.title,
    mobileLabel: item.mobileLabel,
    priority: item.priority,
  };
}

export function getVisibleNavigationItems(
  items: readonly WorkspaceNavigationItem[],
): readonly WorkspaceNavigationItem[] {
  return items.filter((item) => !item.hidden);
}

export function sortNavigationItems(
  items: readonly WorkspaceNavigationItem[],
  favoriteKeys: readonly string[],
): readonly WorkspaceNavigationItem[] {
  return [...items].sort((left, right) => {
    const leftFavorite = favoriteKeys.includes(left.id);
    const rightFavorite = favoriteKeys.includes(right.id);
    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1;
    }
    const leftPriority = left.priority ?? 0;
    const rightPriority = right.priority ?? 0;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left.title.localeCompare(right.title);
  });
}

export function buildNavigationSections(
  items: readonly WorkspaceNavigationItem[],
  favoriteKeys: readonly string[] = [],
  resolveGroupIcon?: (groupKey: WorkspaceNavigationGroupKey | string) => ReactNode | undefined,
  locale: SupportedLocale = "en",
): readonly WorkspaceNavigationSection[] {
  const visible = getVisibleNavigationItems(items);
  const grouped = new Map<string, WorkspaceNavigationItem[]>();

  for (const item of visible) {
    const groupKey = item.group ?? "general";
    const bucket = grouped.get(groupKey) ?? [];
    bucket.push(item);
    grouped.set(groupKey, bucket);
  }

  const orderedKeys = [
    ...GROUP_ORDER.filter((key) => grouped.has(key)),
    ...[...grouped.keys()].filter(
      (key) => !GROUP_ORDER.includes(key as WorkspaceNavigationGroupKey),
    ),
  ];

  return orderedKeys.map((key) => {
    const groupItems = sortNavigationItems(grouped.get(key) ?? [], favoriteKeys);
    const knownKey = key as WorkspaceNavigationGroupKey;
    return {
      icon: resolveGroupIcon?.(knownKey),
      items: groupItems,
      key,
      title: resolveWorkspaceNavGroupLabel(key, locale),
    };
  });
}

export function filterNavigationSections(
  sections: readonly WorkspaceNavigationSection[],
  query: string,
): readonly WorkspaceNavigationSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => matchesNavigationQuery(item, normalized)),
    }))
    .filter((section) => section.items.length > 0);
}

export function matchesNavigationQuery(
  item: WorkspaceNavigationItem,
  normalizedQuery: string,
): boolean {
  const haystack = [
    item.title,
    item.fullTitle,
    item.mobileLabel,
    item.group,
    item.route,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function resolveActiveNavigationIndex(
  items: readonly WorkspaceNavigationItem[],
): number {
  const index = items.findIndex((item) => item.isActive);
  return index >= 0 ? index : 0;
}

function formatGroupLabel(key: string): string {
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function workspaceNavigationStorageKey(workspaceKey: string): string {
  return `nexora:workspace-nav:${workspaceKey}`;
}
