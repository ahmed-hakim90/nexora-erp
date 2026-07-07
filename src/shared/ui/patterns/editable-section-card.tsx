"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, History, Shield } from "lucide-react";

import { Button } from "../primitives";
import { Tooltip } from "../layout";
import { cn } from "../utils";
import { PanelIconButton, PanelToolbarGroup } from "./floating-record-panel";

export function EditableSectionCard({
  actions,
  auditContent,
  bodyClassName,
  children,
  className,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  description,
  historyContent,
  lastUpdated,
  onAudit,
  onCollapseChange,
  onEdit,
  onHistory,
  title,
}: Readonly<{
  actions?: ReactNode;
  auditContent?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  description?: string;
  historyContent?: ReactNode;
  lastUpdated?: string | null;
  onAudit?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  onEdit?: () => void;
  onHistory?: () => void;
  title: string;
}>) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? internalCollapsed;

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setInternalCollapsed(next);
    }
    onCollapseChange?.(next);
  }

  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-[hsl(var(--surface))] shadow-sm", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {lastUpdated ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock aria-hidden className="size-3.5" />
              <span>Last updated {lastUpdated}</span>
            </p>
          ) : null}
        </div>

        <PanelToolbarGroup>
          {onEdit ? (
            <Tooltip content="Edit section">
              <Button size="sm" type="button" variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            </Tooltip>
          ) : null}
          {onHistory ? (
            <PanelIconButton label="View history" onClick={onHistory}>
              <History aria-hidden className="size-4" />
            </PanelIconButton>
          ) : null}
          {onAudit ? (
            <PanelIconButton label="View audit" onClick={onAudit}>
              <Shield aria-hidden className="size-4" />
            </PanelIconButton>
          ) : null}
          <PanelIconButton label={collapsed ? "Expand section" : "Collapse section"} onClick={toggleCollapsed}>
            {collapsed ? <ChevronDown aria-hidden className="size-4" /> : <ChevronUp aria-hidden className="size-4" />}
          </PanelIconButton>
          {actions}
        </PanelToolbarGroup>
      </header>

      {!collapsed ? (
        <div className={cn("px-5 py-4", bodyClassName)}>
          {children}
          {historyContent ? <div className="mt-4 border-t pt-4">{historyContent}</div> : null}
          {auditContent ? <div className="mt-4 border-t pt-4">{auditContent}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
