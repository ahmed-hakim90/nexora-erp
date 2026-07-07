"use client";

import { useMemo, useState } from "react";

import type { HrAttendanceDevicePreviewPayload } from "@/features/hr/public-api";
import { formatHrDurationSeconds } from "@/features/hr/public-api";
import { formatHrStatusLabel } from "@/features/hr/public-api";
import { saveHrAttendanceDeviceMappingAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";
import { Button, EntityLookup, EnterpriseDataTable, Input, PlatformTimeline, type PlatformTimelineEvent } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

const TABS = ["summary", "employees", "punches", "attendance", "warnings", "errors", "duplicates", "unmatched", "mapping", "statistics", "timeline"] as const;

export function HrAttendanceDevicePreviewTabs({
  deviceId,
  preview,
  sessionId,
}: Readonly<{
  deviceId: string;
  preview: HrAttendanceDevicePreviewPayload;
  sessionId: string;
}>) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("summary");
  const [search, setSearch] = useState("");
  const warnings = preview.issues.filter((issue) => issue.severity === "warning" || issue.severity === "info");
  const errors = preview.issues.filter((issue) => issue.severity === "error" || issue.severity === "blocking");
  const duplicates = preview.punches.filter((punch) => punch.importResult === "duplicate");
  const unmatched = preview.employees.filter((employee) => employee.matchStatus === "unknown");
  const searchTerm = search.trim().toLowerCase();
  const filteredPunches = preview.punches.filter((punch) => {
    if (!searchTerm) return true;
    return (
      punch.employeeLabel.toLowerCase().includes(searchTerm) ||
      punch.attendanceCode.toLowerCase().includes(searchTerm) ||
      punch.punchTime.toLowerCase().includes(searchTerm)
    );
  });
  const timelineEvents: PlatformTimelineEvent[] = useMemo(
    () =>
      preview.punches.slice(0, 40).map((punch) => ({
        action: `${punch.punchType.toUpperCase()} · ${punch.importResult}`,
        actor: punch.employeeLabel,
        category: "status" as const,
        key: `${punch.punchTime}-${punch.attendanceCode}-${punch.punchType}`,
        source: punch.deviceCode,
        timestamp: punch.punchTime,
      })),
    [preview.punches],
  );

  return (
    <div className="space-y-4">
      <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search preview…" value={search} />
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition",
              activeTab === tab
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                : "bg-[hsl(var(--surface))] hover:bg-[hsl(var(--muted))]",
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Employees read" value={preview.summary.employeesRead} />
          <SummaryCard label="Matched" value={preview.summary.employeesMatched} />
          <SummaryCard label="Punches read" value={preview.summary.punchesRead} />
          <SummaryCard label="Ready to import" value={preview.summary.punchesReady} />
          <SummaryCard label="Duplicates" value={preview.summary.duplicates} />
          <SummaryCard label="Warnings" value={preview.summary.warnings} />
          <SummaryCard label="Errors" value={preview.summary.errors} />
          <SummaryCard label="Blocking errors" value={preview.summary.blockingErrors} />
          <SummaryCard label="Est. import time" value={formatHrDurationSeconds(preview.summary.estimatedImportSeconds)} />
        </div>
      ) : null}

      {activeTab === "employees" ? (
        <EnterpriseDataTable
          columns={[
            { header: "Code", key: "code", render: (row) => row.deviceCode },
            { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
            {
              header: "Status",
              key: "status",
              render: (row) => (
                <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{row.matchStatus}</span>
              ),
            },
          ]}
          emptyMessage="No employees in preview."
          getRowId={(row) => row.deviceCode}
          pagination={{ mode: "page", page: 1, pageSize: preview.employees.length || 1, totalRows: preview.employees.length }}
          records={preview.employees}
        />
      ) : null}

      {activeTab === "attendance" || activeTab === "punches" ? (
        <EnterpriseDataTable
          columns={[
            { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
            { header: "Time", key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
            { header: "Type", key: "type", render: (row) => row.punchType.toUpperCase() },
            { header: "Result", key: "result", render: (row) => formatHrStatusLabel(row.importResult) },
          ]}
          emptyMessage="No punches in preview."
          getRowId={(row) => `${row.punchTime}-${row.attendanceCode}-${row.punchType}`}
          pagination={{ mode: "page", page: 1, pageSize: filteredPunches.length || 1, totalRows: filteredPunches.length }}
          records={filteredPunches}
        />
      ) : null}

      {activeTab === "warnings" ? <IssueList empty="No warnings." issues={warnings} /> : null}
      {activeTab === "errors" ? <IssueList empty="No errors." issues={errors} /> : null}

      {activeTab === "duplicates" ? (
        <EnterpriseDataTable
          columns={[
            { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
            { header: "Time", key: "time", render: (row) => new Date(row.punchTime).toLocaleString() },
            { header: "Type", key: "type", render: (row) => row.punchType.toUpperCase() },
          ]}
          emptyMessage="No duplicate punches."
          getRowId={(row) => `${row.punchTime}-${row.attendanceCode}-${row.punchType}`}
          pagination={{ mode: "page", page: 1, pageSize: duplicates.length || 1, totalRows: duplicates.length }}
          records={duplicates}
        />
      ) : null}

      {activeTab === "mapping" ? (
        <EnterpriseDataTable
          columns={[
            { header: "Device code", key: "code", render: (row) => row.deviceCode },
            { header: "Employee", key: "employee", render: (row) => row.employeeLabel },
            { header: "Match", key: "match", render: (row) => row.matchStatus },
          ]}
          emptyMessage="No mapping rows."
          getRowId={(row) => row.deviceCode}
          pagination={{ mode: "page", page: 1, pageSize: preview.employees.length || 1, totalRows: preview.employees.length }}
          records={preview.employees}
        />
      ) : null}

      {activeTab === "statistics" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Ready punches" value={preview.summary.punchesReady} />
          <SummaryCard label="Duplicates" value={preview.summary.duplicates} />
          <SummaryCard label="Unknown employees" value={preview.summary.employeesUnknown} />
          <SummaryCard label="Blocking errors" value={preview.summary.blockingErrors} />
        </div>
      ) : null}

      {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title="Sync preview timeline" /> : null}

      {activeTab === "unmatched" ? (
        <div className="space-y-3">
          {unmatched.length === 0 ? <p className="text-sm text-muted-foreground">No unmatched employees.</p> : null}
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
                <p className="text-sm font-medium">Unknown code: {employee.deviceCode}</p>
                <p className="text-xs text-muted-foreground">Map to an employee for future imports.</p>
              </div>
              <EntityLookup
                label="Employee"
                name="employeeId"
                placeholder="Search employee…"
                providerKey="hr.employees.lookup"
                required
              />
              <Button size="sm" type="submit" variant="secondary">
                Save mapping
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
