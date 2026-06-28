"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
} from "lucide-react";

import { Button } from "../primitives";
import { Tooltip } from "../layout";
import { cn } from "../utils";

export type RecordSaveStatus = "idle" | "dirty" | "saving" | "saved" | "draft-saved" | "failed";
export type PanelActionEmphasis = "primary" | "secondary" | "navigation" | "overflow" | "window" | "window-danger";

export type RecordAuditMetadata = Readonly<{
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  version?: number | string | null;
  status?: string | boolean | null;
  saveType?: string | null;
}>;

export type RecordActivityEvent = Readonly<{
  key: string;
  action: string;
  actor?: string | null;
  timestamp?: string | null;
  source: string;
  fieldChanges?: readonly string[];
}>;

export function PanelIconButton({
  label,
  tooltip = label,
  emphasis,
  isLoading,
  children,
  className,
  disabled,
  ...props
}: ComponentPropsWithoutRef<"button"> &
  Readonly<{
    label: string;
    tooltip?: ReactNode;
    emphasis?: PanelActionEmphasis;
    isLoading?: boolean;
  }>) {
  const resolvedEmphasis = emphasis ?? panelActionEmphasisFromLabel(label);

  return (
    <Tooltip content={tooltip}>
      <Button
        aria-label={label}
        aria-busy={isLoading || undefined}
        className={cn(
          "size-9 rounded-xl p-0 shadow-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2",
          resolvedEmphasis === "primary" &&
            "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-sm hover:bg-[hsl(var(--primary-600))]",
          resolvedEmphasis === "secondary" &&
            "border-[hsl(var(--border))] bg-[hsl(var(--surface))]/80 text-foreground hover:border-[hsl(var(--accent))]/45 hover:bg-[hsl(var(--accent))]/8 hover:text-[hsl(var(--accent))]",
          resolvedEmphasis === "navigation" &&
            "border-transparent bg-[hsl(var(--muted))]/70 text-muted-foreground hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--accent))]",
          resolvedEmphasis === "overflow" &&
            "border-[hsl(var(--border))] bg-[hsl(var(--surface))]/70 text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground",
          resolvedEmphasis === "window" &&
            "border-transparent bg-transparent text-muted-foreground/80 hover:bg-[hsl(var(--muted))] hover:text-foreground",
          resolvedEmphasis === "window-danger" &&
            "border-transparent bg-transparent text-muted-foreground/80 hover:bg-[hsl(var(--danger))]/10 hover:text-[hsl(var(--danger))]",
          className,
        )}
        disabled={disabled || isLoading}
        type="button"
        {...props}
      >
        {isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : children}
      </Button>
    </Tooltip>
  );
}

export const IconButtonWithTooltip = PanelIconButton;

export function PanelToolbarGroup({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("flex items-center gap-1.5", className)}>{children}</div>;
}

export function RecordFormSection({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border bg-[hsl(var(--surface-muted))]/45 p-[var(--floating-panel-section-padding)] shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export const FloatingPanelSection = RecordFormSection;

function panelActionEmphasisFromLabel(label: string): PanelActionEmphasis {
  if (label === "Save") return "primary";
  if (label === "More actions") return "overflow";
  if (label.startsWith("Go to")) return "navigation";
  if (label === "Close dialog") return "window-danger";
  if (label.includes("dialog")) return "window";
  return "secondary";
}

export function FloatingRecordPanel({
  children,
  footer,
  className,
}: Readonly<{
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-[hsl(var(--surface))] shadow-lg", className)}>
      <div className="p-4">{children}</div>
      {footer ? <footer className="border-t bg-[hsl(var(--background))] p-3">{footer}</footer> : null}
    </section>
  );
}

export function SaveStatusIndicator({ status }: Readonly<{ status: RecordSaveStatus }>) {
  const config = {
    idle: { icon: CheckCircle2, label: "Saved", text: "Saved" },
    dirty: { icon: Clock, label: "Unsaved changes", text: "Unsaved changes" },
    saving: { icon: Loader2, label: "Saving", text: "Saving..." },
    saved: { icon: CheckCircle2, label: "Saved", text: "Saved" },
    "draft-saved": { icon: Save, label: "Draft saved", text: "Draft saved" },
    failed: { icon: AlertCircle, label: "Save failed", text: "Save failed" },
  }[status];
  const Icon = config.icon;

  return (
    <Tooltip content={config.label}>
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon aria-hidden className={cn("size-3.5", status === "saving" && "animate-spin")} />
        <span>{config.text}</span>
      </p>
    </Tooltip>
  );
}

export function SaveAuditMetadata({ metadata }: Readonly<{ metadata?: RecordAuditMetadata | null }>) {
  if (!hasAuditMetadata(metadata)) {
    return <p className="text-sm text-muted-foreground">Audit metadata unavailable</p>;
  }

  const savedBy = actorLabel(metadata.updatedBy ?? metadata.createdBy);
  const savedAt = formatTimestamp(metadata.updatedAt ?? metadata.createdAt);

  return (
    <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
      <AuditTerm label="Saved by" value={savedBy} />
      <AuditTerm label="Saved at" value={savedAt} />
      <AuditTerm label="Save type" value={metadata.saveType ?? statusLabel(metadata.status) ?? "Saved"} />
      <AuditTerm label="Version" value={metadata.version ? `v${metadata.version}` : "Unavailable"} />
    </dl>
  );
}

export const AuditMetadataPanel = SaveAuditMetadata;

export function AuditActivityTimeline({ events }: Readonly<{ events: readonly RecordActivityEvent[] }>) {
  if (events.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Audit metadata unavailable</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li className="rounded-md border p-3" key={event.key}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{event.action}</p>
            <span className="text-xs text-muted-foreground">{event.source}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {actorLabel(event.actor)} · {formatTimestamp(event.timestamp)}
          </p>
          {event.fieldChanges && event.fieldChanges.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-muted-foreground">
              {event.fieldChanges.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function buildRecordActivityEvents(metadata: RecordAuditMetadata): readonly RecordActivityEvent[] {
  const events: RecordActivityEvent[] = [];
  if (metadata.createdAt || metadata.createdBy) {
    events.push({
      action: "Created",
      actor: metadata.createdBy,
      key: "created",
      source: "Record metadata",
      timestamp: metadata.createdAt,
    });
  }
  if (metadata.updatedAt || metadata.updatedBy) {
    events.push({
      action: metadata.status === "draft" || metadata.saveType === "Draft" ? "Draft saved" : "Updated",
      actor: metadata.updatedBy,
      key: "updated",
      source: "Record metadata",
      timestamp: metadata.updatedAt,
    });
  }
  if (metadata.status !== undefined && metadata.status !== null) {
    events.push({
      action: metadata.status === "archived" ? "Archived" : "Status changed",
      key: "status",
      source: "Record metadata",
      timestamp: metadata.updatedAt ?? metadata.createdAt,
    });
  }
  return events;
}

function AuditTerm({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-0.5 break-all">{value}</dd>
    </div>
  );
}

function hasAuditMetadata(metadata?: RecordAuditMetadata | null): metadata is RecordAuditMetadata {
  return Boolean(metadata && (metadata.createdAt || metadata.updatedAt || metadata.createdBy || metadata.updatedBy || metadata.version));
}

function actorLabel(actor?: string | null): string {
  if (actor === null) return "Unknown user";
  if (actor === undefined || actor.trim().length === 0) return "Unknown user";
  return actor;
}

function statusLabel(status: RecordAuditMetadata["status"]): string | null {
  if (status === undefined || status === null) return null;
  if (typeof status === "boolean") return status ? "Active" : "Inactive";
  return status;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
