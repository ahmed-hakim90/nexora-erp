"use client";

import type { WarehouseScanHistoryEntry } from "@/platform/operator-experience/warehouse-execution";

export function ScanHistoryPanel({
  history,
}: Readonly<{
  history: readonly WarehouseScanHistoryEntry[];
}>) {
  if (history.length === 0) {
    return (
      <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4 text-sm text-muted-foreground">
        Scan history will appear here as you work.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
      <h3 className="font-medium">Recent scans</h3>
      <ol className="mt-3 space-y-2">
        {history.map((entry) => (
          <li className="rounded-xl border bg-[hsl(var(--muted))] px-3 py-2 text-sm" key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.resolvedLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.scannedValue}</p>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                {entry.outcome.replaceAll("-", " ")}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
