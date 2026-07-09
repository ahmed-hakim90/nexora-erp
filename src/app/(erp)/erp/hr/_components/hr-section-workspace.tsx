"use client";

import type { ReactNode } from "react";

import type { BilingualHelp } from "@/shared/ui/help/help-types";
import { PageContainer } from "@/shared/ui";

import {
  HrWorkforceWorkspaceShell,
  type HrWorkforceNavItem,
  type HrWorkforceSummaryMetric,
} from "./hr-workforce-workspace-shell";

export function buildHrSectionHref(
  basePath: string,
  params: Record<string, string | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function resolveHrSectionTab(
  tab: string | undefined,
  allowed: readonly string[],
  fallback: string,
) {
  if (tab && allowed.includes(tab)) return tab;
  return fallback;
}

export function HrSectionWorkspace({
  activeTab,
  children,
  description,
  filters,
  headerActions,
  help,
  navItems,
  summaryMetrics,
  title,
  workspaceKey,
}: Readonly<{
  activeTab: string;
  children: ReactNode;
  description?: string;
  filters?: ReactNode;
  headerActions?: ReactNode;
  help?: BilingualHelp;
  navItems: readonly HrWorkforceNavItem[];
  summaryMetrics?: readonly HrWorkforceSummaryMetric[];
  title: string;
  workspaceKey: string;
}>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={description}
        filters={filters}
        headerActions={headerActions}
        help={help}
        navItems={navItems}
        summaryMetrics={summaryMetrics}
        title={title}
        workspaceKey={workspaceKey}
      >
        {children}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}
