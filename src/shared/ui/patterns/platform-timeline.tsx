"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  Paperclip,
  Search,
  Shield,
} from "lucide-react";

import { Input } from "../primitives";
import { nativeSelectClassName } from "../tokens";
import { type RecordActivityEvent } from "./floating-record-panel";

export type PlatformTimelineCategory =
  | "all"
  | "status"
  | "comment"
  | "attachment"
  | "audit"
  | "approval";

export type PlatformTimelineEvent = RecordActivityEvent &
  Readonly<{
    category?: PlatformTimelineCategory;
  }>;

const CATEGORY_ICONS: Record<Exclude<PlatformTimelineCategory, "all">, typeof Clock3> = {
  approval: CheckCircle2,
  attachment: Paperclip,
  audit: Shield,
  comment: MessageSquare,
  status: AlertCircle,
};

function inferCategory(event: PlatformTimelineEvent): Exclude<PlatformTimelineCategory, "all"> {
  if (event.category && event.category !== "all") return event.category;
  const action = event.action.toLowerCase();
  if (action.includes("approv") || action.includes("reject")) return "approval";
  if (action.includes("comment")) return "comment";
  if (action.includes("attach") || action.includes("upload") || action.includes("document")) return "attachment";
  if (action.includes("audit") || action.includes("version")) return "audit";
  return "status";
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PlatformTimeline({
  emptyMessage = "No timeline events yet.",
  events,
  showFilters = true,
  title = "Timeline",
}: Readonly<{
  emptyMessage?: string;
  events: readonly PlatformTimelineEvent[];
  showFilters?: boolean;
  title?: string;
}>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlatformTimelineCategory>("all");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const eventCategory = inferCategory(event);
      if (category !== "all" && eventCategory !== category) return false;
      if (!normalizedQuery) return true;
      const haystack = [event.action, event.actor, event.source, ...(event.fieldChanges ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [category, events, query]);

  return (
    <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">{title}</h2>
        {showFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem]">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search timeline"
                className="ps-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events"
                value={query}
              />
            </div>
            <select
              aria-label="Filter timeline category"
              className={nativeSelectClassName}
              onChange={(event) => setCategory(event.target.value as PlatformTimelineCategory)}
              value={category}
            >
              <option value="all">All events</option>
              <option value="status">Status</option>
              <option value="approval">Approvals</option>
              <option value="comment">Comments</option>
              <option value="attachment">Attachments</option>
              <option value="audit">Audit</option>
            </select>
          </div>
        ) : null}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ol className="space-y-3">
          {filteredEvents.map((event) => {
            const eventCategory = inferCategory(event);
            const Icon = CATEGORY_ICONS[eventCategory] ?? FileText;
            return (
              <li className="rounded-md border border-[hsl(var(--border))] p-3" key={event.key}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border bg-[hsl(var(--muted))]/50">
                    <Icon aria-hidden className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.action}</p>
                      <time className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</time>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.actor ?? "System"} · {event.source}
                    </p>
                    {event.fieldChanges && event.fieldChanges.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                        {event.fieldChanges.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export const Timeline = PlatformTimeline;
