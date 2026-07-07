import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/audit-event";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob, defineJob } from "@/platform/background-jobs/public-api";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";

import {
  HR_ATTENDANCE_LIVE_AUDIT_ACTIONS,
  HR_ATTENDANCE_LIVE_EVENT_KEYS,
  HR_ATTENDANCE_LIVE_JOB_KEYS,
} from "../constants/hr-attendance-live.constants";
import type { HrAttendanceLiveSupervisorActionInput } from "../schemas/hr-attendance-live.schema";
import type {
  HrAttendanceLiveAlert,
  HrAttendanceLiveEmployeeDrawer,
  HrAttendanceLiveExceptionPanelType,
  HrAttendanceLiveExceptionRecord,
  HrAttendanceLiveGridRow,
  HrAttendanceLiveKpis,
  HrAttendanceLiveRefreshPayload,
  HrAttendanceLiveStatus,
  HrAttendanceLiveWorkspaceData,
} from "../types/hr-attendance-live.types";
import { formatHrDisplayLabel } from "../utils/hr-display";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";
import { HrAttendanceService } from "./hr-attendance.service";

const MONITORING_JOB = defineJob({
  key: HR_ATTENDANCE_LIVE_JOB_KEYS.monitoring,
  maxRetries: 1,
  priority: "normal",
  queueKey: "hr-workforce-monitoring",
  retryPolicy: { cancellable: true, delaySeconds: 30, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 300 },
  timeoutSeconds: 300,
});

const EXCEPTION_SCAN_JOB = defineJob({
  key: HR_ATTENDANCE_LIVE_JOB_KEYS.exceptionScan,
  maxRetries: 1,
  priority: "normal",
  queueKey: "hr-workforce-monitoring",
  retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 600 },
  timeoutSeconds: 600,
});

type EmployeeRow = Readonly<Record<string, unknown>>;
type PunchRow = Readonly<Record<string, unknown>>;
type ExceptionRow = Readonly<Record<string, unknown>>;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readExpectedVsActual(value: unknown) {
  const metadata = readMetadata(value);
  return {
    earlyLeaveMinutes: Number(metadata.early_leave_minutes ?? metadata.earlyLeaveMinutes ?? 0),
    firstInAt: metadata.first_in_at ? String(metadata.first_in_at) : metadata.actualFirstIn ? String(metadata.actualFirstIn) : null,
    lastOutAt: metadata.last_out_at ? String(metadata.last_out_at) : metadata.actualLastOut ? String(metadata.actualLastOut) : null,
    lateMinutes: Number(metadata.late_minutes ?? metadata.lateMinutes ?? 0),
    missingIn: Boolean(metadata.missing_in ?? metadata.missingIn),
    missingOut: Boolean(metadata.missing_out ?? metadata.missingOut),
    overtimeMinutes: Number(metadata.overtime_minutes ?? metadata.overtimeMinutes ?? 0),
  };
}

function minutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "HR";
}

function mapExceptionPanelType(exceptionType: string): HrAttendanceLiveExceptionPanelType {
  switch (exceptionType) {
    case "late_arrival":
      return "late";
    case "missing_punch_in":
    case "missing_punch_out":
      return "missing_punch";
    case "duplicate_punch":
      return "duplicate_punch";
    case "out_of_schedule":
      return "outside_shift";
    case "device_mismatch":
      return "device_mismatch";
    case "overtime_requires_approval":
    case "holiday_work":
      return "payroll_blocking";
    default:
      return "manual_adjustment_required";
  }
}

function deriveLiveStatus(input: {
  approvedLeaveToday: boolean;
  breakOpen: boolean;
  checkedIn: boolean;
  checkedOut: boolean;
  exceptionTypes: readonly string[];
  onHoliday: boolean;
  remoteFlag: boolean;
}): HrAttendanceLiveStatus {
  if (input.onHoliday) return "holiday";
  if (input.approvedLeaveToday) return input.remoteFlag ? "remote" : "leave";
  if (input.exceptionTypes.includes("device_mismatch") && input.remoteFlag) return "business_trip";
  if (input.exceptionTypes.includes("missing_punch_in") || input.exceptionTypes.includes("missing_punch_out")) return "missing_punch";
  if (input.exceptionTypes.includes("overtime_requires_approval")) return "overtime";
  if (input.breakOpen) return "on_break";
  if (input.exceptionTypes.includes("late_arrival")) return "late";
  if (input.checkedOut) return "checked_out";
  if (input.checkedIn) return "present";
  return "absent";
}

function encodeCursor(record: EmployeeRow | undefined): string | null {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.created_at, id: record.id })).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export class HrAttendanceLiveService {
  private readonly assignmentResolver: HrAssignmentResolverService;
  private readonly attendanceService: HrAttendanceService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.assignmentResolver = new HrAssignmentResolverService(supabase, context);
    this.attendanceService = new HrAttendanceService(supabase, context);
  }

  async loadWorkspace(query: {
    attendanceStatus?: HrAttendanceLiveStatus;
    branchId?: string;
    cursor?: string;
    departmentId?: string;
    deviceId?: string;
    managerId?: string;
    pageSize: number;
    search?: string;
    shiftId?: string;
  }): Promise<HrAttendanceLiveWorkspaceData> {
    const [filterOptions, snapshot] = await Promise.all([
      this.loadFilterOptions(),
      this.buildSnapshot(query),
    ]);

    return {
      ...filterOptions,
      ...snapshot,
      defaultRefreshIntervalSeconds: 30,
      liveStatusOptions: [
        "present",
        "absent",
        "late",
        "on_break",
        "overtime",
        "checked_out",
        "missing_punch",
        "holiday",
        "leave",
        "remote",
        "business_trip",
      ],
      pageSize: query.pageSize,
    };
  }

  async refreshSnapshot(query: {
    attendanceStatus?: HrAttendanceLiveStatus;
    branchId?: string;
    cursor?: string;
    departmentId?: string;
    deviceId?: string;
    managerId?: string;
    pageSize: number;
    search?: string;
    shiftId?: string;
  }): Promise<HrAttendanceLiveRefreshPayload> {
    const snapshot = await this.buildSnapshot(query);
    return {
      alerts: snapshot.alerts,
      exceptions: snapshot.exceptions,
      kpis: snapshot.kpis,
      nextCursor: snapshot.nextCursor,
      records: snapshot.records,
      snapshotAt: snapshot.snapshotAt,
    };
  }

  async loadEmployeeDrawer(employeeId: string): Promise<HrAttendanceLiveEmployeeDrawer> {
    const today = todayIsoDate();
    const weekStart = new Date(`${today}T00:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const weekStartIso = weekStart.toISOString().slice(0, 10);

    const [{ data: employee }, { data: punches }, assignment, { data: exceptions }, { data: leaveRows }] = await Promise.all([
      this.supabase
        .from("hr_employees")
        .select("id, employee_number, attendance_code, full_name")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("hr_attendance_punch_logs")
        .select("punch_type, punch_time, source, hr_attendance_devices(code, name)")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .gte("punch_time", `${weekStartIso}T00:00:00.000Z`)
        .is("deleted_at", null)
        .order("punch_time", { ascending: false })
        .limit(100),
      this.assignmentResolver.resolveEmployeeAssignments(employeeId, today),
      this.supabase
        .from("hr_attendance_exceptions")
        .select("exception_type, severity, status")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "open")
        .is("deleted_at", null),
      this.supabase
        .from("hr_leave_requests")
        .select("status, approval_status, starts_on, ends_on")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .lte("starts_on", today)
        .gte("ends_on", today)
        .in("approval_status", ["approved", "auto_approved"])
        .is("deleted_at", null),
    ]);

    if (!employee) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Employee not found." });
    }

    const employeeLabel = formatHrDisplayLabel(employee.full_name, "Employee");
    const employeeCode = formatHrDisplayLabel(employee.attendance_code ?? employee.employee_number, "—");
    const punchRows = punches ?? [];
    const todayPunches = punchRows.filter((row) => String(row.punch_time).slice(0, 10) === today);
    const previousWeekPunches = punchRows
      .filter((row) => String(row.punch_time).slice(0, 10) !== today)
      .slice(0, 20)
      .map((row) => {
        const device = row.hr_attendance_devices as { code?: string; name?: string } | null;
        return {
          label: formatHrDisplayLabel(device?.name ?? device?.code, "Punch"),
          punchTime: String(row.punch_time),
          punchType: String(row.punch_type),
        };
      });

    const openExceptions = exceptions ?? [];
    const leaveStatus = (leaveRows ?? []).length > 0 ? "On approved leave today" : "No approved leave today";

    return {
      assignmentSummary: [
        assignment.department?.label ? `Department: ${assignment.department.label}` : null,
        assignment.position?.label ? `Position: ${assignment.position.label}` : null,
        assignment.branchLabel ? `Branch: ${assignment.branchLabel}` : null,
      ].filter(Boolean).join(" · ") || null,
      attendanceCalculationSummary: todayPunches.length > 0 ? `${todayPunches.length} punches recorded today` : "No punches recorded today",
      documentsCount: 0,
      employeeCode,
      employeeId,
      employeeLabel,
      lateRulesSummary: openExceptions.some((row) => String(row.exception_type) === "late_arrival") ? "Late arrival exception open" : "No late rule violations open",
      leaveStatus,
      managerLabel: assignment.manager?.label ?? null,
      overtimeSummary: openExceptions.some((row) => String(row.exception_type) === "overtime_requires_approval") ? "Overtime approval required" : "No overtime approval pending",
      payrollImpactSummary: openExceptions.length > 0 ? `${openExceptions.length} open exceptions may block payroll` : "No payroll-blocking exceptions",
      previousWeekPunches,
      shiftSummary: assignment.shift?.label ?? "No active shift assignment",
      timelineToday: todayPunches.map((row) => {
        const device = row.hr_attendance_devices as { code?: string; name?: string } | null;
        return {
          label: formatHrDisplayLabel(device?.name ?? device?.code ?? row.source, "Punch"),
          punchTime: String(row.punch_time),
          punchType: String(row.punch_type),
        };
      }),
      warningsCount: openExceptions.length,
    };
  }

  async executeSupervisorAction(input: HrAttendanceLiveSupervisorActionInput): Promise<void> {
    const auditBase = {
      category: "data-access" as const,
      context: this.context,
      entityId: input.employeeId,
      entityType: "hr_employee",
      metadata: { action: input.action, reason: input.reason, exceptionId: input.exceptionId ?? null },
      module: "hr" as const,
    };

    switch (input.action) {
      case "approve_missing_punch":
        if (!input.exceptionId) {
          throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Exception id is required to approve missing punch." });
        }
        await this.attendanceService.resolveAttendanceException(input.exceptionId);
        await recordAuditEvent({
          ...auditBase,
          action: defineAuditAction(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.missingPunchApproved),
        });
        break;
      case "ignore_warning":
        if (input.exceptionId) {
          await this.supabase
            .from("hr_attendance_exceptions")
            .update({ metadata: { dismissed_reason: input.reason }, status: "dismissed", updated_by: this.context.userId })
            .eq("tenant_id", this.context.tenantId)
            .eq("id", input.exceptionId);
        }
        await recordAuditEvent({
          ...auditBase,
          action: defineAuditAction(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.exceptionDismissed),
        });
        break;
      case "manual_correction":
        await this.attendanceService.recordPunch({
          employeeId: input.employeeId,
          punchType: "in",
        });
        await recordAuditEvent({
          ...auditBase,
          action: defineAuditAction(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.manualCorrection),
        });
        break;
      case "send_notification":
        await this.supabase.from("hr_workforce_alerts").insert({
          alert_key: HR_ATTENDANCE_LIVE_EVENT_KEYS.payrollBlocking,
          body: input.reason,
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          severity: "warning",
          status: "open",
          tenant_id: this.context.tenantId,
          title: "Attendance supervisor notification",
          updated_by: this.context.userId,
        });
        await recordAuditEvent({
          ...auditBase,
          action: defineAuditAction(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.notificationSent),
        });
        break;
      default:
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Unsupported supervisor action." });
    }
  }

  async exportLiveSnapshotCsv(query: {
    attendanceStatus?: HrAttendanceLiveStatus;
    branchId?: string;
    departmentId?: string;
    deviceId?: string;
    managerId?: string;
    search?: string;
    shiftId?: string;
  }): Promise<string> {
    const snapshot = await this.buildSnapshot({ ...query, cursor: undefined, pageSize: 500 });
    const header = [
      "Employee Code",
      "Employee",
      "Department",
      "Position",
      "Shift",
      "Status",
      "Check In",
      "Check Out",
      "Worked Minutes",
      "Late Minutes",
      "Early Leave Minutes",
      "Overtime Minutes",
      "Device",
      "Last Device Sync",
    ];
    const lines = snapshot.records.map((row) => [
      row.employeeCode,
      row.employeeLabel,
      row.departmentLabel ?? "",
      row.positionLabel ?? "",
      row.shiftLabel ?? "",
      row.liveStatus,
      row.checkInAt ?? "",
      row.checkOutAt ?? "",
      String(row.workedMinutes),
      String(row.lateMinutes),
      String(row.earlyLeaveMinutes),
      String(row.overtimeMinutes),
      row.attendanceDeviceLabel ?? "",
      row.lastDeviceSyncAt ?? "",
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    await recordAuditEvent({
      action: defineAuditAction(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.exportSnapshot),
      category: "data-access",
      context: this.context,
      entityType: "hr_attendance_live_snapshot",
      metadata: { format: "csv", rowCount: snapshot.records.length },
      module: "hr",
    });
    return [header.join(","), ...lines].join("\n");
  }

  scheduleMonitoringJobs(): { correlationId: string } {
    const correlationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    for (const job of [MONITORING_JOB, EXCEPTION_SCAN_JOB]) {
      createBackgroundJob(job, {
        actorType: "automation",
        branchId: this.context.branchId,
        companyId: this.context.companyId,
        correlationId,
        createdAt,
        experience: "erp",
        id: crypto.randomUUID(),
        idempotencyKey: `${job.key}:${this.context.companyId}:${createdAt.slice(0, 16)}`,
        jobKey: job.key,
        originatingApp: "hr",
        payload: { companyId: this.context.companyId, tenantId: this.context.tenantId },
        principalId: this.context.userId,
        tenantId: this.context.tenantId,
      });
    }
    return { correlationId };
  }

  private async loadFilterOptions() {
    const [departments, branches, devices, managers, shifts] = await Promise.all([
      this.supabase
        .from("hr_org_units")
        .select("id, name")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("name")
        .limit(200),
      hydrateLookupOptions("platform.branches.lookup", [this.context.branchId].filter(Boolean) as string[]),
      this.supabase
        .from("hr_attendance_devices")
        .select("id, code, name")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("name")
        .limit(200),
      this.supabase
        .from("hr_employees")
        .select("id, full_name")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("full_name")
        .limit(200),
      this.supabase
        .from("hr_shift_definitions")
        .select("id, name")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("name")
        .limit(200),
    ]);

    return {
      branchOptions: branches.map((option) => ({ id: option.id, label: option.label })),
      departmentOptions: (departments.data ?? []).map((row) => ({
        id: String(row.id),
        label: formatHrDisplayLabel(row.name, "Department"),
      })),
      deviceOptions: (devices.data ?? []).map((row) => ({
        id: String(row.id),
        label: formatHrDisplayLabel(row.name ?? row.code, "Device"),
      })),
      managerOptions: (managers.data ?? []).map((row) => ({
        id: String(row.id),
        label: formatHrDisplayLabel(row.full_name, "Manager"),
      })),
      shiftOptions: (shifts.data ?? []).map((row) => ({
        id: String(row.id),
        label: formatHrDisplayLabel(row.name, "Shift"),
      })),
    };
  }

  private async buildSnapshot(query: {
    attendanceStatus?: HrAttendanceLiveStatus;
    branchId?: string;
    cursor?: string;
    departmentId?: string;
    deviceId?: string;
    managerId?: string;
    pageSize: number;
    search?: string;
    shiftId?: string;
  }) {
    const today = todayIsoDate();
    const cursor = decodeCursor(query.cursor);
    let employeeRequest = this.supabase
      .from("hr_employees")
      .select("id, employee_number, attendance_code, full_name, branch_id, status, created_at")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(query.pageSize + 1);

    if (query.branchId) employeeRequest = employeeRequest.eq("branch_id", query.branchId);
    if (cursor) {
      employeeRequest = employeeRequest.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }
    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term) {
        employeeRequest = employeeRequest.or(`employee_number.ilike.%${term}%,full_name.ilike.%${term}%,attendance_code.ilike.%${term}%`);
      }
    }

    const [
      { data: employeeRows },
      { data: deviceRows },
      { data: exceptionRows },
      { count: pendingImports },
      { data: alerts },
    ] = await Promise.all([
      employeeRequest,
      this.supabase
        .from("hr_attendance_devices")
        .select("id, code, name, health_status, last_sync_at")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null),
      this.supabase
        .from("hr_attendance_exceptions")
        .select("id, employee_id, exception_type, severity, status, hr_attendance_days(work_date), hr_employees(full_name)")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("status", "open")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
      this.supabase
        .from("hr_attendance_device_sync_sessions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.context.tenantId)
        .eq("status", "ready_to_import")
        .is("deleted_at", null),
      this.supabase
        .from("hr_workforce_alerts")
        .select("id, alert_key, title, body, severity, created_at")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const employees = employeeRows ?? [];
    const pageEmployees = employees.slice(0, query.pageSize);
    const nextCursor = employees.length > query.pageSize ? encodeCursor(pageEmployees.at(-1)) : null;
    const employeeIds = pageEmployees.map((row) => String(row.id));

    const [{ data: punchRows }, { data: dayRows }, { data: leaveRows }] = employeeIds.length > 0
      ? await Promise.all([
          this.supabase
            .from("hr_attendance_punch_logs")
            .select("employee_id, punch_type, punch_time, device_id, metadata, raw_payload, hr_attendance_devices(code, name, last_sync_at)")
            .eq("tenant_id", this.context.tenantId)
            .in("employee_id", employeeIds)
            .gte("punch_time", `${today}T00:00:00.000Z`)
            .is("deleted_at", null)
            .order("punch_time"),
          this.supabase
            .from("hr_attendance_days")
            .select("id, employee_id, expected_vs_actual, status")
            .eq("tenant_id", this.context.tenantId)
            .eq("work_date", today)
            .in("employee_id", employeeIds)
            .is("deleted_at", null),
          this.supabase
            .from("hr_leave_requests")
            .select("employee_id, approval_status, metadata")
            .eq("tenant_id", this.context.tenantId)
            .lte("starts_on", today)
            .gte("ends_on", today)
            .in("approval_status", ["approved", "auto_approved"])
            .in("employee_id", employeeIds)
            .is("deleted_at", null),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

    const assignmentSnapshots = await Promise.all(
      pageEmployees.map((row) => this.assignmentResolver.resolveEmployeeAssignments(String(row.id), today)),
    );

    const punchesByEmployee = new Map<string, PunchRow[]>();
    for (const punch of punchRows ?? []) {
      const employeeId = String(punch.employee_id);
      const bucket = punchesByEmployee.get(employeeId) ?? [];
      bucket.push(punch);
      punchesByEmployee.set(employeeId, bucket);
    }

    const dayByEmployee = new Map((dayRows ?? []).map((row) => [String(row.employee_id), row]));
    const leaveByEmployee = new Set((leaveRows ?? []).map((row) => String(row.employee_id)));
    const exceptionsByEmployee = new Map<string, ExceptionRow[]>();
    for (const exception of exceptionRows ?? []) {
      const employeeId = String(exception.employee_id);
      const bucket = exceptionsByEmployee.get(employeeId) ?? [];
      bucket.push(exception);
      exceptionsByEmployee.set(employeeId, bucket);
    }

    const allRows: HrAttendanceLiveGridRow[] = pageEmployees.map((employee, index) => {
      const employeeId = String(employee.id);
      const employeeLabel = formatHrDisplayLabel(employee.full_name, "Employee");
      const employeeCode = formatHrDisplayLabel(employee.attendance_code ?? employee.employee_number, "—");
      const assignment = assignmentSnapshots[index];
      const punches = punchesByEmployee.get(employeeId) ?? [];
      const day = dayByEmployee.get(employeeId);
      const expected = readExpectedVsActual(day?.expected_vs_actual);
      const inPunch = punches.find((row) => row.punch_type === "in");
      const outPunch = [...punches].reverse().find((row) => row.punch_type === "out");
      const breakIn = punches.some((row) => row.punch_type === "break_in") && !punches.some((row) => row.punch_type === "break_out");
      const exceptionTypes = (exceptionsByEmployee.get(employeeId) ?? []).map((row) => String(row.exception_type));
      const lastPunch = punches.at(-1);
      const lastDevice = lastPunch?.hr_attendance_devices as { code?: string; name?: string; last_sync_at?: string } | null;
      const gpsMetadata = readMetadata(lastPunch?.metadata).gps ?? readMetadata(lastPunch?.raw_payload).gps;
      const gpsObject = readMetadata(gpsMetadata);
      const location =
        gpsObject.latitude !== undefined || gpsObject.longitude !== undefined
          ? {
              accuracyMeters: gpsObject.accuracy !== undefined ? Number(gpsObject.accuracy) : null,
              capturedAt: gpsObject.captured_at ? String(gpsObject.captured_at) : lastPunch ? String(lastPunch.punch_time) : null,
              label: gpsObject.label ? String(gpsObject.label) : null,
              latitude: gpsObject.latitude !== undefined ? Number(gpsObject.latitude) : null,
              longitude: gpsObject.longitude !== undefined ? Number(gpsObject.longitude) : null,
            }
          : null;

      const checkInAt = inPunch ? String(inPunch.punch_time) : expected.firstInAt;
      const checkOutAt = outPunch ? String(outPunch.punch_time) : expected.lastOutAt;
      const workedMinutes =
        checkInAt && checkOutAt ? minutesBetween(checkInAt, checkOutAt) : checkInAt ? minutesBetween(checkInAt, new Date().toISOString()) : 0;

      const liveStatus = deriveLiveStatus({
        approvedLeaveToday: leaveByEmployee.has(employeeId),
        breakOpen: breakIn,
        checkedIn: Boolean(checkInAt),
        checkedOut: Boolean(checkOutAt),
        exceptionTypes,
        onHoliday: exceptionTypes.includes("holiday_work"),
        remoteFlag: Boolean(readMetadata((leaveRows ?? []).find((row) => String(row.employee_id) === employeeId)?.metadata).remote),
      });

      return {
        attendanceDayId: day ? String(day.id) : null,
        attendanceDeviceCode: lastDevice?.code ? String(lastDevice.code) : null,
        attendanceDeviceLabel: formatHrDisplayLabel(lastDevice?.name ?? lastDevice?.code),
        branchLabel: assignment.branchLabel,
        checkInAt,
        checkOutAt,
        departmentLabel: assignment.department?.label ?? null,
        earlyLeaveMinutes: expected.earlyLeaveMinutes,
        employeeCode,
        employeeId,
        employeeLabel,
        lastDeviceSyncAt: lastDevice?.last_sync_at ? String(lastDevice.last_sync_at) : null,
        lateMinutes: expected.lateMinutes,
        liveStatus,
        location,
        managerLabel: assignment.manager?.label ?? null,
        overtimeMinutes: expected.overtimeMinutes,
        photoInitials: initialsFromName(employeeLabel),
        positionLabel: assignment.position?.label ?? null,
        shiftLabel: assignment.shift?.label ?? null,
        workedMinutes,
      };
    });

    const filteredRows = query.attendanceStatus
      ? allRows.filter((row) => row.liveStatus === query.attendanceStatus)
      : allRows;

    const assignmentFilteredRows = filteredRows.filter((row) => {
      const rowIndex = pageEmployees.findIndex((employee) => String(employee.id) === row.employeeId);
      const assignment = assignmentSnapshots[rowIndex];
      if (!assignment) return false;
      if (query.departmentId && assignment.department?.referenceEntityId !== query.departmentId) return false;
      if (query.shiftId && assignment.shift?.referenceEntityId !== query.shiftId) return false;
      if (query.managerId && assignment.manager?.referenceEntityId !== query.managerId) return false;
      if (query.deviceId) {
        const punches = punchesByEmployee.get(row.employeeId) ?? [];
        if (!punches.some((punch) => String(punch.device_id ?? "") === query.deviceId)) return false;
      }
      return true;
    });

    const kpis = this.computeKpis({
      deviceRows: deviceRows ?? [],
      exceptionRows: exceptionRows ?? [],
      pendingImports: pendingImports ?? 0,
      rows: assignmentFilteredRows,
      totalActiveEmployees: employees.length,
    });

    const exceptions: HrAttendanceLiveExceptionRecord[] = (exceptionRows ?? []).map((row) => {
      const employee = row.hr_employees as { full_name?: string } | null;
      const day = row.hr_attendance_days as { work_date?: string } | null;
      const exceptionType = String(row.exception_type);
      return {
        employeeId: String(row.employee_id),
        employeeLabel: formatHrDisplayLabel(employee?.full_name, "Employee"),
        exceptionId: String(row.id),
        exceptionType,
        panelType: mapExceptionPanelType(exceptionType),
        severity: String(row.severity),
        status: String(row.status),
        workDate: day?.work_date ? String(day.work_date) : today,
      };
    });

    const liveAlerts: HrAttendanceLiveAlert[] = (alerts ?? []).map((row) => ({
      alertKey: String(row.alert_key),
      body: String(row.body),
      createdAt: String(row.created_at),
      id: String(row.id),
      severity: String(row.severity) as HrAttendanceLiveAlert["severity"],
      title: String(row.title),
    }));

    return {
      alerts: liveAlerts,
      exceptions,
      kpis,
      nextCursor,
      records: assignmentFilteredRows,
      snapshotAt: new Date().toISOString(),
    };
  }

  private computeKpis(input: {
    deviceRows: readonly EmployeeRow[];
    exceptionRows: readonly ExceptionRow[];
    pendingImports: number;
    rows: readonly HrAttendanceLiveGridRow[];
    totalActiveEmployees: number;
  }): HrAttendanceLiveKpis {
    const rows = input.rows;
    const activeDevices = input.deviceRows.filter((row) => !["offline", "never_connected"].includes(String(row.health_status))).length;
    const offlineDevices = input.deviceRows.length - activeDevices;
    const employeesPresent = rows.filter((row) => ["present", "late", "on_break", "overtime"].includes(row.liveStatus)).length;
    const checkedInToday = rows.filter((row) => row.checkInAt).length;
    const missingCheckIn = rows.filter((row) => row.liveStatus === "missing_punch" || row.liveStatus === "absent").length;
    const missingCheckOut = rows.filter((row) => row.checkInAt && !row.checkOutAt && row.liveStatus !== "on_break").length;
    const lateToday = rows.filter((row) => row.liveStatus === "late" || row.lateMinutes > 0).length;
    const earlyLeave = rows.filter((row) => row.earlyLeaveMinutes > 0).length;
    const overtimeRunning = rows.filter((row) => row.liveStatus === "overtime" || row.overtimeMinutes > 0).length;
    const absent = rows.filter((row) => row.liveStatus === "absent").length;
    const currentlyWorking = rows.filter((row) => row.checkInAt && !row.checkOutAt).length;
    const scheduledCount = Math.max(rows.length, 1);
    const currentShiftCoveragePct = Math.round((employeesPresent / scheduledCount) * 100);

    return {
      absent,
      activeDevices,
      checkedInToday,
      currentShiftCoveragePct,
      currentlyWorking,
      earlyLeave,
      employeesPresent,
      lateToday,
      missingCheckIn,
      missingCheckOut,
      offlineDevices,
      overtimeRunning,
      pendingDeviceImports: input.pendingImports,
      snapshotAt: new Date().toISOString(),
    };
  }
}
