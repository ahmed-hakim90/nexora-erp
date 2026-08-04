"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { HrAttendanceDevicePreviewPayload, HrAttendanceDevicePreviewPunch } from "@/features/hr/public-api";
import { formatHrDurationSeconds } from "@/features/hr/public-api";
import { formatHrStatusLabel } from "@/features/hr/public-api";
import {
  applyHrAttendanceDevicePreviewEditsAction,
  saveHrAttendanceDeviceMappingAction,
} from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  DatePicker,
  EntityLookup,
  EnterpriseDataTable,
  Input,
  PlatformTimeline,
  type PlatformTimelineEvent,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

function punchRowKey(punch: Pick<HrAttendanceDevicePreviewPunch, "attendanceCode" | "punchTime" | "punchType">) {
  return `${punch.attendanceCode}::${punch.punchTime}::${punch.punchType}`;
}

const TABS = [
  "summary",
  "employees",
  "punches",
  "attendance",
  "warnings",
  "errors",
  "duplicates",
  "unmatched",
  "mapping",
  "statistics",
  "timeline",
] as const;

export function HrAttendanceDevicePreviewTabs({
  deviceId,
  enableInlineEdits = false,
  onPreviewChange,
  preview,
  sessionId,
}: Readonly<{
  deviceId: string;
  enableInlineEdits?: boolean;
  onPreviewChange?: (preview: HrAttendanceDevicePreviewPayload) => void;
  preview: HrAttendanceDevicePreviewPayload;
  sessionId: string;
}>) {
  const t = useTranslations();
  const [isSavingEdit, startSavingEdit] = useTransition();
  const [previewState, setPreviewState] = useState(preview);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("summary");
  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftAttendanceCode, setDraftAttendanceCode] = useState("");
  const [draftPunchTime, setDraftPunchTime] = useState("");
  const [draftPunchType, setDraftPunchType] = useState<"in" | "out">("in");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewState(preview);
  }, [preview]);

  function updatePreview(nextPreview: HrAttendanceDevicePreviewPayload) {
    setPreviewState(nextPreview);
    onPreviewChange?.(nextPreview);
  }

  function beginInlineEdit(punch: HrAttendanceDevicePreviewPunch) {
    setEditingKey(punchRowKey(punch));
    setDraftAttendanceCode(punch.attendanceCode);
    setDraftPunchTime(punch.punchTime);
    setDraftPunchType(punch.punchType);
  }

  function saveInlineEdit(originalKey: string) {
    startSavingEdit(async () => {
      try {
        const formData = new FormData();
        formData.set("sessionId", sessionId);
        formData.set(
          "edits",
          JSON.stringify([
            {
              attendanceCode: draftAttendanceCode.trim(),
              originalKey,
              punchTime: draftPunchTime,
              punchType: draftPunchType,
            },
          ]),
        );
        const nextPreview = await applyHrAttendanceDevicePreviewEditsAction(formData);
        updatePreview(nextPreview);
        setEditingKey(null);
        platformFeedback.success(t("hr.attendance.devices.sync.preview.editSaved"), { source: "runtime" });
      } catch (cause) {
        platformFeedback.error(t("hr.attendance.devices.sync.preview.editFailed"), {
          description: cause instanceof Error ? cause.message : undefined,
          source: "runtime",
        });
      }
    });
  }

  const warnings = previewState.issues.filter((issue) => issue.severity === "warning" || issue.severity === "info");
  const errors = previewState.issues.filter((issue) => issue.severity === "error" || issue.severity === "blocking");
  const duplicates = previewState.punches.filter((punch) => punch.importResult === "duplicate");
  const unmatched = previewState.employees.filter((employee) => employee.matchStatus === "unknown");
  const searchTerm = search.trim().toLowerCase();
  const filteredPunches = previewState.punches.filter((punch) => {
    if (!searchTerm) return true;
    return (
      punch.employeeLabel.toLowerCase().includes(searchTerm) ||
      punch.attendanceCode.toLowerCase().includes(searchTerm) ||
      punch.punchTime.toLowerCase().includes(searchTerm)
    );
  });
  const timelineEvents: PlatformTimelineEvent[] = useMemo(
    () =>
      previewState.punches.slice(0, 40).map((punch) => ({
        action: `${punch.punchType.toUpperCase()} · ${punch.importResult}`,
        actor: punch.employeeLabel,
        category: "status" as const,
        key: `${punch.punchTime}-${punch.attendanceCode}-${punch.punchType}`,
        source: punch.deviceCode,
        timestamp: punch.punchTime,
      })),
    [previewState.punches],
  );

  return (
    <div className="space-y-4">
      <Input onChange={(event) => setSearch(event.target.value)} placeholder={t("hr.attendance.devices.sync.preview.search")} value={search} />
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              activeTab === tab
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                : "bg-[hsl(var(--surface))] hover:bg-[hsl(var(--muted))]",
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {t(`hr.attendance.devices.sync.preview.tab.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label={t("hr.attendance.devices.sync.preview.employeesRead")} value={previewState.summary.employeesRead} />
          <SummaryCard label={t("hr.common.matched")} value={previewState.summary.employeesMatched} />
          <SummaryCard label={t("hr.common.punches")} value={previewState.summary.punchesRead} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.readyToImport")} value={previewState.summary.punchesReady} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.tab.duplicates")} value={previewState.summary.duplicates} />
          <SummaryCard label={t("hr.common.warnings")} value={previewState.summary.warnings} />
          <SummaryCard label={t("hr.common.errors")} value={previewState.summary.errors} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.blockingErrors")} value={previewState.summary.blockingErrors} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.estImportTime")} value={formatHrDurationSeconds(previewState.summary.estimatedImportSeconds)} />
        </div>
      ) : null}

      {activeTab === "employees" ? (
        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.code"), key: "code", render: (row) => row.deviceCode },
            { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
            {
              header: t("hr.common.status"),
              key: "status",
              render: (row) => (
                <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{row.matchStatus}</span>
              ),
            },
          ]}
          emptyMessage={t("hr.attendance.devices.sync.preview.emptyEmployees")}
          getRowId={(row) => row.deviceCode}
          pagination={{ mode: "page", page: 1, pageSize: previewState.employees.length || 1, totalRows: previewState.employees.length }}
          records={previewState.employees}
        />
      ) : null}

      {activeTab === "attendance" || activeTab === "punches" ? (
        <EnterpriseDataTable
          columns={[
            {
              header: t("hr.common.code"),
              key: "code",
              render: (row) =>
                enableInlineEdits && editingKey === punchRowKey(row) ? (
                  <Input onChange={(event) => setDraftAttendanceCode(event.target.value)} value={draftAttendanceCode} />
                ) : (
                  row.attendanceCode
                ),
            },
            { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
            {
              header: t("hr.common.time"),
              key: "time",
              render: (row) =>
                enableInlineEdits && editingKey === punchRowKey(row) ? (
                  <DatePicker mode="datetime" onValueChange={(value) => setDraftPunchTime(value ?? "")} value={draftPunchTime} />
                ) : (
                  new Date(row.punchTime).toLocaleString()
                ),
            },
            {
              header: t("hr.common.type"),
              key: "type",
              render: (row) =>
                enableInlineEdits && editingKey === punchRowKey(row) ? (
                  <select
                    className={nativeSelectClassName}
                    onChange={(event) => setDraftPunchType(event.target.value as "in" | "out")}
                    value={draftPunchType}
                  >
                    <option value="in">{t("hr.attendance.devices.sync.preview.punchIn")}</option>
                    <option value="out">{t("hr.attendance.devices.sync.preview.punchOut")}</option>
                  </select>
                ) : (
                  row.punchType.toUpperCase()
                ),
            },
            { header: t("hr.common.result"), key: "result", render: (row) => formatHrStatusLabel(row.importResult) },
            ...(enableInlineEdits
              ? [
                  {
                    header: t("hr.common.actions"),
                    key: "actions",
                    render: (row: HrAttendanceDevicePreviewPunch) => {
                      const rowKey = punchRowKey(row);
                      if (editingKey === rowKey) {
                        return (
                          <div className="flex gap-2">
                            <Button disabled={isSavingEdit} onClick={() => saveInlineEdit(rowKey)} size="sm" type="button" variant="primary">
                              {t("hr.common.save")}
                            </Button>
                            <Button disabled={isSavingEdit} onClick={() => setEditingKey(null)} size="sm" type="button" variant="secondary">
                              {t("hr.common.cancel")}
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <Button onClick={() => beginInlineEdit(row)} size="sm" type="button" variant="secondary">
                          {t("hr.common.edit")}
                        </Button>
                      );
                    },
                  },
                ]
              : []),
          ]}
          emptyMessage={t("hr.attendance.devices.sync.preview.emptyPunches")}
          getRowId={(row) => punchRowKey(row)}
          pagination={{ mode: "page", page: 1, pageSize: filteredPunches.length || 1, totalRows: filteredPunches.length }}
          records={filteredPunches}
        />
      ) : null}

      {activeTab === "warnings" ? <IssueList empty={t("hr.attendance.devices.sync.preview.noWarnings")} issues={warnings} /> : null}
      {activeTab === "errors" ? <IssueList empty={t("hr.attendance.devices.sync.preview.noErrors")} issues={errors} /> : null}

      {activeTab === "duplicates" ? (
        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
            { header: t("hr.common.time"), key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
            { header: t("hr.common.type"), key: "type", render: (row) => row.punchType.toUpperCase() },
          ]}
          emptyMessage={t("hr.attendance.devices.sync.preview.emptyDuplicates")}
          getRowId={(row) => `${row.punchTime}-${row.attendanceCode}-${row.punchType}`}
          pagination={{ mode: "page", page: 1, pageSize: duplicates.length || 1, totalRows: duplicates.length }}
          records={duplicates}
        />
      ) : null}

      {activeTab === "mapping" ? (
        <EnterpriseDataTable
          columns={[
            { header: t("hr.attendance.devices.form.deviceCode"), key: "code", render: (row) => row.deviceCode },
            { header: t("hr.common.employee"), key: "employee", render: (row) => row.employeeLabel },
            { header: t("hr.common.match"), key: "match", render: (row) => row.matchStatus },
          ]}
          emptyMessage={t("hr.attendance.devices.sync.preview.emptyMapping")}
          getRowId={(row) => row.deviceCode}
          pagination={{ mode: "page", page: 1, pageSize: previewState.employees.length || 1, totalRows: previewState.employees.length }}
          records={previewState.employees}
        />
      ) : null}

      {activeTab === "statistics" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label={t("hr.attendance.devices.sync.preview.readyPunches")} value={previewState.summary.punchesReady} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.tab.duplicates")} value={previewState.summary.duplicates} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.unknownEmployees")} value={previewState.summary.employeesUnknown} />
          <SummaryCard label={t("hr.attendance.devices.sync.preview.blockingErrors")} value={previewState.summary.blockingErrors} />
        </div>
      ) : null}

      {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title={t("hr.attendance.devices.sync.preview.timelineTitle")} /> : null}

      {activeTab === "unmatched" ? (
        <div className="space-y-3">
          {unmatched.length === 0 ? <p className="text-sm text-muted-foreground">{t("hr.attendance.devices.sync.preview.noUnmatched")}</p> : null}
          {unmatched.map((employee) => (
            <form
              action={saveHrAttendanceDeviceMappingAction}
              className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_auto]"
              key={employee.deviceCode}
            >
              <input name="deviceId" type="hidden" value={deviceId} />
              <input name="sessionId" type="hidden" value={sessionId} />
              <input name="deviceEmployeeCode" type="hidden" value={employee.deviceCode} />
              <div>
                <p className="text-sm font-medium">{t("hr.attendance.devices.sync.preview.unknownCode", { code: employee.deviceCode })}</p>
                <p className="text-xs text-muted-foreground">{t("hr.attendance.devices.sync.preview.mapHint")}</p>
              </div>
              <EntityLookup
                label={t("hr.common.employee")}
                name="employeeId"
                placeholder={t("hr.common.searchEmployee")}
                providerKey="hr.employees.lookup"
                required
              />
              <Button size="sm" type="submit" variant="secondary">
                {t("hr.attendance.devices.sync.preview.saveMapping")}
              </Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="rounded-xl border bg-[hsl(var(--muted))]/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function IssueList({
  empty,
  issues,
}: Readonly<{
  empty: string;
  issues: HrAttendanceDevicePreviewPayload["issues"];
}>) {
  if (issues.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {issues.map((issue, index) => (
        <li className="rounded-md border px-3 py-2 text-sm" key={`${issue.code}-${index}`}>
          <span className="font-medium capitalize">{issue.severity}</span>: {issue.message}
        </li>
      ))}
    </ul>
  );
}
