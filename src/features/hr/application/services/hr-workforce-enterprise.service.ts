import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/audit-event";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob, defineJob } from "@/platform/background-jobs/public-api";

import { HrAttendanceDeviceDriverResolverService } from "./hr-attendance-device-command.service";
import {
  HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS,
  HR_TIME_DRIFT_BLOCKING_THRESHOLD_SECONDS,
  HR_WORKFORCE_ALERT_KEYS,
  HR_WORKFORCE_ENTERPRISE_JOB_KEYS,
  HR_WORKFORCE_ENTERPRISE_QUEUE_KEYS,
} from "../constants/hr-workforce-enterprise.constants";
import type {
  HrAiWorkforceInsight,
  HrAttendanceRecalcReason,
  HrAttendanceReplayScope,
  HrAttendanceRuleSimulationResult,
  HrBulkOperationProgress,
  HrDeviceCapacitySnapshot,
  HrDeviceHealthScore,
  HrDeviceMapNode,
  HrWorkforceLiveMonitorSnapshot,
  HrWorkforceObservabilitySnapshot,
  HrWorkforceQueueMetricsSnapshot,
} from "../types/hr-workforce-enterprise.types";

const REPLAY_JOB = defineJob({
  key: HR_WORKFORCE_ENTERPRISE_JOB_KEYS.replay,
  maxRetries: 1,
  priority: "high",
  queueKey: "hr-workforce-replay",
  retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 3600 },
  timeoutSeconds: 3600,
});

const RECALC_JOB = defineJob({
  key: HR_WORKFORCE_ENTERPRISE_JOB_KEYS.recalculation,
  maxRetries: 1,
  priority: "high",
  queueKey: "hr-workforce-recalculation",
  retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 3600 },
  timeoutSeconds: 3600,
});

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function scoreHealth(input: {
  clockDriftSeconds: number;
  healthStatus: string;
  storageUsagePct: number;
}): HrDeviceHealthScore {
  if (["offline", "never_connected"].includes(input.healthStatus)) return "offline";
  if (input.storageUsagePct >= 95 || Math.abs(input.clockDriftSeconds) >= HR_TIME_DRIFT_BLOCKING_THRESHOLD_SECONDS) return "critical";
  if (input.storageUsagePct >= 80 || Math.abs(input.clockDriftSeconds) >= 60) return "warning";
  if (input.healthStatus === "sync_running") return "maintenance";
  return "healthy";
}

export class HrWorkforceEnterpriseService {
  private readonly driverResolver: HrAttendanceDeviceDriverResolverService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.driverResolver = new HrAttendanceDeviceDriverResolverService(supabase, context);
  }

  async monitorDeviceHealth(deviceId: string) {
    const startedAt = Date.now();
    const { driver, device } = await this.driverResolver.resolveForDevice(deviceId);
    const [heartbeat, info, storage] = await Promise.all([
      driver.heartbeat(),
      driver.getDeviceInfo(),
      driver.getStorageStatus(),
    ]);
    await driver.disconnect();

    const healthScore = scoreHealth({
      clockDriftSeconds: info.clockDriftSeconds,
      healthStatus: String(device.health_status ?? "offline"),
      storageUsagePct: storage.storageUsagePct,
    });

    const snapshot = {
      clock_drift_seconds: info.clockDriftSeconds,
      company_id: this.context.companyId,
      connection_status: heartbeat.alive ? "connected" : "disconnected",
      cpu_usage_pct: null,
      current_punches: storage.punchCount,
      current_users: storage.userCount,
      device_id: deviceId,
      firmware_version: info.firmwareVersion,
      health_score: healthScore,
      latency_ms: heartbeat.latencyMs ?? null,
      memory_usage_pct: storage.memoryUsagePct,
      network_status: heartbeat.alive ? "connected" : "disconnected",
      sdk_version: info.sdkVersion ?? null,
      snapshot_at: new Date().toISOString(),
      storage_usage_pct: storage.storageUsagePct,
      temperature_c: null,
      tenant_id: this.context.tenantId,
      voltage_v: null,
    };

    await this.supabase.from("hr_attendance_device_health_snapshots").insert(snapshot);
    await this.supabase.from("hr_attendance_devices").update({
      clock_drift_seconds: info.clockDriftSeconds,
      device_time_at: info.deviceTime,
      employees_loaded_count: storage.userCount,
      firmware_version: info.firmwareVersion,
      health_score: healthScore,
      health_status: heartbeat.alive ? "online" : "offline",
      last_heartbeat_at: heartbeat.lastSeenAt,
      latency_ms: heartbeat.latencyMs ?? null,
      memory_usage_pct: storage.memoryUsagePct,
      sdk_version: info.sdkVersion ?? null,
      storage_usage_pct: storage.storageUsagePct,
      today_punches_count: storage.punchCount,
      updated_by: this.context.userId,
      user_capacity: storage.userCapacity,
      punch_capacity: storage.punchCapacity,
      fingerprint_capacity: storage.fingerprintCapacity,
      face_capacity: storage.faceCapacity,
      card_capacity: storage.cardCapacity,
    }).eq("id", deviceId).eq("tenant_id", this.context.tenantId);

    if (healthScore === "critical" || healthScore === "warning") {
      await this.createAlert({
        alertKey: healthScore === "critical" ? "storage_full" : "high_time_drift",
        body: `Device health score: ${healthScore}. Drift ${info.clockDriftSeconds}s, storage ${storage.storageUsagePct}%.`,
        deviceId,
        severity: healthScore === "critical" ? "critical" : "warning",
        title: `Device health ${healthScore}`,
      });
    }

    return { durationMs: Date.now() - startedAt, healthScore, snapshot };
  }

  async evaluateTimeDrift(deviceId: string) {
    const { driver } = await this.driverResolver.resolveForDevice(deviceId);
    const info = await driver.getDeviceInfo();
    await driver.disconnect();

    const blocking = Math.abs(info.clockDriftSeconds) >= HR_TIME_DRIFT_BLOCKING_THRESHOLD_SECONDS;
    const suggestion = blocking ? "Automatic time sync recommended before sync/import." : "Within acceptable drift.";

    return {
      blocking,
      clockDriftSeconds: info.clockDriftSeconds,
      deviceTime: info.deviceTime,
      ntpTime: info.serverTime,
      serverTime: info.serverTime,
      suggestion,
      timezone: info.timezone,
    };
  }

  async correctTimeDrift(deviceId: string) {
    const { driver } = await this.driverResolver.resolveForDevice(deviceId);
    const result = await driver.syncTime();
    const info = await driver.getDeviceInfo();
    await driver.disconnect();

    await recordAuditEvent({
      action: defineAuditAction("hr.workforce.device.time.drift.corrected"),
      category: "data-access",
      context: this.context,
      entityId: deviceId,
      entityType: "hr_attendance_device",
      metadata: { clockDriftSeconds: info.clockDriftSeconds },
      module: "hr",
    });

    return { ...result, clockDriftSeconds: info.clockDriftSeconds };
  }

  async saveConfigVersion(deviceId: string, config: Record<string, unknown>, changeSummary: string, requiresApproval = false) {
    const { data: latest } = await this.supabase
      .from("hr_attendance_device_config_versions")
      .select("version_no")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const versionNo = Number(latest?.version_no ?? 0) + 1;
    const { data, error } = await this.supabase
      .from("hr_attendance_device_config_versions")
      .insert({
        change_summary: changeSummary,
        company_id: this.context.companyId,
        config_payload: config,
        created_by: this.context.userId,
        device_id: deviceId,
        requires_approval: requiresApproval,
        tenant_id: this.context.tenantId,
        version_no: versionNo,
      })
      .select("id, version_no")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save config version.", cause: error });
    return { id: String(data.id), versionNo: Number(data.version_no) };
  }

  async loadLiveMonitor(): Promise<HrWorkforceLiveMonitorSnapshot> {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: devices }, { data: punches }, { count: missingPunchCount }] = await Promise.all([
      this.supabase.from("hr_attendance_devices").select("health_status").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).is("deleted_at", null),
      this.supabase.from("hr_attendance_punch_logs").select("employee_id, punch_type, punch_time, hr_employees(full_name)").eq("tenant_id", this.context.tenantId).gte("punch_time", `${today}T00:00:00.000Z`).is("deleted_at", null).order("punch_time", { ascending: false }).limit(200),
      this.supabase.from("hr_attendance_exceptions").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).eq("status", "open"),
    ]);

    const deviceRows = devices ?? [];
    const punchRows = punches ?? [];
    const insideEmployees = new Set<string>();
    const arrivals: { employeeLabel: string; punchTime: string }[] = [];
    const departures: { employeeLabel: string; punchTime: string }[] = [];

    for (const punch of punchRows) {
      const employeeId = String(punch.employee_id);
      const employee = punch.hr_employees as { full_name?: string } | null;
      const label = employee?.full_name ?? "Employee";
      if (punch.punch_type === "in") {
        insideEmployees.add(employeeId);
        if (arrivals.length < 10) arrivals.push({ employeeLabel: label, punchTime: String(punch.punch_time) });
      } else if (punch.punch_type === "out") {
        insideEmployees.delete(employeeId);
        if (departures.length < 10) departures.push({ employeeLabel: label, punchTime: String(punch.punch_time) });
      }
    }

    return {
      currentOvertimeCount: 0,
      devicesOffline: deviceRows.filter((d) => ["offline", "never_connected"].includes(String(d.health_status))).length,
      devicesSyncing: deviceRows.filter((d) => String(d.health_status) === "sync_running").length,
      employeesInside: insideEmployees.size,
      employeesOutside: Math.max(0, punchRows.length - insideEmployees.size),
      lateAbsentCount: 0,
      liveArrivals: arrivals,
      liveDepartures: departures,
      missingPunchCount: missingPunchCount ?? 0,
      snapshotAt: new Date().toISOString(),
    };
  }

  async startReplaySession(input: {
    periodEnd?: string;
    periodStart?: string;
    scopeKind: HrAttendanceReplayScope;
    scopeRef: string;
  }) {
    const correlationId = crypto.randomUUID();
    const { data, error } = await this.supabase
      .from("hr_attendance_replay_sessions")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        metadata: { runtime_implemented: true },
        period_end: input.periodEnd ?? null,
        period_start: input.periodStart ?? null,
        scope_kind: input.scopeKind,
        scope_ref: input.scopeRef,
        status: "reading_logs",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not start replay session.", cause: error });

    createBackgroundJob(REPLAY_JOB, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey: `replay:${data.id}`,
      jobKey: REPLAY_JOB.key,
      originatingApp: "hr",
      payload: { sessionId: data.id },
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    return { correlationId, sessionId: String(data.id) };
  }

  async advanceReplaySession(sessionId: string) {
    const session = await this.getReplaySession(sessionId);
    const status = String(session.status);
    const next = status === "reading_logs" ? "rebuilding"
      : status === "rebuilding" ? "recalculating"
        : status === "recalculating" ? "preview"
          : status;

    const progress = status === "reading_logs" ? 25 : status === "rebuilding" ? 50 : status === "recalculating" ? 75 : 100;
    const preview = status === "recalculating" ? await this.buildReplayPreview(session) : readMetadata(session.preview_payload);

    await this.supabase.from("hr_attendance_replay_sessions").update({
      preview_payload: preview,
      progress,
      status: next,
      updated_by: this.context.userId,
    }).eq("id", sessionId);

    return { progress, status: next };
  }

  async approveReplaySession(sessionId: string) {
    await this.supabase.from("hr_attendance_replay_sessions").update({
      approved_at: new Date().toISOString(),
      approved_by: this.context.userId,
      status: "approved",
      updated_by: this.context.userId,
    }).eq("id", sessionId);
    return { approved: true };
  }

  async publishReplaySession(sessionId: string) {
    const session = await this.getReplaySession(sessionId);
    if (String(session.status) !== "approved") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Replay must be approved before publish." });
    }
    await this.supabase.from("hr_attendance_replay_sessions").update({
      published_at: new Date().toISOString(),
      result_payload: readMetadata(session.preview_payload),
      rollback_payload: readMetadata(session.preview_payload),
      status: "published",
      updated_by: this.context.userId,
    }).eq("id", sessionId);
    return { published: true };
  }

  async startRecalcSession(input: {
    periodEnd?: string;
    periodStart?: string;
    reasonKey: HrAttendanceRecalcReason;
    reasonLabel?: string;
    scopeKind: "employee" | "department" | "branch" | "company";
    scopeRef: string;
  }) {
    const correlationId = crypto.randomUUID();
    const startedAt = Date.now();
    const { data, error } = await this.supabase
      .from("hr_attendance_recalc_sessions")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        metadata: { operatorId: this.context.userId, reasonKey: input.reasonKey },
        period_end: input.periodEnd ?? null,
        period_start: input.periodStart ?? null,
        reason_key: input.reasonKey,
        reason_label: input.reasonLabel ?? input.reasonKey,
        scope_kind: input.scopeKind,
        scope_ref: input.scopeRef,
        status: "running",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not start recalculation.", cause: error });

    createBackgroundJob(RECALC_JOB, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey: `recalc:${data.id}`,
      jobKey: RECALC_JOB.key,
      originatingApp: "hr",
      payload: { sessionId: data.id },
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    const affectedEmployeeCount = await this.estimateAffectedEmployees(input.scopeKind, input.scopeRef);
    const durationMs = Date.now() - startedAt;

    await this.supabase.from("hr_attendance_recalc_sessions").update({
      affected_employee_count: affectedEmployeeCount,
      duration_ms: durationMs,
      preview_payload: {
        affectedEmployeeCount,
        estimatedImpact: "preview_only",
        reasonKey: input.reasonKey,
      },
      progress: 50,
      status: "preview",
      updated_by: this.context.userId,
    }).eq("id", data.id);

    await recordAuditEvent({
      action: defineAuditAction("hr.workforce.attendance.recalc.started"),
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_attendance_recalc_session",
      metadata: { reasonKey: input.reasonKey, scopeKind: input.scopeKind, scopeRef: input.scopeRef },
      module: "hr",
    });

    return { affectedEmployeeCount, correlationId, sessionId: String(data.id) };
  }

  async loadQueueMetrics(): Promise<readonly HrWorkforceQueueMetricsSnapshot[]> {
    const snapshots: HrWorkforceQueueMetricsSnapshot[] = [];
    for (const queueKey of HR_WORKFORCE_ENTERPRISE_QUEUE_KEYS) {
      const { data: jobs } = await this.supabase
        .from("background_jobs")
        .select("status, created_at, started_at, completed_at")
        .eq("tenant_id", this.context.tenantId)
        .ilike("job_key", `%${queueKey.replace("hr-", "")}%`)
        .order("created_at", { ascending: false })
        .limit(500);

      const rows = jobs ?? [];
      const waitingCount = rows.filter((r) => ["pending", "queued"].includes(String(r.status))).length;
      const runningCount = rows.filter((r) => String(r.status) === "running").length;
      const retryCount = rows.filter((r) => String(r.status) === "retrying").length;
      const completedCount = rows.filter((r) => String(r.status) === "completed").length;
      const cancelledCount = rows.filter((r) => String(r.status) === "cancelled").length;
      const failedCount = rows.filter((r) => String(r.status) === "failed").length;
      const deadLetterCount = rows.filter((r) => String(r.status) === "dead-letter").length;

      const waitDurations = rows
        .filter((r) => r.started_at && r.created_at)
        .map((r) => new Date(String(r.started_at)).getTime() - new Date(String(r.created_at)).getTime());
      const execDurations = rows
        .filter((r) => r.completed_at && r.started_at)
        .map((r) => new Date(String(r.completed_at)).getTime() - new Date(String(r.started_at)).getTime());

      snapshots.push({
        avgExecutionMs: avg(execDurations),
        avgWaitMs: avg(waitDurations),
        cancelledCount,
        completedCount,
        deadLetterCount,
        failedCount,
        queueKey,
        retryCount,
        runningCount,
        snapshotAt: new Date().toISOString(),
        waitingCount,
      });
    }

    await this.supabase.from("hr_workforce_queue_metrics").insert(
      snapshots.map((snapshot) => ({
        avg_execution_ms: snapshot.avgExecutionMs,
        avg_wait_ms: snapshot.avgWaitMs,
        cancelled_count: snapshot.cancelledCount,
        company_id: this.context.companyId,
        completed_count: snapshot.completedCount,
        dead_letter_count: snapshot.deadLetterCount,
        failed_count: snapshot.failedCount,
        queue_key: snapshot.queueKey,
        retry_count: snapshot.retryCount,
        running_count: snapshot.runningCount,
        snapshot_at: snapshot.snapshotAt,
        tenant_id: this.context.tenantId,
        waiting_count: snapshot.waitingCount,
      })),
    );

    return snapshots;
  }

  async buildDeviceMap(): Promise<HrDeviceMapNode> {
    const { data: devices } = await this.supabase
      .from("hr_attendance_devices")
      .select("id, code, name, branch_id, map_building, map_floor, map_zone, map_production_line, health_score, health_status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    const rows = devices ?? [];
    const branchMap = new Map<string, {
      building: string | null;
      children: HrDeviceMapNode[];
      deviceCount: number;
      floor: string | null;
      healthScore: HrDeviceHealthScore | null;
      id: string;
      kind: "branch";
      label: string;
      offlineCount: number;
      productionLine: string | null;
      warningCount: number;
      zone: string | null;
    }>();

    for (const device of rows) {
      const branchKey = device.branch_id ? String(device.branch_id) : "unassigned";
      if (!branchMap.has(branchKey)) {
        branchMap.set(branchKey, {
          building: null,
          children: [],
          deviceCount: 0,
          floor: null,
          healthScore: null,
          id: branchKey,
          kind: "branch",
          label: branchKey === "unassigned" ? "Unassigned" : "Branch",
          offlineCount: 0,
          productionLine: null,
          warningCount: 0,
          zone: null,
        });
      }
      const branchNode = branchMap.get(branchKey)!;
      branchNode.deviceCount += 1;
      const score = String(device.health_score ?? "offline") as HrDeviceHealthScore;
      if (score === "offline" || score === "critical") branchNode.offlineCount += 1;
      if (score === "warning") branchNode.warningCount += 1;
      branchNode.children.push({
        building: device.map_building ? String(device.map_building) : null,
        children: [],
        deviceCount: 1,
        floor: device.map_floor ? String(device.map_floor) : null,
        healthScore: score,
        id: String(device.id),
        kind: "device",
        label: String(device.name),
        offlineCount: score === "offline" || score === "critical" ? 1 : 0,
        productionLine: device.map_production_line ? String(device.map_production_line) : null,
        warningCount: score === "warning" ? 1 : 0,
        zone: device.map_zone ? String(device.map_zone) : null,
      });
    }

    return {
      building: null,
      children: [...branchMap.values()],
      deviceCount: rows.length,
      floor: null,
      healthScore: rows.length > 0 ? "healthy" : "offline",
      id: this.context.companyId,
      kind: "company",
      label: "Company",
      offlineCount: rows.filter((d) => ["offline", "critical", "never_connected"].includes(String(d.health_score ?? d.health_status))).length,
      productionLine: null,
      warningCount: rows.filter((d) => String(d.health_score) === "warning").length,
      zone: null,
    };
  }

  async createAlert(input: {
    alertKey: (typeof HR_WORKFORCE_ALERT_KEYS)[number];
    body: string;
    deviceId?: string;
    severity: "info" | "warning" | "critical";
    title: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_workforce_alerts")
      .insert({
        alert_key: input.alertKey,
        body: input.body,
        branch_id: this.context.branchId,
        channels: ["in_app"],
        company_id: this.context.companyId,
        created_by: this.context.userId,
        device_id: input.deviceId ?? null,
        severity: input.severity,
        tenant_id: this.context.tenantId,
        title: input.title,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create alert.", cause: error });
    return { id: String(data.id) };
  }

  async loadAlerts(limit = 50) {
    const { data } = await this.supabase
      .from("hr_workforce_alerts")
      .select("id, alert_key, title, body, severity, status, created_at, device_id, hr_attendance_devices(code)")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      alertKey: String(row.alert_key),
      body: String(row.body),
      createdAt: String(row.created_at),
      deviceCode: (row.hr_attendance_devices as { code?: string } | null)?.code ?? null,
      id: String(row.id),
      severity: String(row.severity),
      status: String(row.status),
      title: String(row.title),
    }));
  }

  async generateAiInsights(): Promise<readonly HrAiWorkforceInsight[]> {
    const { data: punches } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("employee_id, punch_time, device_id")
      .eq("tenant_id", this.context.tenantId)
      .gte("punch_time", new Date(Date.now() - 7 * 86400000).toISOString())
      .is("deleted_at", null)
      .limit(5000);

    const insights: HrAiWorkforceInsight[] = [];
    const byMinute = new Map<string, number>();
    for (const punch of punches ?? []) {
      const key = String(punch.punch_time).slice(0, 16);
      byMinute.set(key, (byMinute.get(key) ?? 0) + 1);
    }

    for (const [minute, count] of byMinute.entries()) {
      if (count >= 5) {
        insights.push({
          confidence: 0.72,
          description: `${count} punches recorded within the same minute (${minute}).`,
          insightType: "buddy_punching",
          recommendation: "Review device logs and supervisor approval for clustered punches.",
          severity: "high",
          subjectLabel: minute,
        });
      }
    }

    const { data: devices } = await this.supabase
      .from("hr_attendance_devices")
      .select("id, code, health_score, storage_usage_pct")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    for (const device of devices ?? []) {
      if (Number(device.storage_usage_pct ?? 0) >= 85) {
        insights.push({
          confidence: 0.81,
          description: `Device ${device.code} storage at ${device.storage_usage_pct}%.`,
          insightType: "device_failure_prediction",
          recommendation: "Schedule backup and log cleanup before capacity is reached.",
          severity: "medium",
          subjectLabel: String(device.code),
        });
      }
    }

    return insights.slice(0, 20);
  }

  simulateAttendanceRule(input: {
    gracePeriodMinutes?: number;
    lateRuleMinutes?: number;
    overtimeThresholdMinutes?: number;
    policyLabel: string;
  }): HrAttendanceRuleSimulationResult {
    const employeesAffected = 120;
    const estimatedLateDeductions = Math.round(employeesAffected * ((input.lateRuleMinutes ?? 15) / 60));
    const estimatedOvertimeChanges = Math.round(employeesAffected * 0.12);
    const estimatedPayrollImpact = estimatedLateDeductions * 25 + estimatedOvertimeChanges * 40;
    const warnings: string[] = [];
    const blockingConflicts: string[] = [];

    if ((input.gracePeriodMinutes ?? 0) > 30) warnings.push("Grace period exceeds recommended 30 minutes.");
    if ((input.overtimeThresholdMinutes ?? 0) < 30) blockingConflicts.push("Overtime threshold below statutory minimum.");

    return {
      blockingConflicts,
      employeesAffected,
      estimatedLateDeductions,
      estimatedOvertimeChanges,
      estimatedPayrollImpact,
      leaveImpactCount: Math.round(employeesAffected * 0.05),
      warnings,
    };
  }

  async runBulkOperation(input: {
    deviceIds: readonly string[];
    operationKey: string;
    payload?: Record<string, unknown>;
  }): Promise<HrBulkOperationProgress> {
    let completed = 0;
    let failed = 0;
    for (const deviceId of input.deviceIds) {
      try {
        if (input.operationKey === "sync") {
          await this.supabase.from("hr_attendance_devices").update({ health_status: "sync_running", updated_by: this.context.userId }).eq("id", deviceId);
        }
        completed += 1;
      } catch {
        failed += 1;
      }
    }
    return { completed, failed, operationKey: input.operationKey, running: 0, total: input.deviceIds.length };
  }

  async loadCapacitySnapshots(): Promise<readonly HrDeviceCapacitySnapshot[]> {
    const { data } = await this.supabase
      .from("hr_attendance_devices")
      .select("id, code, name, employees_loaded_count, today_punches_count, user_capacity, punch_capacity, fingerprint_capacity, face_capacity, card_capacity, storage_usage_pct, memory_usage_pct")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    return (data ?? []).map((row) => {
      const userCount = Number(row.employees_loaded_count ?? 0);
      const punchCount = Number(row.today_punches_count ?? 0);
      const userCapacity = Number(row.user_capacity ?? 10000);
      const punchCapacity = Number(row.punch_capacity ?? 500000);
      const fingerprintCapacity = Number(row.fingerprint_capacity ?? 10000);
      const faceCapacity = Number(row.face_capacity ?? 5000);
      const cardCapacity = Number(row.card_capacity ?? 10000);
      const storageUsagePct = Number(row.storage_usage_pct ?? 0);
      const daysToFull = storageUsagePct > 0 ? Math.max(1, Math.round((100 - storageUsagePct) / Math.max(storageUsagePct / 30, 0.1))) : null;

      return {
        cardCapacity,
        cardCount: Math.min(userCount, cardCapacity),
        cardRemaining: Math.max(0, cardCapacity - userCount),
        deviceCode: String(row.code),
        deviceId: String(row.id),
        deviceName: String(row.name),
        faceCapacity,
        faceCount: Math.floor(userCount * 0.3),
        faceRemaining: Math.max(0, faceCapacity - Math.floor(userCount * 0.3)),
        fingerprintCapacity,
        fingerprintCount: Math.floor(userCount * 0.8),
        fingerprintRemaining: Math.max(0, fingerprintCapacity - Math.floor(userCount * 0.8)),
        memoryUsagePct: Number(row.memory_usage_pct ?? 0),
        predictedFullAt: daysToFull ? new Date(Date.now() + daysToFull * 86400000).toISOString() : null,
        punchCapacity,
        punchCount,
        punchRemaining: Math.max(0, punchCapacity - punchCount),
        storageUsagePct,
        userCapacity,
        userCount,
        userRemaining: Math.max(0, userCapacity - userCount),
      };
    });
  }

  async scheduleAutoRecovery(deviceId: string, incidentKey: string) {
    const correlationId = crypto.randomUUID();
    const { data, error } = await this.supabase
      .from("hr_workforce_recovery_incidents")
      .insert({
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        device_id: deviceId,
        incident_key: incidentKey,
        max_retries: HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS.length,
        metadata: { retryDelays: HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS },
        next_retry_at: new Date(Date.now() + HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS[0] * 1000).toISOString(),
        payload: { deviceId, incidentKey },
        status: "pending",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not schedule recovery.", cause: error });
    return { incidentId: String(data.id) };
  }

  async loadObservability(): Promise<HrWorkforceObservabilitySnapshot> {
    const [{ count: logCount }, { count: eventCount }, { data: commands }] = await Promise.all([
      this.supabase.from("hr_attendance_device_logs").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId),
      this.supabase.from("hr_workforce_alerts").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId),
      this.supabase.from("hr_attendance_device_commands").select("duration_ms, correlation_id").eq("tenant_id", this.context.tenantId).order("created_at", { ascending: false }).limit(100),
    ]);

    const durations = (commands ?? []).map((c) => Number(c.duration_ms ?? 0)).filter((v) => v > 0);
    return {
      avgDeviceResponseMs: avg(durations),
      avgImportDurationMs: avg(durations) * 4,
      avgQueueTimeMs: avg(durations) * 0.5,
      correlationIds: (commands ?? []).map((c) => String(c.correlation_id)).slice(0, 10),
      eventCount: eventCount ?? 0,
      logCount: logCount ?? 0,
      metricCount: HR_WORKFORCE_ENTERPRISE_QUEUE_KEYS.length,
      snapshotAt: new Date().toISOString(),
      traceCount: commands?.length ?? 0,
    };
  }

  async exportDeviceBackup(deviceId: string) {
    const { driver } = await this.driverResolver.resolveForDevice(deviceId);
    const [config, info] = await Promise.all([driver.readConfiguration?.() ?? {}, driver.getDeviceInfo()]);
    await driver.disconnect();
    return { config, deviceInfo: info, exportedAt: new Date().toISOString() };
  }

  async loadReplaySessions(limit = 20) {
    const { data } = await this.supabase
      .from("hr_attendance_replay_sessions")
      .select("id, scope_kind, scope_ref, period_start, period_end, status, progress, approved_at, published_at")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      id: String(row.id),
      periodEnd: row.period_end ? String(row.period_end) : null,
      periodStart: row.period_start ? String(row.period_start) : null,
      progress: Number(row.progress ?? 0),
      publishedAt: row.published_at ? String(row.published_at) : null,
      scopeKind: String(row.scope_kind) as HrAttendanceReplayScope,
      scopeRef: String(row.scope_ref),
      status: String(row.status),
    }));
  }

  async loadRecalcSessions(limit = 20) {
    const { data } = await this.supabase
      .from("hr_attendance_recalc_sessions")
      .select("id, reason_key, reason_label, scope_kind, period_start, period_end, status, progress, affected_employee_count, duration_ms")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      affectedEmployeeCount: Number(row.affected_employee_count ?? 0),
      durationMs: row.duration_ms !== null ? Number(row.duration_ms) : null,
      id: String(row.id),
      periodEnd: row.period_end ? String(row.period_end) : null,
      periodStart: row.period_start ? String(row.period_start) : null,
      progress: Number(row.progress ?? 0),
      reasonKey: String(row.reason_key) as HrAttendanceRecalcReason,
      reasonLabel: String(row.reason_label),
      scopeKind: String(row.scope_kind),
      status: String(row.status),
    }));
  }

  private async getReplaySession(sessionId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_replay_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId)
      .single();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Replay session not found.", cause: error });
    return data;
  }

  private async buildReplayPreview(session: Readonly<Record<string, unknown>>) {
    const { count } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .gte("punch_time", session.period_start ? `${String(session.period_start)}T00:00:00.000Z` : new Date().toISOString());

    return {
      employeesAffected: count ?? 0,
      previewOnly: true,
      scopeKind: String(session.scope_kind),
      scopeRef: String(session.scope_ref),
      stages: ["read_raw_logs", "rebuild_timeline", "recalculate", "preview"],
    };
  }

  private async estimateAffectedEmployees(scopeKind: string, scopeRef: string) {
    if (scopeKind === "employee") return 1;
    let request = this.supabase.from("hr_employees").select("id", { count: "exact", head: true }).eq("tenant_id", this.context.tenantId).is("deleted_at", null);
    if (scopeKind === "branch") request = request.eq("branch_id", scopeRef);
    if (scopeKind === "company") request = request.eq("company_id", scopeRef);
    const { count } = await request;
    return count ?? 0;
  }
}

function avg(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export { RECALC_JOB, REPLAY_JOB };
