import "server-only";

import { ApplicationError } from "@/core/errors";

import type { DashboardDefinition, WidgetDefinition } from "./public-api";

export class DashboardRegistry {
  private readonly widgets = new Map<string, WidgetDefinition>();
  private readonly dashboards = new Map<string, DashboardDefinition>();

  registerWidget(widget: WidgetDefinition): void {
    if (this.widgets.has(widget.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Dashboard widget ${widget.key} is already registered.`,
      });
    }

    this.widgets.set(widget.key, widget);
  }

  buildDashboard(dashboard: DashboardDefinition): DashboardDefinition {
    const missingWidget = dashboard.layout.positions.find((item) => !this.widgets.has(item.widgetKey));

    if (missingWidget) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Dashboard references unknown widget ${missingWidget.widgetKey}.`,
      });
    }

    if (dashboard.layout.positions.length > dashboard.builderSchema.maxWidgets) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Dashboard exceeds the configured maximum widget count.",
      });
    }

    return dashboard;
  }

  registerDashboard(dashboard: DashboardDefinition): void {
    if (this.dashboards.has(dashboard.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `Dashboard ${dashboard.key} is already registered.`,
      });
    }

    this.dashboards.set(dashboard.key, this.buildDashboard(dashboard));
  }
}
