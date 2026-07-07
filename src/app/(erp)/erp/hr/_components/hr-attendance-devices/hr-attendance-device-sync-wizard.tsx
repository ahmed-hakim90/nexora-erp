"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  HR_ATTENDANCE_DEVICE_SYNC_PHASES,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES,
} from "@/features/hr/public-api";
import type {
  HrAttendanceDevicePreviewPayload,
  HrAttendanceDeviceSyncProgress,
  HrAttendanceDeviceSyncRecommendation,
  HrAttendanceDeviceSyncStartContext,
  HrAttendanceDeviceSyncStrategy,
} from "@/features/hr/public-api";
import { formatHrAttendanceDevicePhaseLabel, formatHrAttendanceDeviceSyncStrategyLabel } from "@/features/hr/public-api";
import {
  cancelHrAttendanceDeviceSyncAction,
  importHrAttendanceDeviceSyncAction,
  startHrAttendanceDeviceEnterpriseSyncAction,
} from "@/features/hr/routes/actions/hr-attendance-device.actions";
import {
  Button,
  DatePicker,
  EntityLookup,
  RecordFormDialog,
  Switch,
  buildModalCloseHref,
  nativeSelectClassName,
  useRecordFormModal,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

import { HrAttendanceDevicePreviewTabs } from "./hr-attendance-device-preview-tabs";
import { HrAttendanceDeviceProgress } from "./hr-attendance-device-progress";

const ATTENDANCE_DEVICES_PATH = "/erp/hr/attendance-devices";
const SYNC_MODAL_QUERY_KEYS = ["create", "edit", "sync", "syncSession"] as const;

type WizardStep = "strategy" | "options" | "progress" | "preview" | "import";

export function HrAttendanceDeviceSyncWizard({
  deviceId,
  query,
  sessionId: initialSessionId,
}: Readonly<{
  deviceId: string;
  query: Record<string, string | undefined>;
  sessionId?: string;
}>) {
  const router = useRouter();
  const closeHref = buildModalCloseHref(ATTENDANCE_DEVICES_PATH, query, SYNC_MODAL_QUERY_KEYS);
  const { closeModal, handleOpenChange, open } = useRecordFormModal({ autoOpen: true, closeHref });
  const [sessionId, setSessionId] = useState(initialSessionId ?? null);
  const [step, setStep] = useState<WizardStep>(initialSessionId ? "progress" : "strategy");
  const [strategy, setStrategy] = useState<HrAttendanceDeviceSyncStrategy>("incremental");
  const [specificDate, setSpecificDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [month, setMonth] = useState(String(new Date().getUTCMonth() + 1));
  const [year, setYear] = useState(String(new Date().getUTCFullYear()));
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [pendingEmployeeId, setPendingEmployeeId] = useState("");
  const [pendingDepartmentId, setPendingDepartmentId] = useState("");
  const [syncOptions, setSyncOptions] = useState({
    autoBuildPreview: true,
    dryRun: false,
    includeBreakPunches: true,
    includeCheckIn: true,
    includeCheckOut: true,
    includeDeviceEvents: false,
    includeInvalidPunches: false,
    includeManualPunches: true,
    recalculateAttendance: true,
    skipDuplicates: true,
  });
  const [startContext, setStartContext] = useState<HrAttendanceDeviceSyncStartContext | null>(null);
  const [progress, setProgress] = useState<HrAttendanceDeviceSyncProgress | null>(null);
  const [preview, setPreview] = useState<HrAttendanceDevicePreviewPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<Record<string, unknown> | null>(null);
  const [lockedPeriodAcknowledged, setLockedPeriodAcknowledged] = useState(false);

  const recommendations = useMemo(
    () => [...(startContext?.recommendations ?? [])],
    [startContext],
  );
  const hasBlockingRecommendation = recommendations.some((item) => item.severity === "blocking");
  const hasLockedPeriod = recommendations.some((item) => item.code === "payroll_locked");

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/hr/attendance-devices/${deviceId}/sync-context?strategy=${strategy}`);
      if (!response.ok) return;
      const payload = (await response.json()) as HrAttendanceDeviceSyncStartContext;
      setStartContext(payload);
    })();
  }, [deviceId, strategy]);

  const pollProgress = useCallback(async (activeSessionId: string): Promise<HrAttendanceDeviceSyncProgress | null> => {
    const response = await fetch(`/api/hr/attendance-devices/sync/${activeSessionId}/progress`);
    if (!response.ok) {
      setErrorMessage("Could not load sync progress.");
      return null;
    }
    const payload = (await response.json()) as HrAttendanceDeviceSyncProgress;
    setProgress(payload);
    if (payload.errorMessage) setErrorMessage(payload.errorMessage);
    return payload;
  }, []);

  useEffect(() => {
    if (!sessionId) return undefined;
    if (progress && ["failed", "completed", "cancelled", "preview_ready"].includes(progress.status)) {
      return undefined;
    }
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const latest = await pollProgress(sessionId);
      if (latest && ["failed", "completed", "cancelled", "preview_ready"].includes(latest.status)) {
        cancelled = true;
      }
    };
    void tick();
    const interval = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pollProgress, progress?.status, sessionId]);

  useEffect(() => {
    if (!sessionId || !progress?.previewReady) return;
    setStep("preview");
    void (async () => {
      const response = await fetch(`/api/hr/attendance-devices/sync/${sessionId}/preview`);
      if (!response.ok) return;
      const payload = (await response.json()) as { preview: HrAttendanceDevicePreviewPayload | null };
      if (payload.preview) setPreview(payload.preview);
    })();
  }, [progress?.previewReady, sessionId]);

  async function handleStart() {
    setErrorMessage(null);
    const formData = new FormData();
    formData.set("deviceId", deviceId);
    formData.set("strategy", strategy);
    if (specificDate) formData.set("specificDate", specificDate);
    if (dateFrom) formData.set("dateFrom", dateFrom);
    if (dateTo) formData.set("dateTo", dateTo);
    if (month) formData.set("month", month);
    if (year) formData.set("year", year);
    for (const id of employeeIds) formData.append("employeeIds", id);
    for (const id of departmentIds) formData.append("departmentIds", id);
    for (const [key, value] of Object.entries(syncOptions)) {
      formData.set(key, value ? "true" : "false");
    }
    try {
      const result = await startHrAttendanceDeviceEnterpriseSyncAction(formData);
      setSessionId(result.sessionId);
      setStep("progress");
      await pollProgress(result.sessionId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not start sync.");
    }
  }

  async function handleCancel() {
    if (!sessionId) return;
    if (!window.confirm("Cancel sync? No attendance records will be imported.")) return;
    await cancelHrAttendanceDeviceSyncAction(sessionId);
    closeModal();
    router.refresh();
  }

  async function handleImport(decision: "all" | "valid_only" | "cancel", importWithoutProcessing = false) {
    if (!sessionId) return;
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("decision", decision);
    if (importWithoutProcessing) formData.set("importWithoutProcessing", "true");
    const result = await importHrAttendanceDeviceSyncAction(formData);
    setImportReport(result as Record<string, unknown>);
    setStep("import");
    router.refresh();
  }

  return (
    <RecordFormDialog
      onDismiss={closeModal}
      onOpenChange={handleOpenChange}
      open={open}
      size="wide"
      subtitle="Enterprise sync wizard: choose strategy, validate, preview, then import through attendance runtime."
      title="Enterprise device sync"
    >
      <div className="space-y-4">
        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {step === "strategy" ? (
          <section className="space-y-4">
            <RecommendationPanel recommendations={recommendations} startContext={startContext} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES.map((item) => (
                <button
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm transition",
                    strategy === item ? "border-[hsl(var(--accent))] bg-[hsl(var(--muted))]" : "hover:bg-[hsl(var(--muted))]/50",
                  )}
                  key={item}
                  onClick={() => setStrategy(item)}
                  type="button"
                >
                  <span className="font-medium">{formatHrAttendanceDeviceSyncStrategyLabel(item)}</span>
                </button>
              ))}
            </div>

            {strategy === "specific_date" ? (
              <DatePicker
                name="specificDate"
                onValueChange={(value) => setSpecificDate(value ?? "")}
                placeholder="Sync date"
                value={specificDate}
              />
            ) : null}
            {strategy === "date_range" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <DatePicker name="dateFrom" onValueChange={(value) => setDateFrom(value ?? "")} placeholder="From date" value={dateFrom} />
                <DatePicker name="dateTo" onValueChange={(value) => setDateTo(value ?? "")} placeholder="To date" value={dateTo} />
              </div>
            ) : null}
            {strategy === "month" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <select className={nativeSelectClassName} onChange={(event) => setMonth(event.target.value)} value={month}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
                <input
                  className={nativeSelectClassName}
                  onChange={(event) => setYear(event.target.value)}
                  type="number"
                  value={year}
                />
              </div>
            ) : null}
            {strategy === "employees" ? (
              <div className="space-y-2">
                <EntityLookup
                  label="Add employee"
                  name="pendingEmployeeId"
                  onValueChange={(value) => {
                    setPendingEmployeeId(value);
                    if (value && !employeeIds.includes(value)) {
                      setEmployeeIds((current) => [...current, value]);
                    }
                  }}
                  placeholder="Search employees…"
                  providerKey="hr.employees.lookup"
                  value={pendingEmployeeId}
                />
                {employeeIds.length > 0 ? (
                  <p className="text-xs text-muted-foreground">Selected: {employeeIds.length} employee(s)</p>
                ) : null}
              </div>
            ) : null}
            {strategy === "departments" ? (
              <div className="space-y-2">
                <EntityLookup
                  label="Add department"
                  name="pendingDepartmentId"
                  onValueChange={(value) => {
                    setPendingDepartmentId(value);
                    if (value && !departmentIds.includes(value)) {
                      setDepartmentIds((current) => [...current, value]);
                    }
                  }}
                  placeholder="Search departments…"
                  providerKey="hr.departments.lookup"
                  value={pendingDepartmentId}
                />
                {departmentIds.length > 0 ? (
                  <p className="text-xs text-muted-foreground">Selected: {departmentIds.length} department(s)</p>
                ) : null}
              </div>
            ) : null}

            {hasLockedPeriod ? (
              <label className="flex items-center gap-2 text-sm">
                <input checked={lockedPeriodAcknowledged} onChange={(event) => setLockedPeriodAcknowledged(event.target.checked)} type="checkbox" />
                I understand the selected period includes locked attendance/payroll dates.
              </label>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button onClick={closeModal} type="button" variant="secondary">
                Close
              </Button>
              <Button
                disabled={hasBlockingRecommendation || (hasLockedPeriod && !lockedPeriodAcknowledged)}
                onClick={() => setStep("options")}
                type="button"
                variant="secondary"
              >
                Sync options
              </Button>
              <Button
                disabled={hasBlockingRecommendation || (hasLockedPeriod && !lockedPeriodAcknowledged)}
                onClick={() => void handleStart()}
                type="button"
              >
                Start sync
              </Button>
            </div>
          </section>
        ) : null}

        {step === "options" ? (
          <section className="grid gap-3 md:grid-cols-2">
            {Object.entries(syncOptions).map(([key, value]) => (
              <label className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm" key={key}>
                <span className="capitalize">{key.replaceAll(/([A-Z])/g, " $1")}</span>
                <Switch checked={value} onCheckedChange={(checked) => setSyncOptions((current) => ({ ...current, [key]: checked }))} />
              </label>
            ))}
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button onClick={() => setStep("strategy")} type="button" variant="secondary">
                Back
              </Button>
              <Button onClick={() => void handleStart()} type="button">
                Start sync
              </Button>
            </div>
          </section>
        ) : null}

        {(step === "progress" || step === "preview" || step === "import") && sessionId ? (
          <>
            <nav aria-label="Sync wizard progress" className="rounded-2xl border bg-[hsl(var(--surface))] p-4">
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {HR_ATTENDANCE_DEVICE_SYNC_PHASES.filter((phase) => phase !== "import").map((phase) => {
                  const currentIndex = progress ? HR_ATTENDANCE_DEVICE_SYNC_PHASES.indexOf(progress.phase) : -1;
                  const index = HR_ATTENDANCE_DEVICE_SYNC_PHASES.indexOf(phase);
                  const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending";
                  return (
                    <li
                      className={`rounded-xl border px-3 py-2 text-sm ${state === "current" ? "border-[hsl(var(--accent))] bg-[hsl(var(--muted))]" : ""}`}
                      key={phase}
                    >
                      <span className="block font-medium">{formatHrAttendanceDevicePhaseLabel(phase)}</span>
                      <span className="mt-1 block text-xs capitalize text-muted-foreground">{state}</span>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <HrAttendanceDeviceProgress progress={progress} />
          </>
        ) : null}

        {step === "progress" && sessionId ? (
          <div className="flex justify-end gap-2">
            <Button onClick={() => void handleCancel()} type="button" variant="secondary">
              Cancel sync
            </Button>
          </div>
        ) : null}

        {step === "preview" && preview && sessionId ? (
          <>
            <HrAttendanceDevicePreviewTabs deviceId={deviceId} preview={preview} sessionId={sessionId} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => void handleImport("cancel")} type="button" variant="secondary">
                Cancel
              </Button>
              {hasLockedPeriod ? (
                <Button onClick={() => void handleImport("valid_only", true)} type="button" variant="secondary">
                  Import without processing
                </Button>
              ) : null}
              <Button onClick={() => void handleImport("valid_only")} type="button" variant="secondary">
                Import valid only
              </Button>
              <Button onClick={() => void handleImport("all")} type="button">
                Import all
              </Button>
            </div>
          </>
        ) : null}

        {step === "import" && importReport ? (
          <div className="rounded-md border bg-[hsl(var(--muted))]/30 p-4 text-sm">
            <p className="font-medium">Import completed</p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(importReport, null, 2)}</pre>
            <div className="mt-3 flex justify-end gap-2">
              <a
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                href={`/api/hr/attendance-devices/sync/${sessionId}/report`}
              >
                Download report
              </a>
              <Button onClick={closeModal} type="button">
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </RecordFormDialog>
  );
}

function RecommendationPanel({
  recommendations,
  startContext,
}: Readonly<{
  recommendations: readonly HrAttendanceDeviceSyncRecommendation[];
  startContext: HrAttendanceDeviceSyncStartContext | null;
}>) {
  return (
    <div className="space-y-2 rounded-xl border bg-[hsl(var(--muted))]/20 p-4">
      <p className="text-sm font-medium">Smart recommendations</p>
      {startContext?.lastSuccessfulSyncAt ? (
        <p className="text-xs text-muted-foreground">
          Last successful sync: {new Date(startContext.lastSuccessfulSyncAt).toLocaleString()} · Records since last sync:{" "}
          {startContext.recordsSinceLastSync}
        </p>
      ) : null}
      {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">No recommendations.</p> : null}
      <ul className="space-y-1">
        {recommendations.map((item) => (
          <li
            className={cn(
              "rounded-md px-2 py-1 text-sm",
              item.severity === "blocking"
                ? "bg-destructive/10 text-destructive"
                : item.severity === "warning"
                  ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                  : "text-muted-foreground",
            )}
            key={item.code}
          >
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
