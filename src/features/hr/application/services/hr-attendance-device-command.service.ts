import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/audit-event";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob, defineJob } from "@/platform/background-jobs/public-api";

import {
  createAttendanceDeviceDriverForDevice,
  resolveDriverKey,
} from "../device-drivers/registry";
import { formatDeviceDriverError } from "../device-drivers/device-driver-error";
import type { HrDeviceConnectionConfig } from "../device-drivers/types";
import {
  HR_DEVICE_SENSITIVE_COMMANDS,
  HR_WORKFORCE_ENTERPRISE_EVENT_KEYS,
  HR_WORKFORCE_ENTERPRISE_JOB_KEYS,
} from "../constants/hr-workforce-enterprise.constants";
import type { HrDeviceCommandKey } from "../types/hr-workforce-enterprise.types";

const COMMAND_JOB = defineJob({
  key: "hr.workforce.device-command",
  maxRetries: 1,
  priority: "high",
  queueKey: "hr-attendance-device",
  retryPolicy: { cancellable: true, delaySeconds: 30, maxAttempts: 2, strategy: "fixed", timeoutSeconds: 600 },
  timeoutSeconds: 600,
});

export class HrAttendanceDeviceDriverResolverService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async resolveForDevice(deviceId: string) {
    const device = await this.getDevice(deviceId);
    const driverKey = resolveDriverKey(String(device.device_type), device.driver_key ? String(device.driver_key) : null);
    const config: HrDeviceConnectionConfig = {
      credentials: readMetadata(device.metadata).credentials as Record<string, unknown> | undefined,
      deviceId: String(device.id),
      deviceType: String(device.device_type),
      driverKey,
      firmwareVersion: device.firmware_version ? String(device.firmware_version) : null,
      ipAddress: device.ip_address ? String(device.ip_address) : null,
      metadata: readMetadata(device.metadata),
      port: device.port !== null && device.port !== undefined ? Number(device.port) : null,
      serialNumber: device.serial_number ? String(device.serial_number) : null,
      timezone: String(device.timezone ?? "UTC"),
    };
    const driver = createAttendanceDeviceDriverForDevice({ deviceType: config.deviceType, driverKey });
    await driver.connect(config);
    return { config, device, driver, driverKey };
  }

  private async getDevice(deviceId: string) {
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
}

export class HrAttendanceDeviceCommandService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
    private readonly driverResolver = new HrAttendanceDeviceDriverResolverService(supabase, context),
  ) {}

  async executeCommand(input: {
    commandKey: HrDeviceCommandKey;
    confirmed?: boolean;
    deviceId: string;
    payload?: Record<string, unknown>;
  }) {
    if (HR_DEVICE_SENSITIVE_COMMANDS.has(input.commandKey) && !input.confirmed) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Command "${input.commandKey}" requires operator confirmation.`,
      });
    }

    const correlationId = crypto.randomUUID();
    const startedAt = Date.now();
    const { data: commandRow, error } = await this.supabase
      .from("hr_attendance_device_commands")
      .insert({
        branch_id: this.context.branchId,
        command_key: input.commandKey,
        company_id: this.context.companyId,
        confirmed_at: input.confirmed ? new Date().toISOString() : null,
        confirmed_by: input.confirmed ? this.context.userId : null,
        correlation_id: correlationId,
        created_by: this.context.userId,
        device_id: input.deviceId,
        payload: input.payload ?? {},
        requires_confirmation: HR_DEVICE_SENSITIVE_COMMANDS.has(input.commandKey),
        started_at: new Date().toISOString(),
        status: "running",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !commandRow) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create device command.", cause: error });
    }

    createBackgroundJob(COMMAND_JOB, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey: `device-command:${commandRow.id}`,
      jobKey: COMMAND_JOB.key,
      originatingApp: "hr",
      payload: { commandId: commandRow.id, commandKey: input.commandKey, deviceId: input.deviceId },
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    let result: Record<string, unknown> = {};
    let executionLog = "";
    let commandError: string | null = null;
    let status: "completed" | "failed" = "completed";

    try {
      const { driver } = await this.driverResolver.resolveForDevice(input.deviceId);
      const commandResult = await this.runDriverCommand(driver, input.commandKey, input.payload);
      result = { ...commandResult, payload: commandResult.payload ?? {} };
      executionLog = commandResult.message;
      if (!commandResult.success) {
        status = "failed";
        commandError = commandResult.message;
      }
      await driver.disconnect();
    } catch (cause) {
      status = "failed";
      commandError = formatDeviceDriverError(cause);
      executionLog = commandError;
    }

    const durationMs = Date.now() - startedAt;
    await this.supabase
      .from("hr_attendance_device_commands")
      .update({
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: commandError,
        execution_log: executionLog,
        result,
        status,
        updated_by: this.context.userId,
      })
      .eq("id", commandRow.id);

    await recordAuditEvent({
      action: defineAuditAction(
        status === "completed"
          ? "hr.workforce.device.command.completed"
          : "hr.workforce.device.command.failed",
      ),
      category: "data-access",
      context: this.context,
      entityId: input.deviceId,
      entityType: "hr_attendance_device",
      metadata: { commandKey: input.commandKey, durationMs },
      module: "hr",
    });

    await this.writeNotification({
      body: executionLog || `Command ${input.commandKey} ${status}.`,
      eventKey: status === "completed"
        ? HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.commandCompleted
        : HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.commandFailed,
      idempotencyKey: `device-command:${commandRow.id}`,
      severity: status === "completed" ? "info" : "error",
      title: `Device command: ${input.commandKey}`,
    });

    if (status === "failed") {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: commandError ?? "Device command failed." });
    }

    return { commandId: String(commandRow.id), correlationId, durationMs, result };
  }

  async loadCommandHistory(deviceId?: string, limit = 50) {
    let request = this.supabase
      .from("hr_attendance_device_commands")
      .select("id, device_id, command_key, status, requires_confirmation, started_at, completed_at, duration_ms, error_message, correlation_id, hr_attendance_devices(code, name)")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (deviceId) request = request.eq("device_id", deviceId);

    const { data } = await request;
    return (data ?? []).map((row) => {
      const device = row.hr_attendance_devices as { code?: string; name?: string } | null;
      return {
        commandKey: String(row.command_key),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        correlationId: String(row.correlation_id),
        deviceCode: device?.code ?? "Device",
        deviceId: String(row.device_id),
        deviceName: device?.name ?? "Device",
        durationMs: row.duration_ms !== null ? Number(row.duration_ms) : null,
        errorMessage: row.error_message ? String(row.error_message) : null,
        id: String(row.id),
        requiresConfirmation: Boolean(row.requires_confirmation),
        startedAt: row.started_at ? String(row.started_at) : null,
        status: String(row.status),
      };
    });
  }

  private async runDriverCommand(
    driver: Awaited<ReturnType<HrAttendanceDeviceDriverResolverService["resolveForDevice"]>>["driver"],
    commandKey: HrDeviceCommandKey,
    payload?: Record<string, unknown>,
  ) {
    switch (commandKey) {
      case "test_connection":
      case "ping":
        return { message: `Ping OK (${(await driver.ping()).latencyMs}ms)`, success: true };
      case "restart":
        return driver.restart();
      case "shutdown":
        return driver.shutdown ? driver.shutdown() : { message: "Shutdown not supported.", success: false };
      case "sync_time":
        return driver.syncTime();
      case "backup":
        return driver.backup();
      case "restore":
        return driver.restore(payload ?? {});
      case "clear_attendance_logs":
        return driver.clearLogs();
      case "clear_users":
        return driver.uploadUsers([]);
      case "upload_users":
        return driver.uploadUsers((payload?.users as never) ?? []);
      case "download_users": {
        const users = await driver.downloadUsers();
        return { message: `Downloaded ${users.length} users.`, payload: { users }, success: true };
      }
      case "upload_fingerprints":
        return driver.uploadFingerprints
          ? driver.uploadFingerprints(String(payload?.userCode ?? ""), new Uint8Array())
          : { message: "Fingerprint upload not supported.", success: false };
      case "upload_faces":
        return driver.uploadFaces
          ? driver.uploadFaces(String(payload?.userCode ?? ""), new Uint8Array())
          : { message: "Face upload not supported.", success: false };
      case "upload_cards":
        return driver.uploadCards
          ? driver.uploadCards(String(payload?.userCode ?? ""), String(payload?.cardNumber ?? ""))
          : { message: "Card upload not supported.", success: false };
      case "read_configuration":
        return { message: "Configuration read.", payload: { config: await driver.readConfiguration?.() }, success: true };
      case "write_configuration":
        return driver.writeConfiguration?.(payload ?? {}) ?? { message: "Write not supported.", success: false };
      case "factory_reset":
        return driver.factoryReset?.() ?? { message: "Factory reset not supported.", success: false };
      default:
        return { message: "Unknown command.", success: false };
    }
  }

  private async writeNotification(input: {
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

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export { COMMAND_JOB, HR_WORKFORCE_ENTERPRISE_JOB_KEYS };
