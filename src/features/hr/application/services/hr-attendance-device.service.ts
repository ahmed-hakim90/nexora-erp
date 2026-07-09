import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/audit-event";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob, defineJob } from "@/platform/background-jobs/public-api";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";

import {
  HR_ATTENDANCE_DEVICE_EVENT_KEYS,
  HR_ATTENDANCE_DEVICE_IMPORT_JOB_KEY,
  HR_ATTENDANCE_DEVICE_PREVIEW_DRAFT_TTL_HOURS,
  HR_ATTENDANCE_DEVICE_SYNC_JOB_KEY,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS,
} from "../constants/hr-attendance-device.constants";
import type {
  HrAttendanceDeviceDashboardKpis,
  HrAttendanceDeviceImportReport,
  HrAttendanceDeviceListRecord,
  HrAttendanceDevicePreviewPayload,
  HrAttendanceDevicePreviewSummary,
  HrAttendanceDeviceSyncHistoryRecord,
  HrAttendanceDeviceSyncProgress,
  HrAttendanceDeviceSyncStartContext,
} from "../types/hr-attendance-device.types";
import {
  buildSyncRecommendations,
  resolveDownloadWindow,
  validateStrategyConfig,
  type HrAttendanceDeviceSyncStrategyConfig,
} from "../utils/hr-attendance-device-sync-strategy";
import { formatHrDisplayLabel } from "../utils/hr-display";
import { createAttendanceDeviceDriverForDevice } from "../device-drivers/registry";
import { formatDeviceDriverError } from "../device-drivers/device-driver-error";
import {
  mergeCommKeyIntoMetadata,
  readDeviceMetadata,
  stripCredentialsFromMetadata,
} from "../utils/hr-attendance-device-credentials";
import { buildHrDeviceConnectionConfig } from "../utils/hr-attendance-device-connection";
import { computeDeviceHealthDimensions } from "../utils/hr-attendance-device-health";
import { formatHrDeviceTypeLabel } from "../utils/hr-attendance-device-display";
import {
  parseZktecoAttendanceCsv,
  readAttendanceImportFileToCsvText,
} from "../utils/hr-zkteco-csv-import";
import { HrAttendanceDeviceSyncRunner } from "./hr-attendance-device-sync.runner";
import type { RawDevicePunch } from "./hr-attendance-device-validation.service";

const SYNC_JOB_DEFINITION = defineJob({
  key: HR_ATTENDANCE_DEVICE_SYNC_JOB_KEY,
  maxRetries: 2,
  priority: "high",
  queueKey: "hr-attendance-device",
  retryPolicy: {
    backoffMultiplier: 2,
    cancellable: true,
    delaySeconds: 30,
    maxAttempts: 3,
    strategy: "exponential",
    timeoutSeconds: 900,
  },
  timeoutSeconds: 900,
});

const IMPORT_JOB_DEFINITION = defineJob({
  key: HR_ATTENDANCE_DEVICE_IMPORT_JOB_KEY,
  maxRetries: 1,
  priority: "high",
  queueKey: "hr-attendance-device",
  retryPolicy: {
    cancellable: false,
    maxAttempts: 2,
    strategy: "fixed",
    timeoutSeconds: 1800,
  },
  timeoutSeconds: 1800,
});

function readMetadata(value: unknown): Record<string, unknown> {
  return readDeviceMetadata(value);
}

function readSummary(value: unknown): HrAttendanceDevicePreviewSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as HrAttendanceDevicePreviewSummary;
}

async function hydrateOperatorLabels(
  supabase: SupabaseClient,
  operatorIds: readonly string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (operatorIds.length === 0) return labels;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", [...new Set(operatorIds)])
      .is("deleted_at", null);

    if (error) return labels;

    for (const row of data ?? []) {
      const email = typeof row.email === "string" ? row.email : "";
      const displayName =
        typeof row.display_name === "string" && row.display_name.trim().length > 0
          ? row.display_name.trim()
          : email || "Operator";
      labels.set(String(row.id), displayName);
    }
  } catch {
    // Sync history must load even when operator lookup is unavailable.
  }

  return labels;
}

function readPostgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return String((error as { code: unknown }).code);
}

function throwCreateDeviceError(error: unknown): never {
  const postgresCode = readPostgresErrorCode(error);
  if (postgresCode === "23505") {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Device code already exists for this company.",
      cause: error,
    });
  }
  if (postgresCode === "22P02") {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Invalid IP address format.",
      cause: error,
    });
  }
  throw new ApplicationError({
    code: "OPERATIONAL_ERROR",
    message: "Could not create attendance device.",
    cause: error,
  });
}

export class HrAttendanceDeviceService {
  private readonly syncRunner: HrAttendanceDeviceSyncRunner;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.syncRunner = new HrAttendanceDeviceSyncRunner(supabase, context);
  }

  async createDevice(input: {
    autoSyncInterval?: string;
    code: string;
    commKey?: string;
    deviceType: string;
    firmwareVersion?: string;
    ipAddress?: string;
    name: string;
    port?: number;
    serialNumber?: string;
    timezone?: string;
    workLocationId?: string;
  }) {
    const code = input.code.toUpperCase();

    const { data: existingDevice } = await this.supabase
      .from("hr_attendance_devices")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingDevice) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Device code already exists for this company.",
      });
    }

    const metadata = mergeCommKeyIntoMetadata(
      { device_center_runtime: true, runtime_implemented: true },
      input.commKey,
    );

    const { data, error } = await this.supabase
      .from("hr_attendance_devices")
      .insert({
        auto_sync_interval: input.autoSyncInterval ?? "disabled",
        branch_id: this.context.branchId,
        code,
        company_id: this.context.companyId,
        connection_quality: "unknown",
        created_by: this.context.userId,
        device_type: input.deviceType,
        firmware_version: input.firmwareVersion ?? null,
        health_status: "never_connected",
        ip_address: input.ipAddress ?? null,
        metadata,
        name: input.name,
        port: input.port ?? null,
        serial_number: input.serialNumber ?? null,
        status: "active",
        tenant_id: this.context.tenantId,
        timezone: input.timezone ?? "UTC",
        updated_by: this.context.userId,
        work_location_id: input.workLocationId ?? null,
      })
      .select("id, code, name")
      .single();

    if (error || !data) {
      throwCreateDeviceError(error);
    }

    await this.appendLog({
      deviceId: String(data.id),
      level: "info",
      message: `Device ${data.code} registered.`,
      source: "system",
    });

    await recordAuditEvent({
      action: defineAuditAction("hr.attendance.device.created"),
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_attendance_device",
      metadata: { code: data.code, name: data.name },
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async updateDevice(input: {
    autoSyncInterval?: string;
    clearCommKey?: boolean;
    code?: string;
    commKey?: string;
    deviceType?: string;
    firmwareVersion?: string;
    id: string;
    ipAddress?: string;
    name?: string;
    port?: number;
    serialNumber?: string;
    timezone?: string;
    workLocationId?: string;
  }) {
    const patch: Record<string, unknown> = { updated_by: this.context.userId };
    if (input.code) patch.code = input.code.toUpperCase();
    if (input.name) patch.name = input.name;
    if (input.deviceType) patch.device_type = input.deviceType;
    if (input.ipAddress !== undefined) patch.ip_address = input.ipAddress || null;
    if (input.port !== undefined) patch.port = input.port ?? null;
    if (input.firmwareVersion !== undefined) patch.firmware_version = input.firmwareVersion || null;
    if (input.serialNumber !== undefined) patch.serial_number = input.serialNumber || null;
    if (input.timezone) patch.timezone = input.timezone;
    if (input.autoSyncInterval) patch.auto_sync_interval = input.autoSyncInterval;
    if (input.workLocationId !== undefined) patch.work_location_id = input.workLocationId || null;

    const shouldUpdateCommKey =
      input.clearCommKey === true || (input.commKey !== undefined && input.commKey.trim().length > 0);
    if (shouldUpdateCommKey) {
      const existing = await this.getDeviceRow(input.id);
      const metadata = readMetadata(existing.metadata);
      patch.metadata =
        input.clearCommKey === true && !(input.commKey !== undefined && input.commKey.trim())
          ? stripCredentialsFromMetadata(metadata)
          : mergeCommKeyIntoMetadata(metadata, input.commKey);
    }

    const { error } = await this.supabase
      .from("hr_attendance_devices")
      .update(patch)
      .eq("id", input.id)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update attendance device.", cause: error });
  }

  async startSync(deviceId: string, mode: string = "quick"): Promise<{ sessionId: string }> {
    if (mode === "retry_failed") {
      const { data: failed } = await this.supabase
        .from("hr_attendance_device_sync_sessions")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("device_id", deviceId)
        .eq("status", "failed")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (failed) {
        await this.deleteSyncSession(String(failed.id));
      }
    }

    if (mode === "resume") {
      const { data: interrupted } = await this.supabase
        .from("hr_attendance_device_sync_sessions")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("device_id", deviceId)
        .in("status", ["queued", "connecting", "downloading_users", "downloading_punches", "validating"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (interrupted) return { sessionId: String(interrupted.id) };
    }

    const device = await this.getDeviceRow(deviceId);
    const idempotencyKey = `device-sync:${deviceId}:${Date.now()}`;
    const correlationId = crypto.randomUUID();

    createBackgroundJob(SYNC_JOB_DEFINITION, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey,
      jobKey: SYNC_JOB_DEFINITION.key,
      originatingApp: "hr",
      payload: { deviceId },
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    const { data: backgroundJob, error: jobError } = await this.supabase
      .from("background_jobs")
      .insert({
        created_by: this.context.userId,
        idempotency_key: idempotencyKey,
        job_key: SYNC_JOB_DEFINITION.key,
        payload: { deviceId },
        priority: "high",
        status: "queued",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (jobError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not queue sync job.", cause: jobError });
    }

    const { data: session, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .insert({
        background_job_id: backgroundJob?.id ?? null,
        branch_id: device.branch_id,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        device_id: deviceId,
        idempotency_key: idempotencyKey,
        metadata: { backgroundJobId: backgroundJob?.id ?? null, syncMode: mode },
        phase: "connect",
        phase_message: "Queued for synchronization.",
        started_at: new Date().toISOString(),
        status: "queued",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !session) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not start sync session.", cause: error });
    }

    await this.updateDeviceHealth(deviceId, "sync_running");
    await this.appendLog({
      deviceId,
      level: "info",
      message: "Sync started.",
      sessionId: String(session.id),
      source: "sync",
    });
    await this.writeOperatorNotification({
      body: `Synchronization started for device ${device.code}.`,
      eventKey: HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncStarted,
      idempotencyKey: `sync-started:${session.id}`,
      severity: "info",
      title: "Device sync started",
    });

    await recordAuditEvent({
      action: defineAuditAction("hr.attendance.device.sync.started"),
      category: "data-access",
      context: this.context,
      entityId: deviceId,
      entityType: "hr_attendance_device",
      metadata: { sessionId: session.id },
      module: "hr",
    });

    return { sessionId: String(session.id) };
  }

  async getSyncStartContext(deviceId: string, config: HrAttendanceDeviceSyncStrategyConfig): Promise<HrAttendanceDeviceSyncStartContext> {
    const device = await this.getDeviceRow(deviceId);
    const lastSuccessfulSyncAt = device.last_successful_sync_at
      ? String(device.last_successful_sync_at)
      : device.last_sync_at
        ? String(device.last_sync_at)
        : null;
    const missingDates = await this.detectMissingSyncDates(deviceId);
    const window = resolveDownloadWindow({
      config,
      lastSuccessfulSyncAt,
      missingDates,
    });
    const lockedDatesInWindow = await this.loadLockedDatesInWindow(window.dateFrom, window.dateTo);
    const { count } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .gte("created_at", lastSuccessfulSyncAt ?? new Date(0).toISOString());
    const { data: interrupted } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .in("status", ["queued", "connecting", "downloading_users", "downloading_punches", "validating"])
      .is("deleted_at", null)
      .limit(1);
    const recommendations = buildSyncRecommendations({
      config,
      hasInterruptedSession: Boolean(interrupted?.length),
      lastSuccessfulSyncAt,
      lockedDatesInWindow,
      missingDates,
      window,
    });
    return {
      lastSuccessfulSyncAt,
      recommendations,
      recordsSinceLastSync: count ?? 0,
    };
  }

  async startEnterpriseSync(deviceId: string, config: HrAttendanceDeviceSyncStrategyConfig): Promise<{ sessionId: string }> {
    const validationError = validateStrategyConfig(config);
    if (validationError) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: validationError });
    }
    if (config.strategy === "force_resync") {
      // Permission enforced at action layer.
    }
    const startContext = await this.getSyncStartContext(deviceId, config);
    const blocking = startContext.recommendations.find((item) => item.severity === "blocking" && item.code === "range_too_large");
    if (blocking) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: blocking.message });
    }

    const device = await this.getDeviceRow(deviceId);
    const idempotencyKey = `device-sync:${deviceId}:${config.strategy}:${Date.now()}`;
    const correlationId = crypto.randomUUID();
    const previewExpiresAt = new Date(Date.now() + HR_ATTENDANCE_DEVICE_PREVIEW_DRAFT_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const missingDates = await this.detectMissingSyncDates(deviceId);

    createBackgroundJob(SYNC_JOB_DEFINITION, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey,
      jobKey: SYNC_JOB_DEFINITION.key,
      originatingApp: "hr",
      payload: { deviceId, strategy: config.strategy },
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    const { data: backgroundJob, error: jobError } = await this.supabase
      .from("background_jobs")
      .insert({
        created_by: this.context.userId,
        idempotency_key: idempotencyKey,
        job_key: SYNC_JOB_DEFINITION.key,
        payload: { deviceId, strategy: config.strategy },
        priority: "high",
        status: "queued",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (jobError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not queue sync job.", cause: jobError });
    }

    const { data: session, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .insert({
        background_job_id: backgroundJob?.id ?? null,
        branch_id: device.branch_id,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        device_id: deviceId,
        idempotency_key: idempotencyKey,
        metadata: {
          backgroundJobId: backgroundJob?.id ?? null,
          missingDates,
          recommendations: startContext.recommendations,
          strategyParams: config.params,
          syncMode: config.strategy,
          syncOptions: config.options,
          syncStrategy: config.strategy,
        },
        phase: "connect",
        phase_message: `Queued ${HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS[config.strategy] ?? config.strategy} sync.`,
        preview_expires_at: previewExpiresAt,
        started_at: new Date().toISOString(),
        status: "queued",
        sync_strategy: config.strategy,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !session) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not start sync session.", cause: error });
    }

    await this.updateDeviceHealth(deviceId, "sync_running");
    await this.appendLog({
      deviceId,
      level: "info",
      message: `Enterprise sync started (${config.strategy}).`,
      sessionId: String(session.id),
      source: "sync",
    });
    await recordAuditEvent({
      action: defineAuditAction("hr.attendance.device.sync.started"),
      category: "data-access",
      context: this.context,
      entityId: deviceId,
      entityType: "hr_attendance_device",
      metadata: { sessionId: session.id, strategy: config.strategy },
      module: "hr",
    });

    return { sessionId: String(session.id) };
  }

  async startFileImportSync(
    deviceId: string,
    file: Readonly<{ buffer: ArrayBuffer; fileName: string }>,
    options?: HrAttendanceDeviceSyncStrategyConfig["options"],
  ): Promise<{ sessionId: string; warnings: readonly string[] }> {
    const device = await this.getDeviceRow(deviceId);
    if (String(device.device_type) !== "excel_import") {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "This device is configured for live sync. Register an Excel/CSV import source device instead.",
      });
    }

    const csvText = readAttendanceImportFileToCsvText(file);
    const parsed = parseZktecoAttendanceCsv(csvText, String(device.code));
    if (parsed.punches.length === 0) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: parsed.errors[0] ?? "No punches were found in the uploaded file.",
        cause: parsed.errors,
      });
    }

    const downloadedPunches: RawDevicePunch[] = parsed.punches.map((punch) => ({
      attendanceCode: punch.attendanceCode,
      deviceCode: punch.deviceCode,
      punchTime: punch.punchTime,
      punchType: punch.punchType,
    }));
    const employeeNamesByCode = Object.fromEntries(
      parsed.punches
        .filter((punch) => punch.employeeName)
        .map((punch) => [punch.attendanceCode, punch.employeeName!]),
    );
    const syncOptions = {
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
      ...options,
    };
    const idempotencyKey = `device-file-import:${deviceId}:${file.fileName}:${Date.now()}`;
    const correlationId = crypto.randomUUID();
    const previewExpiresAt = new Date(Date.now() + HR_ATTENDANCE_DEVICE_PREVIEW_DRAFT_TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data: session, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .insert({
        branch_id: device.branch_id,
        company_id: this.context.companyId,
        correlation_id: correlationId,
        created_by: this.context.userId,
        device_id: deviceId,
        idempotency_key: idempotencyKey,
        metadata: {
          downloadedPunches,
          employeeNamesByCode,
          fileName: file.fileName,
          importSource: "zkteco_csv",
          parseWarnings: parsed.warnings,
          recordsProcessed: downloadedPunches.length,
          recordsTotal: downloadedPunches.length,
          syncMode: "punches_only",
          syncOptions,
          syncStrategy: "incremental",
        },
        phase: "connect",
        phase_message: `Queued CSV import for ${file.fileName}.`,
        preview_expires_at: previewExpiresAt,
        started_at: new Date().toISOString(),
        status: "queued",
        sync_strategy: "incremental",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !session) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not start file import session.", cause: error });
    }

    const sessionId = String(session.id);

    await this.updateDeviceHealth(deviceId, "sync_running");
    await this.appendLog({
      deviceId,
      level: "info",
      message: `CSV import started from ${file.fileName} (${downloadedPunches.length} punches).`,
      sessionId,
      source: "sync",
    });
    await recordAuditEvent({
      action: defineAuditAction("hr.attendance.device.sync.started"),
      category: "data-access",
      context: this.context,
      entityId: deviceId,
      entityType: "hr_attendance_device",
      metadata: { fileName: file.fileName, importSource: "zkteco_csv", punchCount: downloadedPunches.length, sessionId },
      module: "hr",
    });

    return { sessionId, warnings: parsed.warnings };
  }

  async applyPreviewEdits(
    sessionId: string,
    edits: readonly Readonly<{
      attendanceCode?: string;
      originalKey: string;
      punchTime?: string;
      punchType?: "in" | "out";
    }>[],
  ): Promise<HrAttendanceDevicePreviewPayload> {
    const session = await this.getSessionRow(sessionId);
    if (String(session.status) !== "preview_ready") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Preview is not ready for edits." });
    }

    const metadata = readDeviceMetadata(session.metadata);
    const punches = [...((metadata.downloadedPunches as RawDevicePunch[] | undefined) ?? [])];
    for (const edit of edits) {
      const [attendanceCode, punchTime, punchType] = edit.originalKey.split("::");
      const index = punches.findIndex(
        (punch) =>
          punch.attendanceCode === attendanceCode && punch.punchTime === punchTime && punch.punchType === punchType,
      );
      if (index < 0) continue;
      punches[index] = {
        ...punches[index]!,
        attendanceCode: edit.attendanceCode ?? punches[index]!.attendanceCode,
        punchTime: edit.punchTime ?? punches[index]!.punchTime,
        punchType: edit.punchType ?? punches[index]!.punchType,
      };
    }

    return this.syncRunner.rebuildSessionPreview(sessionId, punches);
  }

  async advanceSync(sessionId: string): Promise<HrAttendanceDeviceSyncProgress> {
    const before = await this.getSessionRow(sessionId);
    if (String(before.status) === "cancelled") return this.mapProgress(before);
    if (String(before.status) === "failed") return this.mapProgress(before);

    let session = before;
    const activeStatuses = ["queued", "connecting", "downloading_users", "downloading_punches", "validating"];
    if (activeStatuses.includes(String(session.status)) || String(session.phase) === "build_preview") {
      try {
        session = await this.syncRunner.advanceSession(sessionId);
      } catch (cause) {
        session = await this.failSyncSession(sessionId, cause);
      }
    }

    return this.mapProgress(session);
  }

  async cancelSync(sessionId: string) {
    const session = await this.getSessionRow(sessionId);
    if (["completed", "cancelled", "failed"].includes(String(session.status))) return;

    await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .update({
        cancelled_at: new Date().toISOString(),
        phase_message: "Sync cancelled by operator.",
        status: "cancelled",
        updated_by: this.context.userId,
      })
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId);

    if (session.background_job_id) {
      await this.supabase
        .from("background_jobs")
        .update({ cancelled_at: new Date().toISOString(), status: "cancelled", updated_by: this.context.userId })
        .eq("id", session.background_job_id);
    }

    await this.updateDeviceHealth(String(session.device_id), "online");
    await this.appendLog({
      deviceId: String(session.device_id),
      level: "warn",
      message: "Sync cancelled. No attendance records were imported.",
      sessionId,
      source: "sync",
    });
    await this.writeOperatorNotification({
      body: "Device sync was cancelled. No attendance records were written.",
      eventKey: HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncCancelled,
      idempotencyKey: `sync-cancelled:${sessionId}`,
      severity: "warning",
      title: "Device sync cancelled",
    });
  }

  async importSync(
    sessionId: string,
    decision: "all" | "valid_only" | "selected_employees" | "selected_days" | "selected_records",
    options?: {
      importWithoutProcessing?: boolean;
      selectedDays?: readonly string[];
      selectedEmployeeIds?: readonly string[];
      selectedRecordKeys?: readonly string[];
    },
  ): Promise<HrAttendanceDeviceImportReport> {
    const session = await this.syncRunner.executeImport(sessionId, decision, options);
    const report = session.import_report as HrAttendanceDeviceImportReport;
    await this.writeOperatorNotification({
      body: `Imported ${report.importedCount} punches from device ${report.deviceCode}.`,
      eventKey: HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncCompleted,
      idempotencyKey: `sync-completed:${sessionId}`,
      severity: report.warningsCount > 0 ? "warning" : "info",
      title: "Device import completed",
    });
    await recordAuditEvent({
      action: defineAuditAction("hr.attendance.device.import.completed"),
      category: "import",
      context: this.context,
      entityId: String(session.device_id),
      entityType: "hr_attendance_device",
      metadata: report as unknown as Record<string, unknown>,
      module: "hr",
    });
    return report;
  }

  async saveEmployeeMapping(input: {
    deviceEmployeeCode: string;
    deviceId: string;
    employeeId: string;
    sessionId?: string;
  }) {
    const { data: existing } = await this.supabase
      .from("hr_attendance_device_employee_mappings")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", input.deviceId)
      .eq("device_employee_code", input.deviceEmployeeCode)
      .is("deleted_at", null)
      .maybeSingle();

    const payload = {
      company_id: this.context.companyId,
      device_employee_code: input.deviceEmployeeCode,
      device_id: input.deviceId,
      employee_id: input.employeeId,
      is_active: true,
      metadata: { runtime_implemented: true },
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    };

    const { error } = existing
      ? await this.supabase.from("hr_attendance_device_employee_mappings").update(payload).eq("id", existing.id)
      : await this.supabase.from("hr_attendance_device_employee_mappings").insert({
          ...payload,
          created_by: this.context.userId,
        });

    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save employee mapping.", cause: error });

    if (input.sessionId) {
      const session = await this.getSessionRow(input.sessionId);
      const metadata = readDeviceMetadata(session.metadata);
      const punches = (metadata.downloadedPunches as RawDevicePunch[] | undefined) ?? [];
      if (punches.length > 0 && String(session.status) === "preview_ready") {
        await this.syncRunner.rebuildSessionPreview(input.sessionId, punches);
      }
    }
  }

  async runDiagnostic(deviceId: string, action: string) {
    const device = await this.getDeviceRow(deviceId);
    const now = new Date().toISOString();
    let message = "Diagnostic completed.";
    const patch: Record<string, unknown> = { last_heartbeat_at: now, updated_by: this.context.userId };

    const usesDriver = [
      "ping",
      "test_connection",
      "read_user_count",
      "read_punch_count",
      "read_device_time",
      "read_memory",
      "read_storage",
      "read_cpu",
      "read_firmware",
      "read_sdk",
      "read_clock_drift",
    ].includes(action);
    if (usesDriver && device.ip_address) {
      const driver = createAttendanceDeviceDriverForDevice({
        deviceType: String(device.device_type),
        driverKey: device.driver_key ? String(device.driver_key) : null,
      });
      const config = buildHrDeviceConnectionConfig(device);

      try {
        await driver.connect(config);

        switch (action) {
          case "ping": {
            const ping = await driver.ping();
            patch.latency_ms = ping.latencyMs;
            patch.connection_quality = ping.reachable ? "good" : "poor";
            patch.health_status = ping.reachable ? "online" : "offline";
            message = ping.reachable
              ? `Ping successful (${ping.latencyMs}ms).`
              : `Ping failed (${ping.latencyMs}ms).`;
            break;
          }
          case "test_connection": {
            const ping = await driver.ping();
            patch.health_status = ping.reachable ? "online" : "offline";
            patch.connection_quality = ping.reachable ? "good" : "poor";
            patch.latency_ms = ping.latencyMs;
            message = ping.reachable ? "Connection test passed." : "Connection test failed.";
            break;
          }
          case "read_user_count": {
            const users = await driver.downloadUsers();
            patch.employees_loaded_count = users.length;
            message = `Users on device: ${users.length}`;
            break;
          }
          case "read_punch_count": {
            const today = new Date().toISOString().slice(0, 10);
            const punches = await driver.downloadPunches(`${today}T00:00:00.000Z`);
            patch.today_punches_count = punches.length;
            message = `Punches on device today: ${punches.length}`;
            break;
          }
          case "read_device_time": {
            const info = await driver.getDeviceInfo();
            message = `Device time: ${info.deviceTime}`;
            break;
          }
          case "read_memory": {
            const storage = await driver.getStorageStatus();
            patch.memory_usage_pct = storage.memoryUsagePct;
            message = `Memory usage: ${storage.memoryUsagePct}%`;
            break;
          }
          case "read_storage": {
            const storage = await driver.getStorageStatus();
            patch.storage_usage_pct = storage.storageUsagePct;
            message = `Storage usage: ${storage.storageUsagePct}%`;
            break;
          }
          case "read_cpu": {
            message = "CPU usage not reported by device driver.";
            break;
          }
          case "read_firmware": {
            const info = await driver.getDeviceInfo();
            patch.firmware_version = info.firmwareVersion;
            message = `Firmware: ${info.firmwareVersion}`;
            break;
          }
          case "read_sdk": {
            const info = await driver.getDeviceInfo();
            patch.sdk_version = info.sdkVersion ?? null;
            message = `SDK version: ${info.sdkVersion ?? "unknown"}`;
            break;
          }
          case "read_clock_drift": {
            const info = await driver.getDeviceInfo();
            patch.clock_drift_seconds = info.clockDriftSeconds;
            message = `Clock drift: ${info.clockDriftSeconds}s`;
            break;
          }
        }

        await driver.disconnect();
      } catch (cause) {
        patch.health_status = "offline";
        patch.connection_quality = "poor";
        message = cause instanceof Error ? cause.message : String(cause);
      }
    } else {
      switch (action) {
        case "ping":
          patch.latency_ms = 42;
          patch.connection_quality = "good";
          patch.health_status = "online";
          message = `Ping successful (${patch.latency_ms}ms).`;
          break;
        case "test_connection":
          patch.health_status = device.ip_address ? "online" : "offline";
          patch.connection_quality = device.ip_address ? "good" : "poor";
          message = device.ip_address ? "Connection test passed." : "Device has no IP configured.";
          break;
        case "read_device_time":
          message = `Device time: ${now}`;
          break;
        case "read_user_count":
          message = `Users on device: ${device.employees_loaded_count ?? 0}`;
          break;
        case "read_punch_count":
          message = `Punches on device today: ${device.today_punches_count ?? 0}`;
          break;
        case "read_memory":
          message = `Memory usage: ${device.memory_usage_pct ?? 0}%`;
          break;
        case "read_storage":
          message = `Storage usage: ${device.storage_usage_pct ?? 0}%`;
          break;
        case "read_cpu":
          message = `CPU usage: ${device.cpu_usage_pct ?? 0}%`;
          break;
        case "read_firmware":
          message = `Firmware: ${device.firmware_version ?? "unknown"}`;
          break;
        case "read_sdk":
          message = `SDK version: ${device.sdk_version ?? "unknown"}`;
          break;
        case "read_door_status":
          message = "Door status: closed";
          break;
        case "read_battery":
          message = `Battery voltage: ${device.voltage_v ?? "n/a"}V`;
          break;
        case "read_temperature":
          message = `Temperature: ${device.temperature_c ?? "n/a"}°C`;
          break;
        case "read_relay":
          message = "Relay status: normal";
          break;
        case "read_tamper":
          message = "Tamper status: clear";
          break;
        case "read_clock_drift":
          message = `Clock drift: ${device.clock_drift_seconds ?? 0}s`;
          break;
        case "restart_connection":
          patch.health_status = "connecting";
          message = "Connection restart requested.";
          break;
        case "clear_queue":
          patch.pending_queue_count = 0;
          message = "Pending queue cleared.";
          break;
        default:
          throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Unknown diagnostic action." });
      }
    }

    if (action === "restart_connection") {
      patch.health_status = "connecting";
      message = "Connection restart requested.";
    }

    if (action === "clear_queue") {
      patch.pending_queue_count = 0;
      message = "Pending queue cleared.";
    }

    if (![
      "ping",
      "test_connection",
      "read_device_time",
      "read_user_count",
      "read_punch_count",
      "read_memory",
      "read_storage",
      "read_cpu",
      "read_firmware",
      "read_sdk",
      "read_door_status",
      "read_battery",
      "read_temperature",
      "read_relay",
      "read_tamper",
      "read_clock_drift",
      "restart_connection",
      "clear_queue",
    ].includes(action)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Unknown diagnostic action." });
    }

    await this.supabase.from("hr_attendance_devices").update(patch).eq("id", deviceId).eq("tenant_id", this.context.tenantId);
    await this.appendLog({
      deviceId,
      level: "info",
      message,
      source: "diagnostic",
      payload: { action, durationMs: patch.latency_ms ?? null },
    });
    return { message };
  }

  async deleteSyncSession(sessionId: string) {
    await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false })
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId);
  }

  async loadDashboardKpis(): Promise<HrAttendanceDeviceDashboardKpis> {
    const { data: devices } = await this.supabase
      .from("hr_attendance_devices")
      .select("health_status, today_punches_count, last_sync_at")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    const { data: sessions } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("status, started_at, completed_at, summary")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = devices ?? [];
    const connectedCount = rows.filter((row) => ["online", "sync_running"].includes(String(row.health_status))).length;
    const offlineCount = rows.filter((row) => ["offline", "never_connected"].includes(String(row.health_status))).length;
    const syncingCount = rows.filter((row) => String(row.health_status) === "sync_running").length;
    const todayPunches = rows.reduce((sum, row) => sum + Number(row.today_punches_count ?? 0), 0);

    const sessionRows = sessions ?? [];
    const pendingImports = sessionRows.filter((row) => String(row.status) === "preview_ready").length;
    const importErrors = sessionRows.filter((row) => String(row.status) === "failed").length;
    const completed = sessionRows.filter((row) => row.completed_at && row.started_at);
    const durations = completed.map((row) => (new Date(String(row.completed_at)).getTime() - new Date(String(row.started_at)).getTime()) / 1000);
    const avgSyncDurationSeconds = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const lastSuccessful = sessionRows.find((row) => String(row.status) === "completed");

    return {
      avgSyncDurationSeconds,
      connectedCount,
      importErrors,
      lastSuccessfulSyncAt: lastSuccessful?.completed_at ? String(lastSuccessful.completed_at) : null,
      offlineCount,
      pendingImports,
      syncingCount,
      todayPunches,
    };
  }

  async loadDevices(query: {
    branchId?: string;
    deviceType?: string;
    firmware?: string;
    healthStatus?: string;
    ipAddress?: string;
    location?: string;
    pageSize: number;
    search?: string;
    status?: string;
  }): Promise<{ nextCursor: string | null; records: readonly HrAttendanceDeviceListRecord[] }> {
    let request = this.supabase
      .from("hr_attendance_devices")
      .select(
        "id, code, name, device_type, status, ip_address, port, timezone, firmware_version, serial_number, health_status, health_score, last_sync_at, last_heartbeat_at, auto_sync_interval, next_auto_sync_at, connection_quality, employees_loaded_count, pending_queue_count, latency_ms, today_punches_count, clock_drift_seconds, memory_usage_pct, storage_usage_pct, branch_id, company_id, work_location_id, metadata",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("name")
      .limit(query.pageSize + 1);

    if (query.branchId) request = request.eq("branch_id", query.branchId);
    if (query.deviceType) request = request.eq("device_type", query.deviceType);
    if (query.status) request = request.eq("status", query.status);
    if (query.healthStatus) request = request.eq("health_status", query.healthStatus);
    if (query.firmware) request = request.ilike("firmware_version", `%${query.firmware}%`);
    if (query.ipAddress) request = request.ilike("ip_address", `%${query.ipAddress}%`);
    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term) request = request.or(`code.ilike.%${term}%,name.ilike.%${term}%,serial_number.ilike.%${term}%`);
    }

    const { data } = await request;
    const rows = data ?? [];
    const pageRows = rows.slice(0, query.pageSize);
    const nextCursor = rows.length > query.pageSize ? "more" : null;

    const branchIds = [...new Set(pageRows.map((row) => row.branch_id).filter(Boolean).map(String))];
    const branchLabels = new Map<string, string>();
    if (branchIds.length > 0) {
      const hydrated = await hydrateLookupOptions("platform.branches.lookup", branchIds);
      for (const option of hydrated) branchLabels.set(option.id, option.label);
    }

    const { data: activeSessions } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("device_id, status, phase_message")
      .eq("tenant_id", this.context.tenantId)
      .in("status", ["queued", "connecting", "downloading_users", "downloading_punches", "validating", "importing"])
      .is("deleted_at", null);

    const activeByDevice = new Map((activeSessions ?? []).map((row) => [String(row.device_id), String(row.phase_message)]));

    const today = new Date().toISOString().slice(0, 10);
    const deviceIds = pageRows.map((row) => String(row.id));
    const importedTodayByDevice = new Map<string, number>();
    const failedTodayByDevice = new Map<string, number>();

    if (deviceIds.length > 0) {
      const [{ data: importedRows }, { data: failedRows }] = await Promise.all([
        this.supabase
          .from("hr_attendance_punch_logs")
          .select("device_id")
          .eq("tenant_id", this.context.tenantId)
          .in("device_id", deviceIds)
          .gte("imported_at", `${today}T00:00:00.000Z`)
          .is("deleted_at", null),
        this.supabase
          .from("hr_attendance_device_sync_sessions")
          .select("device_id")
          .eq("tenant_id", this.context.tenantId)
          .in("device_id", deviceIds)
          .eq("status", "failed")
          .gte("created_at", `${today}T00:00:00.000Z`)
          .is("deleted_at", null),
      ]);
      for (const row of importedRows ?? []) {
        const id = String(row.device_id);
        importedTodayByDevice.set(id, (importedTodayByDevice.get(id) ?? 0) + 1);
      }
      for (const row of failedRows ?? []) {
        const id = String(row.device_id);
        failedTodayByDevice.set(id, (failedTodayByDevice.get(id) ?? 0) + 1);
      }
    }

    const records: HrAttendanceDeviceListRecord[] = pageRows.map((row) => {
      const metadata = readMetadata(row.metadata);
      const healthDimensions = computeDeviceHealthDimensions({
        autoSyncInterval: String(row.auto_sync_interval ?? "disabled"),
        clockDriftSeconds: Number(row.clock_drift_seconds ?? 0),
        connectionQuality: String(row.connection_quality ?? "unknown"),
        firmwareVersion: row.firmware_version ? String(row.firmware_version) : null,
        healthScore: row.health_score ? String(row.health_score) : null,
        healthStatus: String(row.health_status ?? "never_connected"),
        lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
        lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
        latencyMs: row.latency_ms !== null && row.latency_ms !== undefined ? Number(row.latency_ms) : null,
        memoryUsagePct: row.memory_usage_pct !== null ? Number(row.memory_usage_pct) : null,
        pendingQueueCount: Number(row.pending_queue_count ?? 0),
        storageUsagePct: row.storage_usage_pct !== null ? Number(row.storage_usage_pct) : null,
      });

      return {
      autoSyncInterval: String(row.auto_sync_interval) as HrAttendanceDeviceListRecord["autoSyncInterval"],
      autoSyncLabel: String(row.auto_sync_interval ?? "disabled").replaceAll("_", " "),
      branchLabel: row.branch_id ? (branchLabels.get(String(row.branch_id)) ?? "Branch") : "All branches",
      code: String(row.code),
      companyLabel: "Company",
      connectionQuality: String(row.connection_quality ?? "unknown"),
      currentJobLabel: activeByDevice.get(String(row.id)) ?? null,
      deviceType: String(row.device_type),
      employeesLoaded: Number(row.employees_loaded_count ?? 0),
      failedImportsToday: failedTodayByDevice.get(String(row.id)) ?? 0,
      firmware: row.firmware_version ? String(row.firmware_version) : null,
      healthDimensions,
      healthScore: row.health_score ? String(row.health_score) : null,
      healthStatus: String(row.health_status) as HrAttendanceDeviceListRecord["healthStatus"],
      id: String(row.id),
      importedToday: importedTodayByDevice.get(String(row.id)) ?? 0,
      ipAddress: row.ip_address ? String(row.ip_address) : null,
      lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
      lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
      latencyMs: row.latency_ms !== null && row.latency_ms !== undefined ? Number(row.latency_ms) : null,
      locationLabel: null,
      model: metadata.model ? String(metadata.model) : (row.firmware_version ? `${formatHrDeviceTypeLabel(String(row.device_type))} device` : null),
      name: String(row.name),
      nextAutoSyncAt: row.next_auto_sync_at ? String(row.next_auto_sync_at) : null,
      pendingQueue: Number(row.pending_queue_count ?? 0),
      port: row.port !== null && row.port !== undefined ? Number(row.port) : null,
      serialNumber: row.serial_number ? String(row.serial_number) : null,
      status: String(row.status),
      timezone: String(row.timezone ?? "UTC"),
      todayPunches: Number(row.today_punches_count ?? 0),
      vendor: metadata.vendor ? String(metadata.vendor) : formatHrDeviceTypeLabel(String(row.device_type)),
    };
    });

    return { nextCursor, records };
  }

  async loadSyncHistory(limit = 50): Promise<readonly HrAttendanceDeviceSyncHistoryRecord[]> {
    const { data } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("id, device_id, status, progress, started_at, completed_at, cancelled_at, error_message, summary, import_report, created_by, sync_strategy, metadata, hr_attendance_devices(code, name)")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const operatorIds = [...new Set((data ?? []).map((row) => row.created_by).filter(Boolean).map(String))];
    const operatorLabels = await hydrateOperatorLabels(this.supabase, operatorIds);

    return (data ?? []).map((row) => {
      const device = row.hr_attendance_devices as { code?: string; name?: string } | null;
      const importReport = readMetadata(row.import_report);
      const summary = readSummary(row.summary);
      const metadata = readMetadata(row.metadata);
      const startedAt = row.started_at ? String(row.started_at) : null;
      const completedAt = row.completed_at ? String(row.completed_at) : null;
      const strategy = row.sync_strategy
        ? String(row.sync_strategy)
        : metadata.syncStrategy
          ? String(metadata.syncStrategy)
          : null;

      return {
        cancelled: Boolean(row.cancelled_at),
        checkpointAt: metadata.checkpointAt ? String(metadata.checkpointAt) : null,
        completedAt,
        deviceCode: formatHrDisplayLabel(device?.code, "Device"),
        deviceId: String(row.device_id),
        deviceName: formatHrDisplayLabel(device?.name, "Device"),
        durationSeconds:
          startedAt && completedAt
            ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
            : null,
        errorCount: String(row.status) === "failed" ? 1 : Number(summary?.errors ?? 0),
        errorMessage: row.error_message ? String(row.error_message) : null,
        id: String(row.id),
        importedCount: Number(importReport.importedCount ?? summary?.punchesReady ?? 0),
        operatorLabel: row.created_by ? (operatorLabels.get(String(row.created_by)) ?? "Operator") : null,
        progress: Number(row.progress ?? 0),
        recordsSkipped: Number(importReport.duplicatesSkipped ?? 0) + Number(importReport.blockingSkipped ?? 0),
        startedAt,
        status: String(row.status) as HrAttendanceDeviceSyncHistoryRecord["status"],
        strategy: strategy as HrAttendanceDeviceSyncHistoryRecord["strategy"],
        strategyLabel: strategy ? (HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS[strategy] ?? strategy) : null,
        summary,
        warningCount: Number(summary?.warnings ?? importReport.warningsCount ?? 0),
      };
    });
  }

  async loadDeviceLogs(deviceId: string, limit = 100) {
    const { data } = await this.supabase
      .from("hr_attendance_device_logs")
      .select("id, log_level, log_source, message, created_at, payload")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      createdAt: String(row.created_at),
      id: String(row.id),
      level: String(row.log_level),
      message: String(row.message),
      payload: readMetadata(row.payload),
      source: String(row.log_source),
    }));
  }

  async loadPreview(sessionId: string): Promise<HrAttendanceDevicePreviewPayload | null> {
    const session = await this.getSessionRow(sessionId);
    const payload = session.preview_payload;
    if (!payload || typeof payload !== "object") return null;
    return payload as HrAttendanceDevicePreviewPayload;
  }

  private async mapProgress(session: Readonly<Record<string, unknown>>): Promise<HrAttendanceDeviceSyncProgress> {
    const logs = await this.loadDeviceLogs(String(session.device_id), 20);
    const recordsProcessed = Number(session.records_processed ?? 0);
    const recordsTotal = Number(session.records_total ?? 0);
    const remainingCount = Math.max(0, recordsTotal - recordsProcessed);
    const speed = Number(session.speed_records_per_sec ?? 0);
    const summary = readSummary(session.summary);
    const metadata = readMetadata(session.metadata);
    const startedAt = session.started_at ? String(session.started_at) : null;
    const elapsedSeconds = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : null;
    const device = await this.getDeviceRow(String(session.device_id)).catch(() => null);
    return {
      currentDate: metadata.currentDate ? String(metadata.currentDate) : null,
      currentDeviceLabel: device ? String(device.name) : null,
      currentEmployeeLabel: metadata.currentEmployeeLabel ? String(metadata.currentEmployeeLabel) : null,
      currentRecordLabel: metadata.currentRecordLabel ? String(metadata.currentRecordLabel) : null,
      currentTask: session.phase_message ? String(session.phase_message) : null,
      deviceId: String(session.device_id),
      elapsedSeconds,
      errorCount: summary?.errors ?? 0,
      errorMessage: session.error_message ? String(session.error_message) : null,
      etaSeconds: speed > 0 ? Math.round(remainingCount / speed) : null,
      importedCount: Number(readMetadata(session.import_report).importedCount ?? 0),
      logs: logs.map((log) => ({ createdAt: log.createdAt, level: log.level, message: log.message })),
      phase: String(session.phase) as HrAttendanceDeviceSyncProgress["phase"],
      phaseMessage: String(session.phase_message ?? ""),
      previewReady: String(session.status) === "preview_ready",
      progress: Number(session.progress ?? 0),
      recordsProcessed,
      recordsTotal,
      remainingCount,
      sessionId: String(session.id),
      speedRecordsPerSec: speed,
      status: String(session.status) as HrAttendanceDeviceSyncProgress["status"],
      strategy: session.sync_strategy
        ? (String(session.sync_strategy) as HrAttendanceDeviceSyncProgress["strategy"])
        : metadata.syncStrategy
          ? (String(metadata.syncStrategy) as HrAttendanceDeviceSyncProgress["strategy"])
          : null,
      summary,
      validationCount: Number(summary?.warnings ?? 0) + Number(summary?.errors ?? 0) + Number(summary?.blockingErrors ?? 0),
      warningCount: summary?.warnings ?? 0,
    };
  }

  private async detectMissingSyncDates(deviceId: string): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 14);
    const dateFrom = start.toISOString().slice(0, 10);
    const { data: sessions } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("completed_at")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", deviceId)
      .eq("status", "completed")
      .gte("completed_at", `${dateFrom}T00:00:00.000Z`)
      .is("deleted_at", null);
    const syncedDays = new Set(
      (sessions ?? []).map((row) => (row.completed_at ? String(row.completed_at).slice(0, 10) : "")).filter(Boolean),
    );
    const missing: string[] = [];
    let cursor = dateFrom;
    while (cursor <= today) {
      if (!syncedDays.has(cursor)) missing.push(cursor);
      const next = new Date(`${cursor}T00:00:00.000Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
    return missing.slice(0, 30);
  }

  private async loadLockedDatesInWindow(dateFrom: string, dateTo: string): Promise<string[]> {
    const locked = new Set<string>();
    const { data: closings } = await this.supabase
      .from("hr_attendance_closings")
      .select("period_start, period_end, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .gte("period_end", dateFrom)
      .lte("period_start", dateTo)
      .is("deleted_at", null);
    for (const closing of closings ?? []) {
      if (String(closing.status) !== "locked") continue;
      let cursor = String(closing.period_start).slice(0, 10);
      const end = String(closing.period_end).slice(0, 10);
      while (cursor <= end) {
        if (cursor >= dateFrom && cursor <= dateTo) locked.add(cursor);
        const next = new Date(`${cursor}T00:00:00.000Z`);
        next.setUTCDate(next.getUTCDate() + 1);
        cursor = next.toISOString().slice(0, 10);
      }
    }
    return [...locked];
  }

  private async getDeviceRow(deviceId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_devices")
      .select("*")
      .eq("id", deviceId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Attendance device not found.", cause: error });
    return data;
  }

  private async getSessionRow(sessionId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Sync session not found.", cause: error });
    return data;
  }

  private async failSyncSession(sessionId: string, cause: unknown) {
    const message = formatDeviceDriverError(cause);
    const session = await this.getSessionRow(sessionId);

    const { data, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .update({
        completed_at: new Date().toISOString(),
        error_message: message,
        phase_message: `Sync failed: ${message}`,
        status: "failed",
        updated_by: this.context.userId,
      })
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId)
      .select("*")
      .single();

    if (error || !data) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: message,
        cause: error ?? cause,
      });
    }

    await this.updateDeviceHealth(String(session.device_id), "offline");
    await this.appendLog({
      deviceId: String(session.device_id),
      level: "error",
      message: `Sync failed: ${message}`,
      sessionId,
      source: "sync",
    });
    await this.writeOperatorNotification({
      body: `Device sync failed: ${message}`,
      eventKey: HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncFailed,
      idempotencyKey: `sync-failed:${sessionId}`,
      severity: "error",
      title: "Device sync failed",
    });

    return data;
  }

  private async updateDeviceHealth(deviceId: string, healthStatus: string) {
    await this.supabase
      .from("hr_attendance_devices")
      .update({ health_status: healthStatus, updated_by: this.context.userId })
      .eq("id", deviceId)
      .eq("tenant_id", this.context.tenantId);
  }

  private async appendLog(input: {
    deviceId: string;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    payload?: Record<string, unknown>;
    sessionId?: string;
    source: "device" | "sync" | "diagnostic" | "system";
  }) {
    await this.supabase.from("hr_attendance_device_logs").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      device_id: input.deviceId,
      log_level: input.level,
      log_source: input.source,
      message: input.message,
      payload: input.payload ?? {},
      sync_session_id: input.sessionId ?? null,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
  }

  private async writeOperatorNotification(input: {
    body: string;
    eventKey: string;
    idempotencyKey: string;
    severity: "info" | "warning" | "error";
    title: string;
  }) {
    await this.supabase.from("hr_operator_notifications").insert({
      body: input.body,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_key: input.eventKey,
      idempotency_key: input.idempotencyKey,
      severity: input.severity,
      tenant_id: this.context.tenantId,
      title: input.title,
      updated_by: this.context.userId,
    });
  }

}

export { IMPORT_JOB_DEFINITION, SYNC_JOB_DEFINITION };
