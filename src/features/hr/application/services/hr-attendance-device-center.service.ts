import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";

import type {
  HrAttendanceDeviceAnalytics,
  HrAttendanceDeviceAuditRecord,
  HrAttendanceDeviceConnectionSnapshot,
  HrAttendanceDeviceDetailRecord,
  HrAttendanceDeviceDiagnosticRecord,
  HrAttendanceDeviceFleetAnalytics,
  HrAttendanceDevicePunchRecord,
  HrAttendanceDeviceRealtimeEvent,
  HrAttendanceDeviceUserRecord,
} from "../types/hr-attendance-device.types";
import { formatHrDisplayLabel } from "../utils/hr-display";
import { readDeviceMetadata } from "../utils/hr-attendance-device-credentials";
import { computeDeviceHealthDimensions } from "../utils/hr-attendance-device-health";
import { formatHrDeviceTypeLabel } from "../utils/hr-attendance-device-display";

function readMetadata(value: unknown): Record<string, unknown> {
  return readDeviceMetadata(value);
}

function readString(value: unknown, fallback = ""): string {
  return value !== null && value !== undefined ? String(value) : fallback;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function durationSeconds(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / 1000);
}

function mapDeviceProtocol(deviceType: string): string {
  if (["cloud_attendance", "api_import"].includes(deviceType)) return "REST";
  if (deviceType === "excel_import") return "FILE";
  return "TCP";
}

function inferVendor(deviceType: string, metadata: Record<string, unknown>): string {
  if (metadata.vendor) return String(metadata.vendor);
  return formatHrDeviceTypeLabel(deviceType);
}

function inferModel(deviceType: string, metadata: Record<string, unknown>, firmware: string | null): string | null {
  if (metadata.model) return String(metadata.model);
  return firmware ? `${formatHrDeviceTypeLabel(deviceType)} device` : null;
}

export class HrAttendanceDeviceCenterService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadDeviceDetail(deviceId: string): Promise<HrAttendanceDeviceDetailRecord> {
    const device = await this.getDeviceRow(deviceId);
    const metadata = readMetadata(device.metadata);
    const branchLabel = await this.resolveBranchLabel(device.branch_id ? String(device.branch_id) : null);
    const healthDimensions = computeDeviceHealthDimensions({
      autoSyncInterval: String(device.auto_sync_interval ?? "disabled"),
      clockDriftSeconds: Number(device.clock_drift_seconds ?? 0),
      connectionQuality: String(device.connection_quality ?? "unknown"),
      firmwareVersion: device.firmware_version ? String(device.firmware_version) : null,
      healthScore: device.health_score ? String(device.health_score) : null,
      healthStatus: String(device.health_status ?? "never_connected"),
      lastHeartbeatAt: device.last_heartbeat_at ? String(device.last_heartbeat_at) : null,
      lastSyncAt: device.last_sync_at ? String(device.last_sync_at) : null,
      latencyMs: device.latency_ms !== null && device.latency_ms !== undefined ? Number(device.latency_ms) : null,
      memoryUsagePct: device.memory_usage_pct !== null ? Number(device.memory_usage_pct) : null,
      pendingQueueCount: Number(device.pending_queue_count ?? 0),
      storageUsagePct: device.storage_usage_pct !== null ? Number(device.storage_usage_pct) : null,
    });

    const [importedToday, failedImportsToday] = await Promise.all([
      this.countImportedToday(deviceId),
      this.countFailedImportsToday(deviceId),
    ]);

    return {
      autoSyncInterval: String(device.auto_sync_interval ?? "disabled") as HrAttendanceDeviceDetailRecord["autoSyncInterval"],
      branchLabel,
      clockDriftSeconds: Number(device.clock_drift_seconds ?? 0),
      code: String(device.code),
      connectionQuality: String(device.connection_quality ?? "unknown"),
      cpuUsagePct: device.cpu_usage_pct !== null ? Number(device.cpu_usage_pct) : null,
      deviceTimeAt: device.device_time_at ? String(device.device_time_at) : null,
      deviceType: String(device.device_type),
      driverKey: device.driver_key ? String(device.driver_key) : null,
      employeesLoaded: Number(device.employees_loaded_count ?? 0),
      failedImportsToday,
      firmware: device.firmware_version ? String(device.firmware_version) : null,
      healthDimensions,
      healthScore: device.health_score ? String(device.health_score) : null,
      healthStatus: String(device.health_status) as HrAttendanceDeviceDetailRecord["healthStatus"],
      hostname: metadata.hostname ? String(metadata.hostname) : null,
      id: String(device.id),
      importedToday,
      ipAddress: device.ip_address ? String(device.ip_address) : null,
      lastHeartbeatAt: device.last_heartbeat_at ? String(device.last_heartbeat_at) : null,
      lastRestartAt: metadata.lastRestartAt ? String(metadata.lastRestartAt) : null,
      lastSyncAt: device.last_sync_at ? String(device.last_sync_at) : null,
      latencyMs: device.latency_ms !== null && device.latency_ms !== undefined ? Number(device.latency_ms) : null,
      macAddress: metadata.macAddress ? String(metadata.macAddress) : null,
      memoryUsagePct: device.memory_usage_pct !== null ? Number(device.memory_usage_pct) : null,
      model: inferModel(String(device.device_type), metadata, device.firmware_version ? String(device.firmware_version) : null),
      name: String(device.name),
      networkStatus: String(device.network_status ?? "unknown"),
      nextAutoSyncAt: device.next_auto_sync_at ? String(device.next_auto_sync_at) : null,
      operatorLabel: metadata.operatorLabel ? String(metadata.operatorLabel) : null,
      pendingQueue: Number(device.pending_queue_count ?? 0),
      port: device.port !== null && device.port !== undefined ? Number(device.port) : null,
      protocol: mapDeviceProtocol(String(device.device_type)),
      sdkVersion: device.sdk_version ? String(device.sdk_version) : null,
      serialNumber: device.serial_number ? String(device.serial_number) : null,
      status: String(device.status),
      storageUsagePct: device.storage_usage_pct !== null ? Number(device.storage_usage_pct) : null,
      temperatureC: device.temperature_c !== null ? Number(device.temperature_c) : null,
      timezone: String(device.timezone ?? "UTC"),
      todayPunches: Number(device.today_punches_count ?? 0),
      vendor: inferVendor(String(device.device_type), metadata),
    };
  }

  async loadConnectionSnapshot(deviceId: string): Promise<HrAttendanceDeviceConnectionSnapshot> {
    const device = await this.getDeviceRow(deviceId);
    const metadata = readMetadata(device.metadata);

    const { data: snapshots } = await this.supabase
      .from("hr_attendance_device_health_snapshots")
      .select("snapshot_at, latency_ms, connection_status")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .order("snapshot_at", { ascending: false })
      .limit(24);

    const rows = snapshots ?? [];
    const latencyHistory = rows
      .filter((row) => row.latency_ms !== null)
      .map((row) => ({ at: String(row.snapshot_at), latencyMs: Number(row.latency_ms) }))
      .reverse();

    const heartbeatHistory = rows
      .map((row) => ({
        at: String(row.snapshot_at),
        latencyMs: row.latency_ms !== null ? Number(row.latency_ms) : null,
        status: String(row.connection_status),
      }))
      .reverse();

    const packetLossPct =
      latencyHistory.length > 1
        ? Math.round(
            (latencyHistory.filter((point) => point.latencyMs > 500).length / latencyHistory.length) * 100,
          )
        : null;

    return {
      heartbeatHistory,
      hostname: metadata.hostname ? String(metadata.hostname) : null,
      ipAddress: device.ip_address ? String(device.ip_address) : null,
      latencyHistory,
      macAddress: metadata.macAddress ? String(metadata.macAddress) : null,
      packetLossPct,
      port: device.port !== null && device.port !== undefined ? Number(device.port) : null,
      protocol: mapDeviceProtocol(String(device.device_type)),
    };
  }

  async loadRealtimeEvents(deviceId: string, limit = 50): Promise<readonly HrAttendanceDeviceRealtimeEvent[]> {
    const device = await this.getDeviceRow(deviceId);
    const { data } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("id, punch_time, punch_type, status, employee_id, hr_employees(full_name)")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .is("deleted_at", null)
      .order("punch_time", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => {
      const employee = row.hr_employees as { full_name?: string } | null;
      return {
        deviceCode: String(device.code),
        direction: String(row.punch_type) as "in" | "out",
        employeeLabel: formatHrDisplayLabel(employee?.full_name, "Employee"),
        id: String(row.id),
        punchTime: String(row.punch_time),
        status: String(row.status),
      };
    });
  }

  async loadDeviceUsers(
    deviceId: string,
    query: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<{ records: readonly HrAttendanceDeviceUserRecord[]; totalRows: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    let request = this.supabase
      .from("hr_attendance_device_employee_mappings")
      .select("id, device_employee_code, employee_id, updated_at, hr_employees(full_name, status)", { count: "exact" })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .is("deleted_at", null)
      .order("device_employee_code")
      .range(offset, offset + pageSize - 1);

    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term) request = request.ilike("device_employee_code", `%${term}%`);
    }

    const { data, count } = await request;
    const codeCounts = new Map<string, number>();
    for (const row of data ?? []) {
      const code = String(row.device_employee_code);
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }

    const records: HrAttendanceDeviceUserRecord[] = (data ?? []).map((row) => {
      const employee = row.hr_employees as { full_name?: string; status?: string } | null;
      const code = String(row.device_employee_code);
      const employeeStatus = employee?.status ? String(employee.status) : null;
      return {
        deviceCode: code,
        employeeId: row.employee_id ? String(row.employee_id) : null,
        employeeLabel: formatHrDisplayLabel(employee?.full_name, "Unmapped"),
        employeeStatus,
        id: String(row.id),
        isDuplicate: (codeCounts.get(code) ?? 0) > 1,
        isInactive: employeeStatus === "inactive" || employeeStatus === "archived",
        isUnmapped: !row.employee_id,
        lastSyncAt: row.updated_at ? String(row.updated_at) : null,
      };
    });

    return { records, totalRows: count ?? records.length };
  }

  async loadDevicePunches(
    deviceId: string,
    query: {
      branchId?: string;
      dateFrom?: string;
      dateTo?: string;
      direction?: string;
      employeeId?: string;
      page?: number;
      pageSize?: number;
      status?: string;
    } = {},
  ): Promise<{ records: readonly HrAttendanceDevicePunchRecord[]; totalRows: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const device = await this.getDeviceRow(deviceId);

    let request = this.supabase
      .from("hr_attendance_punch_logs")
      .select("id, punch_time, punch_type, status, source, branch_id, hr_employees(full_name)", { count: "exact" })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .is("deleted_at", null)
      .order("punch_time", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (query.employeeId) request = request.eq("employee_id", query.employeeId);
    if (query.direction) request = request.eq("punch_type", query.direction);
    if (query.status) request = request.eq("status", query.status);
    if (query.branchId) request = request.eq("branch_id", query.branchId);
    if (query.dateFrom) request = request.gte("punch_time", `${query.dateFrom}T00:00:00.000Z`);
    if (query.dateTo) request = request.lte("punch_time", `${query.dateTo}T23:59:59.999Z`);

    const { data, count } = await request;
    const branchIds = [...new Set((data ?? []).map((row) => row.branch_id).filter(Boolean).map(String))];
    const branchLabels = new Map<string, string>();
    if (branchIds.length > 0) {
      const hydrated = await hydrateLookupOptions("platform.branches.lookup", branchIds);
      for (const option of hydrated) branchLabels.set(option.id, option.label);
    }

    const records: HrAttendanceDevicePunchRecord[] = (data ?? []).map((row) => {
      const employee = row.hr_employees as { full_name?: string } | null;
      return {
        branchLabel: row.branch_id ? (branchLabels.get(String(row.branch_id)) ?? null) : null,
        deviceCode: String(device.code),
        direction: String(row.punch_type) as "in" | "out",
        employeeLabel: formatHrDisplayLabel(employee?.full_name, "Employee"),
        id: String(row.id),
        punchTime: String(row.punch_time),
        processingStatus: String(row.status),
        source: String(row.source),
      };
    });

    return { records, totalRows: count ?? records.length };
  }

  async loadDiagnosticHistory(deviceId: string, limit = 50): Promise<readonly HrAttendanceDeviceDiagnosticRecord[]> {
    const { data } = await this.supabase
      .from("hr_attendance_device_logs")
      .select("id, message, created_at, payload, log_level")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .eq("log_source", "diagnostic")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => {
      const payload = readMetadata(row.payload);
      const level = String(row.log_level);
      const resultStatus =
        level === "error" ? "critical" : level === "warn" ? "warning" : ("healthy" as const);
      return {
        action: readString(payload.action, "diagnostic"),
        createdAt: String(row.created_at),
        durationMs: payload.durationMs !== undefined ? Number(payload.durationMs) : null,
        id: String(row.id),
        message: String(row.message),
        resultStatus,
      };
    });
  }

  async loadDeviceAudit(deviceId: string, limit = 50): Promise<readonly HrAttendanceDeviceAuditRecord[]> {
    const { data } = await this.supabase
      .from("audit_events")
      .select("id, action, occurred_at, metadata, actor_type, subject_display")
      .eq("tenant_id", this.context.tenantId)
      .eq("subject_type", "hr_attendance_device")
      .eq("subject_id", deviceId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      action: String(row.action),
      actorLabel: formatHrDisplayLabel(row.subject_display ?? row.actor_type, "System"),
      createdAt: String(row.occurred_at),
      id: String(row.id),
      metadata: readMetadata(row.metadata),
    }));
  }

  async loadDeviceAnalytics(deviceId: string): Promise<HrAttendanceDeviceAnalytics> {
    const today = todayIsoDate();
    const weekStart = weekStartIsoDate();

    const [punchesToday, weekPunches, sessions, punchHours] = await Promise.all([
      this.countPunchesSince(deviceId, `${today}T00:00:00.000Z`),
      this.loadDailyPunchCounts(deviceId, weekStart),
      this.loadRecentSessions(deviceId, 30),
      this.loadHourlyUsage(deviceId, today),
    ]);

    const completedSessions = sessions.filter((row) => row.completed_at && row.started_at);
    const syncDurationTrend = this.buildSyncDurationTrend(completedSessions);
    const importTrend = this.buildImportTrend(completedSessions);
    const topErrors = this.buildTopErrors(sessions);
    const availabilityPct = this.computeAvailability(sessions);
    const offlinePct = Math.max(0, 100 - availabilityPct);

    return {
      availabilityPct,
      importTrend,
      offlinePct,
      punchesThisWeek: weekPunches,
      punchesToday,
      syncDurationTrend,
      topErrors,
      usageHours: punchHours,
    };
  }

  async loadFleetAnalytics(): Promise<HrAttendanceDeviceFleetAnalytics> {
    const weekStart = weekStartIsoDate();

    const { data: devices } = await this.supabase
      .from("hr_attendance_devices")
      .select("id, code, name, health_status, today_punches_count")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    const { data: sessions } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("status, started_at, completed_at, error_message, import_report, summary")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const deviceRows = devices ?? [];
    const sessionRows = sessions ?? [];
    const punchesToday = deviceRows.reduce((sum, row) => sum + Number(row.today_punches_count ?? 0), 0);
    const offlineCount = deviceRows.filter((row) => ["offline", "never_connected"].includes(String(row.health_status))).length;
    const offlinePct = deviceRows.length > 0 ? Math.round((offlineCount / deviceRows.length) * 100) : 0;
    const availabilityPct = 100 - offlinePct;

    const weekPunches = await this.loadFleetDailyPunchCounts(weekStart);
    const completedSessions = sessionRows.filter((row) => row.completed_at && row.started_at);
    const syncDurationTrend = this.buildSyncDurationTrend(completedSessions);
    const importTrend = this.buildImportTrend(completedSessions);
    const topErrors = this.buildTopErrors(sessionRows);

    const deviceUsage = deviceRows
      .map((row) => ({
        deviceCode: String(row.code),
        deviceName: String(row.name),
        punches: Number(row.today_punches_count ?? 0),
      }))
      .sort((a, b) => b.punches - a.punches)
      .slice(0, 10);

    return {
      availabilityPct,
      deviceUsage,
      importTrend,
      offlinePct,
      punchesThisWeek: weekPunches,
      punchesToday,
      syncDurationTrend,
      topErrors,
    };
  }

  private async getDeviceRow(deviceId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_devices")
      .select("*")
      .eq("id", deviceId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Attendance device not found.", cause: error });
    }
    return data;
  }

  private async resolveBranchLabel(branchId: string | null): Promise<string> {
    if (!branchId) return "All branches";
    const hydrated = await hydrateLookupOptions("platform.branches.lookup", [branchId]);
    return hydrated[0]?.label ?? "Branch";
  }

  private async countImportedToday(deviceId: string): Promise<number> {
    const today = todayIsoDate();
    const { count } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .gte("imported_at", `${today}T00:00:00.000Z`)
      .is("deleted_at", null);
    return count ?? 0;
  }

  private async countFailedImportsToday(deviceId: string): Promise<number> {
    const today = todayIsoDate();
    const { count } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .eq("status", "failed")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .is("deleted_at", null);
    return count ?? 0;
  }

  private async countPunchesSince(deviceId: string, sinceIso: string): Promise<number> {
    const { count } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .gte("punch_time", sinceIso)
      .is("deleted_at", null);
    return count ?? 0;
  }

  private async loadDailyPunchCounts(
    deviceId: string,
    fromDate: string,
  ): Promise<readonly { count: number; date: string }[]> {
    const { data } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("punch_time")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .gte("punch_time", `${fromDate}T00:00:00.000Z`)
      .is("deleted_at", null)
      .limit(5000);

    const counts = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(fromDate);
      date.setDate(date.getDate() + i);
      counts.set(date.toISOString().slice(0, 10), 0);
    }
    for (const row of data ?? []) {
      const date = String(row.punch_time).slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ count, date }));
  }

  private async loadFleetDailyPunchCounts(fromDate: string): Promise<readonly { count: number; date: string }[]> {
    const { data } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("punch_time")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .gte("punch_time", `${fromDate}T00:00:00.000Z`)
      .is("deleted_at", null)
      .limit(10000);

    const counts = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(fromDate);
      date.setDate(date.getDate() + i);
      counts.set(date.toISOString().slice(0, 10), 0);
    }
    for (const row of data ?? []) {
      const date = String(row.punch_time).slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ count, date }));
  }

  private async loadHourlyUsage(deviceId: string, date: string): Promise<readonly { hour: number; punches: number }[]> {
    const { data } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("punch_time")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .gte("punch_time", `${date}T00:00:00.000Z`)
      .lte("punch_time", `${date}T23:59:59.999Z`)
      .is("deleted_at", null)
      .limit(5000);

    const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, punches: 0 }));
    for (const row of data ?? []) {
      const hour = new Date(String(row.punch_time)).getUTCHours();
      if (hour >= 0 && hour < 24) counts[hour].punches += 1;
    }
    return counts;
  }

  private async loadRecentSessions(deviceId: string, limit: number) {
    const { data } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("status, started_at, completed_at, error_message, import_report, summary")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  private buildSyncDurationTrend(
    sessions: readonly Readonly<Record<string, unknown>>[],
  ): readonly { date: string; durationSeconds: number }[] {
    const byDate = new Map<string, number[]>();
    for (const row of sessions) {
      const seconds = durationSeconds(
        row.started_at ? String(row.started_at) : null,
        row.completed_at ? String(row.completed_at) : null,
      );
      if (seconds === null) continue;
      const date = String(row.completed_at).slice(0, 10);
      const bucket = byDate.get(date) ?? [];
      bucket.push(seconds);
      byDate.set(date, bucket);
    }
    return [...byDate.entries()]
      .map(([date, values]) => ({
        date,
        durationSeconds: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }

  private buildImportTrend(
    sessions: readonly Readonly<Record<string, unknown>>[],
  ): readonly { date: string; imported: number }[] {
    const byDate = new Map<string, number>();
    for (const row of sessions) {
      if (String(row.status) !== "completed") continue;
      const report = readMetadata(row.import_report);
      const imported = Number(report.importedCount ?? 0);
      const date = row.completed_at ? String(row.completed_at).slice(0, 10) : todayIsoDate();
      byDate.set(date, (byDate.get(date) ?? 0) + imported);
    }
    return [...byDate.entries()]
      .map(([date, imported]) => ({ date, imported }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }

  private buildTopErrors(
    sessions: readonly Readonly<Record<string, unknown>>[],
  ): readonly { count: number; message: string }[] {
    const counts = new Map<string, number>();
    for (const row of sessions) {
      if (String(row.status) !== "failed" || !row.error_message) continue;
      const message = String(row.error_message);
      counts.set(message, (counts.get(message) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([message, count]) => ({ count, message }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private computeAvailability(sessions: readonly Readonly<Record<string, unknown>>[]): number {
    if (sessions.length === 0) return 100;
    const failed = sessions.filter((row) => String(row.status) === "failed").length;
    return Math.round(((sessions.length - failed) / sessions.length) * 100);
  }
}
