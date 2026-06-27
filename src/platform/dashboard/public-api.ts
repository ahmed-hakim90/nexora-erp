import type { AccessExperience } from "@/core/context";

export type DashboardWidgetSize = "small" | "medium" | "large" | "wide";

export type DashboardFilter = Readonly<{
  key: string;
  label: string;
  value?: unknown;
}>;

export type DashboardDrilldown = Readonly<{
  label: string;
  href?: string;
  commandKey?: string;
}>;

export type WidgetDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  description?: string;
  requiredPermission: string;
  defaultSize: DashboardWidgetSize;
  refreshIntervalSeconds?: number;
  drilldowns?: readonly DashboardDrilldown[];
}>;

export type DashboardBuilderSchema = Readonly<{
  allowedWidgetKeys: readonly string[];
  filters: readonly DashboardFilter[];
  supportsMobileLayout: boolean;
  maxWidgets: number;
}>;

export type DashboardLayout = Readonly<{
  widgetKey: string;
  size: DashboardWidgetSize;
  order: number;
}>;

export type DashboardDefinition = Readonly<{
  key: string;
  label: string;
  experience: AccessExperience;
  requiredPermission?: string;
  builderSchema: DashboardBuilderSchema;
  layout: readonly DashboardLayout[];
}>;

export function defineDashboardWidget<TWidget extends WidgetDefinition>(
  widget: TWidget,
): TWidget {
  return widget;
}

export function defineDashboard<TDashboard extends DashboardDefinition>(
  dashboard: TDashboard,
): TDashboard {
  return dashboard;
}
