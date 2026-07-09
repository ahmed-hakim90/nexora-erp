import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type WorkspaceNavigationBadgeVariant =
  | "notification"
  | "approval"
  | "warning"
  | "draft"
  | "error";

export type WorkspaceNavigationBadge = Readonly<{
  count: number;
  variant: WorkspaceNavigationBadgeVariant;
  label?: string;
}>;

/** Standard platform section groups — consistent icons across all workspaces. */
export type WorkspaceNavigationGroupKey =
  | "overview"
  | "personal"
  | "employment"
  | "financial"
  | "attendance"
  | "payroll"
  | "talent"
  | "documents"
  | "reports"
  | "operations"
  | "master-data"
  | "transactions"
  | "administration"
  | "settings"
  | "general";

export type WorkspaceNavigationItem = Readonly<{
  id: string;
  title: string;
  icon?: ReactNode;
  route: string;
  priority?: number;
  group?: WorkspaceNavigationGroupKey | string;
  badge?: WorkspaceNavigationBadge;
  permission?: string;
  favorite?: boolean;
  hidden?: boolean;
  mobileLabel?: string;
  /** Extended label for tooltips and search. */
  fullTitle?: string;
  isActive?: boolean;
}>;

export type WorkspaceNavigationSection = Readonly<{
  key: string;
  title: string;
  icon?: LucideIcon | ReactNode;
  items: readonly WorkspaceNavigationItem[];
}>;

export type WorkspaceNavigationIdentity = Readonly<{
  key: string;
  name: string;
  icon?: ReactNode;
}>;

export type WorkspaceNavigationPreferences = Readonly<{
  favoriteKeys: readonly string[];
  recentKeys: readonly WorkspaceNavigationRecentEntry[];
  expandedGroupKeys: readonly string[];
}>;

export type WorkspaceNavigationRecentEntry = Readonly<{
  id: string;
  title: string;
  route: string;
  openedAt: string;
}>;

/** @deprecated Use WorkspaceNavigationItem — kept for AppShell backward compatibility. */
export type WorkspaceNavItem = Readonly<{
  key: string;
  label: string;
  /** Optional Arabic label resolved by WorkspaceNav when locale is `ar`. */
  labelAr?: string;
  fullLabel?: string;
  href: string;
  isActive?: boolean;
  group?: WorkspaceNavigationGroupKey | string;
  icon?: ReactNode;
  badge?: WorkspaceNavigationBadge;
  priority?: number;
  hidden?: boolean;
  mobileLabel?: string;
}>;

export type WorkspaceIdentity = Readonly<{
  key: string;
  name: string;
  icon?: ReactNode;
}>;

export type EnterpriseWorkspaceNavigationProps = Readonly<{
  workspace: WorkspaceNavigationIdentity;
  items: readonly WorkspaceNavigationItem[];
  /** When true, pinned items sort before others in overflow. Defaults to true. */
  enableFavorites?: boolean;
  /** When true, track and surface recently opened pages. Defaults to true. */
  enableRecent?: boolean;
}>;
