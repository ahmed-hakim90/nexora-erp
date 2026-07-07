import Link from "next/link";

import { formatHrStatusLabel } from "@/features/hr/public-api";
import { cn } from "@/shared/ui/utils";

export type HrLeaveCalendarEntry = Readonly<{
  employee: string;
  endsOn: string;
  id: string;
  leaveType: string;
  startsOn: string;
  status: string;
}>;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthBounds(year: number, month: number): Readonly<{ firstDay: string; lastDay: string }> {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return { firstDay: toIsoDate(first), lastDay: toIsoDate(last) };
}

function shiftMonth(year: number, month: number, delta: number): Readonly<{ month: number; year: number }> {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

function isDateWithinRange(day: string, startsOn: string, endsOn: string): boolean {
  return day >= startsOn && day <= endsOn;
}

function buildCalendarCells(year: number, month: number): ReadonlyArray<Readonly<{ day: number | null; iso: string | null }>> {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ day: number | null; iso: string | null }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ day: null, iso: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIsoDate(new Date(Date.UTC(year, month - 1, day)));
    cells.push({ day, iso });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }

  return cells;
}

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

function calendarHref(
  year: number,
  month: number,
  options?: Readonly<{ calendarView?: string; day?: string; employeeId?: string }>,
): string {
  const params = new URLSearchParams({ month: String(month), tab: "calendar", year: String(year) });
  if (options?.employeeId) params.set("employeeId", options.employeeId);
  if (options?.calendarView) params.set("calendarView", options.calendarView);
  if (options?.day) params.set("day", options.day);
  return `/erp/hr/attendance-leave?${params.toString()}`;
}

function weekDaysForFocus(year: number, month: number, focusDay?: string): string[] {
  const anchor = focusDay ?? toIsoDate(new Date(Date.UTC(year, month - 1, 15)));
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - weekday);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + index);
    return toIsoDate(next);
  });
}

function employeeColor(employee: string): string {
  const palette = [
    "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    "bg-sky-500/15 text-sky-900 dark:text-sky-100",
    "bg-violet-500/15 text-violet-900 dark:text-violet-100",
    "bg-amber-500/15 text-amber-900 dark:text-amber-100",
    "bg-rose-500/15 text-rose-900 dark:text-rose-100",
  ];
  let hash = 0;
  for (let index = 0; index < employee.length; index += 1) {
    hash = (hash + employee.charCodeAt(index)) % palette.length;
  }
  return palette[hash] ?? palette[0];
}

function LeaveEntryChip({ entry }: Readonly<{ entry: HrLeaveCalendarEntry }>) {
  return (
    <div
      className={cn("truncate rounded px-1.5 py-0.5 text-xs", employeeColor(entry.employee))}
      title={`${entry.employee} · ${entry.leaveType} · ${formatHrStatusLabel(entry.status)}`}
    >
      {entry.employee}
    </div>
  );
}

export function entriesOverlappingMonth(entries: readonly HrLeaveCalendarEntry[], year: number, month: number): HrLeaveCalendarEntry[] {
  const { firstDay, lastDay } = monthBounds(year, month);
  return entries.filter((entry) => entry.startsOn <= lastDay && entry.endsOn >= firstDay);
}

export function HrLeaveCalendar({
  calendarView,
  day,
  employeeId,
  entries,
  month,
  year,
}: Readonly<{
  calendarView?: string;
  day?: string;
  employeeId?: string;
  entries: readonly HrLeaveCalendarEntry[];
  month: number;
  year: number;
}>) {
  const view = CALENDAR_VIEWS.includes((calendarView ?? "month") as (typeof CALENDAR_VIEWS)[number]) ? (calendarView ?? "month") : "month";
  const visibleEntries = entriesOverlappingMonth(entries, year, month);
  const cells = buildCalendarCells(year, month);
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const todayIso = toIsoDate(new Date());
  const focusDay = day ?? todayIso;
  const weekDays = weekDaysForFocus(year, month, focusDay);
  const dayEntries = visibleEntries.filter((entry) => isDateWithinRange(focusDay, entry.startsOn, entry.endsOn));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{monthLabel(year, month)}</h2>
          <p className="text-sm text-muted-foreground">
            Approved and pending leave overlapping this month. {visibleEntries.length} request(s) shown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            href={calendarHref(year, month, { calendarView: view, day: todayIso, employeeId })}
          >
            Today
          </Link>
          <Link
            className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            href={calendarHref(previous.year, previous.month, { calendarView: view, employeeId })}
          >
            Previous
          </Link>
          <Link
            className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
            href={calendarHref(next.year, next.month, { calendarView: view, employeeId })}
          >
            Next
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {CALENDAR_VIEWS.map((item) => (
          <Link
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              view === item ? "bg-accent text-accent-foreground" : "bg-background hover:bg-muted",
            )}
            href={calendarHref(year, month, { calendarView: item, day: focusDay, employeeId })}
            key={item}
            role="tab"
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </div>

      {view === "month" ? (
        <div className="overflow-x-auto rounded-lg border">
          <div className="grid min-w-[48rem] grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div className="px-2 py-2" key={label}>
                {label}
              </div>
            ))}
          </div>
          <div className="grid min-w-[48rem] grid-cols-7">
            {cells.map((cell, index) => {
              const cellEntries =
                cell.iso == null ? [] : visibleEntries.filter((entry) => isDateWithinRange(cell.iso!, entry.startsOn, entry.endsOn));

              return (
                <div
                  className={cn(
                    "min-h-28 border-b border-r p-2 align-top last:border-r-0",
                    cell.day == null ? "bg-muted/20" : "bg-background",
                    cell.iso === todayIso ? "ring-1 ring-inset ring-[hsl(var(--accent))]" : null,
                  )}
                  key={`${cell.iso ?? "blank"}-${index}`}
                >
                  {cell.day != null ? (
                    <Link
                      className="mb-2 inline-block text-sm font-medium hover:underline"
                      href={calendarHref(year, month, { calendarView: "day", day: cell.iso ?? undefined, employeeId })}
                    >
                      {cell.day}
                    </Link>
                  ) : null}
                  <div className="space-y-1">
                    {cellEntries.slice(0, 3).map((entry) => (
                      <LeaveEntryChip entry={entry} key={`${entry.id}-${cell.iso}`} />
                    ))}
                    {cellEntries.length > 3 ? (
                      <div className="text-xs text-muted-foreground">+{cellEntries.length - 3} more</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="overflow-x-auto rounded-lg border">
          <div className="grid min-w-[42rem] grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {weekDays.map((iso) => (
              <div className="px-2 py-2" key={iso}>
                <div>{WEEKDAY_LABELS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()]}</div>
                <Link className="text-[hsl(var(--foreground))] hover:underline" href={calendarHref(year, month, { calendarView: "day", day: iso, employeeId })}>
                  {iso.slice(8)}
                </Link>
              </div>
            ))}
          </div>
          <div className="grid min-w-[42rem] grid-cols-7">
            {weekDays.map((iso) => {
              const weekEntries = visibleEntries.filter((entry) => isDateWithinRange(iso, entry.startsOn, entry.endsOn));
              return (
                <div className={cn("min-h-32 border-r p-2 last:border-r-0", iso === todayIso ? "bg-accent/5" : null)} key={iso}>
                  <div className="space-y-1">
                    {weekEntries.map((entry) => (
                      <LeaveEntryChip entry={entry} key={`${entry.id}-${iso}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "day" ? (
        <div className="rounded-lg border p-4">
          <h3 className="font-medium">{focusDay}</h3>
          {dayEntries.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No leave on this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayEntries.map((entry) => (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm" key={entry.id}>
                  <div>
                    <div className="font-medium">{entry.employee}</div>
                    <div className="text-muted-foreground">
                      {entry.leaveType} · {entry.startsOn} → {entry.endsOn}
                    </div>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-xs">{formatHrStatusLabel(entry.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {view === "agenda" || view === "month" ? (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium">Leave in {monthLabel(year, month)}</h3>
          </div>
          {visibleEntries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No leave requests overlap this month.</p>
          ) : (
            <ul className="divide-y">
              {visibleEntries.map((entry) => (
                <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm" key={entry.id}>
                  <div>
                    <div className="font-medium">{entry.employee}</div>
                    <div className="text-muted-foreground">
                      {entry.leaveType} · {entry.startsOn} → {entry.endsOn}
                    </div>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-xs">{formatHrStatusLabel(entry.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function resolveLeaveCalendarMonth(searchParams: Readonly<Record<string, string | undefined>>): Readonly<{ month: number; year: number }> {
  const today = new Date();
  const year = Number(searchParams.year ?? today.getUTCFullYear());
  const month = Number(searchParams.month ?? today.getUTCMonth() + 1);
  const safeYear = Number.isFinite(year) ? year : today.getUTCFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : today.getUTCMonth() + 1;
  return { month: safeMonth, year: safeYear };
}

export function leaveCalendarQueryRange(year: number, month: number): Readonly<{ from: string; to: string }> {
  const { firstDay, lastDay } = monthBounds(year, month);
  return { from: firstDay, to: lastDay };
}
