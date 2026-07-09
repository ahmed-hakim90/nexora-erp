"use client";

import type { HrAttendanceDeviceSyncProgress } from "@/features/hr/public-api";
import {
  formatHrAttendanceDevicePhaseLabel,
  formatHrDurationSeconds,
} from "@/features/hr/public-api";
import { useTranslations } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

export function HrAttendanceDeviceProgress({
  progress,
}: Readonly<{
  progress: HrAttendanceDeviceSyncProgress | null;
}>) {
  const t = useTranslations();
  if (!progress) return null;

  return (
    <section className="space-y-4 rounded-2xl border bg-[hsl(var(--surface))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{formatHrAttendanceDevicePhaseLabel(progress.phase)}</p>
          <p className="text-sm text-muted-foreground">{progress.phaseMessage}</p>
          {progress.currentTask ? <p className="mt-1 text-xs text-muted-foreground">{progress.currentTask}</p> : null}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{progress.progress}%</p>
      </div>

      <div aria-hidden className="h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div
          className={cn("h-full rounded-full bg-[hsl(var(--accent))] transition-all duration-500")}
          style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
        />
      </div>

      {progress.errorMessage ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {progress.errorMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 xl:grid-cols-6">
        <Metric label={t("hr.common.processed")} value={String(progress.recordsProcessed)} />
        <Metric label={t("hr.common.remaining")} value={String(progress.remainingCount)} />
        <Metric label={t("hr.common.speed")} value={`${progress.speedRecordsPerSec}/s`} />
        <Metric label={t("hr.common.eta")} value={progress.etaSeconds ? formatHrDurationSeconds(progress.etaSeconds) : "—"} />
        <Metric label={t("hr.common.elapsed")} value={progress.elapsedSeconds ? formatHrDurationSeconds(progress.elapsedSeconds) : "—"} />
        <Metric label={t("hr.common.imported")} value={String(progress.importedCount)} />
        <Metric label={t("hr.common.validations")} value={String(progress.validationCount)} />
        <Metric label={t("hr.common.warnings")} value={String(progress.warningCount)} />
        <Metric label={t("hr.common.errors")} value={String(progress.errorCount)} />
        <Metric label={t("hr.common.strategy")} value={progress.strategy ? progress.strategy.replaceAll("_", " ") : "—"} />
        <Metric label={t("hr.common.device")} value={progress.currentDeviceLabel ?? "—"} />
        <Metric label={t("hr.common.employee")} value={progress.currentEmployeeLabel ?? "—"} />
        <Metric label={t("hr.common.date")} value={progress.currentDate ?? "—"} />
        <Metric label={t("hr.common.record")} value={progress.currentRecordLabel ?? "—"} />
        <Metric label={t("hr.common.status")} value={progress.status.replaceAll("_", " ")} />
      </div>

      {progress.logs.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-md border bg-[hsl(var(--muted))]/20 p-3 font-mono text-xs">
          {progress.logs.map((log) => (
            <p className="py-0.5" key={`${log.createdAt}-${log.message}`}>
              <span className="text-muted-foreground">[{log.level}]</span> {log.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border bg-[hsl(var(--muted))]/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}
