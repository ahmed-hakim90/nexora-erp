"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { BilingualHelp } from "@/shared/ui/help/help-types";
import {
  AdaptiveWorkspaceNav,
  HelpHint,
  KpiCard,
  ProfileBody,
  ProfileHeader,
  ProfileLayout,
  ProfileSummaryMetric,
  ProfileSummaryStrip,
} from "@/shared/ui";

export type HrWorkforceNavItem = Readonly<{
  href: string;
  key: string;
  label: string;
  help?: BilingualHelp;
}>;

export type HrWorkforceSummaryMetric = Readonly<{
  filterKey?: string;
  helper?: string;
  href?: string;
  label: string;
  tone?: "up" | "down" | "neutral";
  value: ReactNode;
}>;

function workforceFavoritesKey(workspaceKey: string) {
  return `nexora.hr.workforce.${workspaceKey}.favorites`;
}

function workforceRecentKey(workspaceKey: string) {
  return `nexora.hr.workforce.${workspaceKey}.recent`;
}

function readStoredKeys(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredKeys(storageKey: string, keys: readonly string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(keys));
}

export function HrWorkforceWorkspaceShell({
  activeTab,
  children,
  description,
  filters,
  headerActions,
  help,
  navItems,
  sidebar,
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
  sidebar?: ReactNode;
  summaryMetrics?: readonly HrWorkforceSummaryMetric[];
  title: string;
  workspaceKey: string;
}>) {
  const [favoriteTabKeys, setFavoriteTabKeys] = useState<string[]>([]);
  const [recentTabKeys, setRecentTabKeys] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteTabKeys(readStoredKeys(workforceFavoritesKey(workspaceKey)));
    setRecentTabKeys(readStoredKeys(workforceRecentKey(workspaceKey)));
  }, [workspaceKey]);

  useEffect(() => {
    setRecentTabKeys((current) => {
      const nextRecent = [activeTab, ...current.filter((key) => key !== activeTab)].slice(0, 6);
      writeStoredKeys(workforceRecentKey(workspaceKey), nextRecent);
      return nextRecent;
    });
  }, [activeTab, workspaceKey]);

  const toggleFavoriteTab = (key: string) => {
    setFavoriteTabKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      writeStoredKeys(workforceFavoritesKey(workspaceKey), next);
      return next;
    });
  };

  return (
    <ProfileLayout>
      <ProfileHeader
        actions={headerActions}
        description={description}
        title={
          <span className="inline-flex items-center gap-2">
            {title}
            {help ? <HelpHint help={help} size="md" /> : null}
          </span>
        }
      />

      {summaryMetrics && summaryMetrics.length > 0 ? (
        <ProfileSummaryStrip>
          {summaryMetrics.map((metric) =>
            metric.href ? (
              <KpiCard
                compact
                helperText={metric.helper}
                href={metric.href}
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ) : (
              <ProfileSummaryMetric helper={metric.helper} key={metric.label} label={metric.label} value={metric.value} />
            ),
          )}
        </ProfileSummaryStrip>
      ) : null}

      <AdaptiveWorkspaceNav
        activeKey={activeTab}
        favoriteKeys={favoriteTabKeys}
        items={navItems.map((item) => ({
          href: item.href,
          key: item.key,
          label: (
            <span className="inline-flex items-center gap-1">
              {item.label}
              {item.help ? <HelpHint help={item.help} side="bottom" /> : null}
            </span>
          ),
        }))}
        label={`${title} sections`}
        onToggleFavorite={toggleFavoriteTab}
        recentKeys={recentTabKeys}
      />

      {filters ? <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">{filters}</div> : null}

      <ProfileBody sidebar={sidebar}>{children}</ProfileBody>
    </ProfileLayout>
  );
}
