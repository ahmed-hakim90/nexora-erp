import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_ATTENDANCE_DEVICE_SYNC_PHASES } from "../constants/hr-attendance-device.constants";
import { isHrDeviceDriverSimulationEnabled } from "../device-drivers/driver-simulation";
import { createAttendanceDeviceDriverForDevice } from "../device-drivers/registry";
import {
  filterPunchesByWindow,
  resolveDownloadWindow,
  type HrAttendanceDeviceSyncStrategyConfig,
} from "../utils/hr-attendance-device-sync-strategy";
import { readDeviceMetadata } from "../utils/hr-attendance-device-credentials";
import { buildHrDeviceConnectionConfig } from "../utils/hr-attendance-device-connection";
import type {
  HrAttendanceDevicePreviewEmployee,
  HrAttendanceDevicePreviewPayload,
  HrAttendanceDeviceSyncPhase,
  HrAttendanceDeviceSyncStatus,
  HrAttendanceDeviceSyncStrategy,
} from "../types/hr-attendance-device.types";
import {
  HrAttendanceDeviceValidationService,
  type RawDevicePunch,
  type ValidationContext,
} from "./hr-attendance-device-validation.service";
import { HrAttendanceService } from "./hr-attendance.service";

type SyncSessionRow = Readonly<Record<string, unknown>>;

const PHASE_STATUS_MAP: Record<HrAttendanceDeviceSyncPhase, HrAttendanceDeviceSyncStatus> = {
  build_preview: "validating",
  connect: "connecting",
  download_punches: "downloading_punches",
  download_users: "downloading_users",
  import: "importing",
  ready_to_import: "preview_ready",
  validate: "validating",
};

function readSyncStrategyConfig(metadata: Record<string, unknown>): HrAttendanceDeviceSyncStrategyConfig {
  const strategy = String(metadata.syncStrategy ?? metadata.syncMode ?? "incremental") as HrAttendanceDeviceSyncStrategy;
  const options = (metadata.syncOptions as HrAttendanceDeviceSyncStrategyConfig["options"]) ?? {
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
  };
  const params = (metadata.strategyParams as HrAttendanceDeviceSyncStrategyConfig["params"]) ?? {};
  return { options, params, strategy };
}

function phaseProgress(phase: HrAttendanceDeviceSyncPhase): number {
  const index = HR_ATTENDANCE_DEVICE_SYNC_PHASES.indexOf(phase);
  if (index < 0) return 0;
  const previewPhases = HR_ATTENDANCE_DEVICE_SYNC_PHASES.indexOf("ready_to_import");
  return Math.min(100, Math.round((index / previewPhases) * 100));
}

type EmployeeMatchRow = Readonly<{
  attendance_code?: string | null;
  employee_number?: string | null;
  full_name: string;
  id: string;
}>;

function normalizeDeviceEmployeeCode(value: string): string {
  return value.trim();
}

function buildEmployeeLookupByCode(rows: readonly EmployeeMatchRow[]): Map<string, EmployeeMatchRow> {
  const map = new Map<string, EmployeeMatchRow>();
  for (const row of rows) {
    const attendanceCode = row.attendance_code ? normalizeDeviceEmployeeCode(String(row.attendance_code)) : "";
    const employeeNumber = row.employee_number ? normalizeDeviceEmployeeCode(String(row.employee_number)) : "";
    if (attendanceCode) map.set(attendanceCode, row);
    if (employeeNumber) map.set(employeeNumber, row);
  }
  return map;
}

function buildEmployeeCodeOrFilter(codes: readonly string[]): string | null {
  const uniqueCodes = [...new Set(codes.map(normalizeDeviceEmployeeCode).filter(Boolean))];
  if (uniqueCodes.length === 0) return null;
  return uniqueCodes.flatMap((code) => [`attendance_code.eq.${code}`, `employee_number.eq.${code}`]).join(",");
}

function isFileImportSession(metadata: Record<string, unknown>) {
  return metadata.importSource === "zkteco_csv";
}

function buildEmployeesFromPunches(
  punches: readonly RawDevicePunch[],
  namesByCode?: ReadonlyMap<string, string>,
): HrAttendanceDevicePreviewEmployee[] {
  const byCode = new Map<string, HrAttendanceDevicePreviewEmployee>();
  for (const punch of punches) {
    if (byCode.has(punch.attendanceCode)) continue;
    byCode.set(punch.attendanceCode, {
      attendanceCode: punch.attendanceCode,
      deviceCode: punch.deviceCode,
      employeeId: null,
      employeeLabel: namesByCode?.get(punch.attendanceCode) ?? punch.attendanceCode,
      matchStatus: "unknown",
    });
  }
  return [...byCode.values()];
}

export class HrAttendanceDeviceSyncRunner {
  private readonly validationService = new HrAttendanceDeviceValidationService();
  private readonly attendanceService: HrAttendanceService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.attendanceService = new HrAttendanceService(supabase, context);
  }

  async advanceSession(sessionId: string): Promise<SyncSessionRow> {
    const session = await this.getSession(sessionId);
    if (["completed", "failed", "cancelled", "preview_ready"].includes(String(session.status))) {
      return session;
    }

    const device = await this.getDevice(String(session.device_id));
    const phase = String(session.phase) as HrAttendanceDeviceSyncPhase;
    const sessionMetadata = readDeviceMetadata(session.metadata);
    const syncConfig = readSyncStrategyConfig(sessionMetadata);
    const syncMode = String(sessionMetadata.syncMode ?? syncConfig.strategy);

    if (phase === "connect") {
      if (isFileImportSession(sessionMetadata)) {
        const downloadedPunches = (sessionMetadata.downloadedPunches as RawDevicePunch[]) ?? [];
        const namesByCode = new Map(
          Object.entries((sessionMetadata.employeeNamesByCode as Record<string, string> | undefined) ?? {}),
        );
        const downloadedEmployees =
          (sessionMetadata.downloadedEmployees as HrAttendanceDevicePreviewEmployee[] | undefined) ??
          buildEmployeesFromPunches(downloadedPunches, namesByCode);
        return this.transition(session, "validate", `Loaded ${downloadedPunches.length} punches from file.`, {
          health_status: "online",
          last_heartbeat_at: new Date().toISOString(),
        }, {
          downloadedEmployees,
          downloadedPunches,
          recordsProcessed: downloadedPunches.length,
          recordsTotal: downloadedPunches.length,
        });
      }

      const nextPhase =
        syncMode === "punches_only" || syncMode === "templates_only" || syncMode === "configuration_only"
          ? "download_punches"
          : "download_users";
      return this.transition(session, nextPhase, "Connecting to device…", {
        health_status: "connecting",
        last_heartbeat_at: new Date().toISOString(),
      });
    }

    if (phase === "download_users") {
      const employees = await this.downloadDeviceEmployees(device);
      const processed = employees.length;
      if (syncMode === "users_only" || syncMode === "templates_only" || syncMode === "configuration_only") {
        const preview = await this.buildPreviewPayload(
          {
            ...session,
            metadata: { ...sessionMetadata, downloadedEmployees: employees, downloadedPunches: [] },
          },
          device,
        );
        return this.updateSession(String(session.id), {
          phase: "ready_to_import",
          phase_message: `Downloaded ${processed} users. Preview ready.`,
          preview_payload: preview,
          progress: 100,
          records_processed: processed,
          records_total: processed,
          status: "preview_ready",
          summary: preview.summary,
        });
      }
      return this.transition(session, "download_punches", `Downloaded ${processed} employees from device.`, undefined, {
        downloadedEmployees: employees,
        recordsProcessed: processed,
        recordsTotal: processed + 120,
      });
    }

    if (phase === "download_punches") {
      const metadata = readDeviceMetadata(session.metadata);
      const employees = (metadata.downloadedEmployees as HrAttendanceDevicePreviewEmployee[]) ?? [];
      const punches = await this.downloadDevicePunches(device, employees, session, syncConfig);
      return this.transition(session, "validate", `Downloaded ${punches.length} punches.`, undefined, {
        downloadedEmployees: employees,
        downloadedPunches: punches,
        recordsProcessed: Number(session.records_processed) + punches.length,
        recordsTotal: Number(session.records_total) + punches.length,
      });
    }

    if (phase === "validate" || phase === "build_preview") {
      const preview = await this.buildPreviewPayload(session, device);
      const nextPhase: HrAttendanceDeviceSyncPhase = phase === "validate" ? "build_preview" : "ready_to_import";
      if (nextPhase === "build_preview") {
        return this.transition(session, nextPhase, "Building import preview…", undefined, {
          previewPayload: preview,
          recordsProcessed: preview.punches.length,
          recordsTotal: preview.punches.length,
        });
      }

      const updated = await this.updateSession(String(session.id), {
        completed_at: null,
        phase: "ready_to_import",
        phase_message: "Preview ready for operator review.",
        preview_payload: preview,
        progress: 100,
        records_processed: preview.punches.length,
        records_total: preview.punches.length,
        status: "preview_ready",
        summary: preview.summary,
      });

      await this.updateDevice(String(session.device_id), {
        health_status: "online",
        last_successful_sync_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        pending_queue_count: 0,
        sync_checkpoint: {
          checkpointAt: new Date().toISOString(),
          sessionId: String(session.id),
          strategy: syncConfig.strategy,
        },
      });

      return updated;
    }

    return session;
  }

  async rebuildSessionPreview(
    sessionId: string,
    punches: readonly RawDevicePunch[],
  ): Promise<HrAttendanceDevicePreviewPayload> {
    const session = await this.getSession(sessionId);
    const device = await this.getDevice(String(session.device_id));
    const metadata = readDeviceMetadata(session.metadata);
    const namesByCode = new Map(
      Object.entries((metadata.employeeNamesByCode as Record<string, string> | undefined) ?? {}),
    );
    const downloadedEmployees = buildEmployeesFromPunches(punches, namesByCode);
    const nextMetadata = {
      ...metadata,
      downloadedEmployees,
      downloadedPunches: punches,
    };
    const preview = await this.buildPreviewPayload({ ...session, metadata: nextMetadata }, device);
    await this.updateSession(sessionId, {
      metadata: nextMetadata,
      phase: "ready_to_import",
      phase_message: "Preview updated after operator edits.",
      preview_payload: preview,
      progress: 100,
      records_processed: punches.length,
      records_total: punches.length,
      status: "preview_ready",
      summary: preview.summary,
    });
    return preview;
  }

  async executeImport(
    sessionId: string,
    decision: "all" | "valid_only" | "selected_employees" | "selected_days" | "selected_records",
    options?: {
      importWithoutProcessing?: boolean;
      selectedDays?: readonly string[];
      selectedEmployeeIds?: readonly string[];
      selectedRecordKeys?: readonly string[];
    },
  ): Promise<SyncSessionRow> {
    const session = await this.getSession(sessionId);
    if (String(session.status) !== "preview_ready") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Sync session is not ready for import." });
    }

    const preview = session.preview_payload as HrAttendanceDevicePreviewPayload;
    const device = await this.getDevice(String(session.device_id));
    const sessionMetadata = readDeviceMetadata(session.metadata);
    const syncConfig = readSyncStrategyConfig(sessionMetadata);
    const importSource = sessionMetadata.importSource === "zkteco_csv" ? "file_import" : "biometric_device";
    const punches = preview.punches.filter((punch) => {
      if (decision === "valid_only") return punch.importResult === "ready";
      if (decision === "selected_employees") {
        return (
          (punch.importResult === "ready" || punch.importResult === "warning") &&
          Boolean(punch.employeeId && options?.selectedEmployeeIds?.includes(punch.employeeId))
        );
      }
      if (decision === "selected_days") {
        const day = punch.punchTime.slice(0, 10);
        return (
          (punch.importResult === "ready" || punch.importResult === "warning") &&
          Boolean(options?.selectedDays?.includes(day))
        );
      }
      if (decision === "selected_records") {
        const key = `${punch.attendanceCode}::${punch.punchTime}::${punch.punchType}`;
        return (
          (punch.importResult === "ready" || punch.importResult === "warning") &&
          Boolean(options?.selectedRecordKeys?.includes(key))
        );
      }
      return punch.importResult === "ready" || punch.importResult === "warning";
    });

    if (punches.length === 0 && !isHrDeviceDriverSimulationEnabled()) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "No punches available to import from the device.",
      });
    }

    await this.updateSession(String(session.id), {
      phase: "import",
      phase_message: `Importing ${punches.length} punches…`,
      progress: 5,
      status: "importing",
    });

    let imported = 0;
    let duplicatesSkipped = 0;
    let blockingSkipped = 0;
    let warningsCount = 0;
    const aggregationTargets = new Map<string, { employeeId: string; employmentProfileId: string; workDate: string }>();

    for (const punch of punches) {
      if (!punch.employeeId) {
        blockingSkipped += 1;
        continue;
      }

      const employmentProfileId = await this.resolveEmploymentProfileId(punch.employeeId);
      const { error } = await this.supabase.from("hr_attendance_punch_logs").insert({
        branch_id: device.branch_id,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        device_id: device.id,
        employee_id: punch.employeeId,
        employment_profile_id: employmentProfileId,
        metadata: { imported_from_device_sync: true, session_id: sessionId },
        punch_time: punch.punchTime,
        punch_type: punch.punchType,
        source: importSource,
        status: punch.importResult === "duplicate" ? "duplicate" : "imported",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      });

      if (error) {
        if (String(error.message).toLowerCase().includes("duplicate")) {
          duplicatesSkipped += 1;
        } else {
          blockingSkipped += 1;
        }
        continue;
      }

      imported += 1;
      if (punch.importResult === "warning") warningsCount += 1;
      const workDate = punch.punchTime.slice(0, 10);
      aggregationTargets.set(`${punch.employeeId}::${workDate}`, {
        employeeId: punch.employeeId,
        employmentProfileId,
        workDate,
      });
    }

    if (
      !options?.importWithoutProcessing &&
      syncConfig.options.recalculateAttendance &&
      aggregationTargets.size > 0
    ) {
      for (const target of aggregationTargets.values()) {
        await this.attendanceService.aggregateAttendanceDay(target.employeeId, target.employmentProfileId, target.workDate);
      }
    }

    const importReport = {
      aggregationCount: aggregationTargets.size,
      blockingSkipped,
      completedAt: new Date().toISOString(),
      deviceCode: String(device.code),
      deviceName: String(device.name),
      duplicatesSkipped,
      importedCount: imported,
      importWithoutProcessing: Boolean(options?.importWithoutProcessing),
      sessionId,
      strategy: syncConfig.strategy,
      warningsCount,
    };

    await this.updateDevice(String(device.id), {
      last_successful_sync_at: new Date().toISOString(),
      sync_checkpoint: {
        checkpointAt: new Date().toISOString(),
        importedCount: imported,
        sessionId,
        strategy: syncConfig.strategy,
      },
    });

    return this.updateSession(String(session.id), {
      completed_at: new Date().toISOString(),
      import_report: importReport,
      phase: "import",
      phase_message: `Imported ${imported} punches.`,
      progress: 100,
      status: "completed",
      summary: preview.summary,
    });
  }

  private async buildPreviewPayload(session: SyncSessionRow, device: SyncSessionRow): Promise<HrAttendanceDevicePreviewPayload> {
    const metadata = readDeviceMetadata(session.metadata);
    const syncConfig = readSyncStrategyConfig(metadata);
    const downloadedEmployees = (metadata.downloadedEmployees as HrAttendanceDevicePreviewEmployee[]) ?? [];
    const downloadedPunches = (metadata.downloadedPunches as RawDevicePunch[]) ?? [];
    const window = resolveDownloadWindow({
      config: syncConfig,
      lastSuccessfulSyncAt: device.last_successful_sync_at ? String(device.last_successful_sync_at) : device.last_sync_at ? String(device.last_sync_at) : null,
      missingDates: (metadata.missingDates as string[] | undefined) ?? [],
    });

    const employeeIds = downloadedEmployees
      .map((employee) => employee.employeeId)
      .filter((value): value is string => Boolean(value));

    const employeeLabels = new Map<string, string>();
    const employeeStatusById = new Map<string, string>();
    const employeeBranchById = new Map<string, string | null>();
    const employeeCompanyById = new Map<string, string>();

    if (employeeIds.length > 0) {
      const { data } = await this.supabase
        .from("hr_employees")
        .select("id, full_name, status, branch_id, company_id")
        .in("id", employeeIds)
        .eq("tenant_id", this.context.tenantId);
      for (const row of data ?? []) {
        employeeLabels.set(String(row.id), String(row.full_name));
        employeeStatusById.set(String(row.id), String(row.status));
        employeeBranchById.set(String(row.id), row.branch_id ? String(row.branch_id) : null);
        employeeCompanyById.set(String(row.id), String(row.company_id));
      }
    }

    const mappedEmployeeByCode = new Map<string, string>();
    for (const employee of downloadedEmployees) {
      if (employee.employeeId) mappedEmployeeByCode.set(employee.attendanceCode, employee.employeeId);
    }

    const punchCodes = [...new Set(downloadedPunches.map((punch) => punch.attendanceCode).filter(Boolean))];
    const unmatchedCodes = punchCodes.filter((code) => !mappedEmployeeByCode.has(code));
    if (unmatchedCodes.length > 0) {
      const orFilter = buildEmployeeCodeOrFilter(unmatchedCodes);
      if (orFilter) {
        const { data: matchedEmployees } = await this.supabase
          .from("hr_employees")
          .select("id, full_name, status, branch_id, company_id, attendance_code, employee_number")
          .eq("tenant_id", this.context.tenantId)
          .eq("company_id", this.context.companyId)
          .is("deleted_at", null)
          .or(orFilter);

        for (const row of matchedEmployees ?? []) {
          const employeeId = String(row.id);
          employeeLabels.set(employeeId, String(row.full_name));
          employeeStatusById.set(employeeId, String(row.status));
          employeeBranchById.set(employeeId, row.branch_id ? String(row.branch_id) : null);
          employeeCompanyById.set(employeeId, String(row.company_id));

          const attendanceCode = row.attendance_code ? normalizeDeviceEmployeeCode(String(row.attendance_code)) : "";
          const employeeNumber = row.employee_number ? normalizeDeviceEmployeeCode(String(row.employee_number)) : "";
          if (attendanceCode) mappedEmployeeByCode.set(attendanceCode, employeeId);
          if (employeeNumber) mappedEmployeeByCode.set(employeeNumber, employeeId);
        }
      }
    }

    const { data: mappings } = await this.supabase
      .from("hr_attendance_device_employee_mappings")
      .select("device_employee_code, employee_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", device.id)
      .is("deleted_at", null);

    for (const mapping of mappings ?? []) {
      mappedEmployeeByCode.set(String(mapping.device_employee_code), String(mapping.employee_id));
    }

    const existingPunchKeys = new Set<string>();
    const { data: existingPunches } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("employee_id, punch_time, punch_type")
      .eq("tenant_id", this.context.tenantId)
      .eq("device_id", device.id)
      .gte("punch_time", `${window.dateFrom}T00:00:00.000Z`)
      .lte("punch_time", `${window.dateTo}T23:59:59.999Z`)
      .is("deleted_at", null)
      .limit(10000);

    const employeeCodeById = new Map<string, string>();
    for (const employee of downloadedEmployees) {
      if (employee.employeeId) employeeCodeById.set(employee.employeeId, employee.attendanceCode);
    }

    for (const punch of existingPunches ?? []) {
      const code = employeeCodeById.get(String(punch.employee_id)) ?? String(punch.employee_id);
      existingPunchKeys.add(`${code}::${String(punch.punch_time)}::${String(punch.punch_type)}`);
    }

    const lockedPayrollDates = await this.loadLockedPayrollDates(window.dateFrom, window.dateTo);
    const attendanceLockedDates = await this.loadAttendanceLockedDates(window.dateFrom, window.dateTo);

    const validationContext: ValidationContext = {
      attendanceLockedDates,
      deviceBranchId: device.branch_id ? String(device.branch_id) : null,
      deviceCompanyId: String(device.company_id),
      employeeBranchById,
      employeeCompanyById,
      employeeStatusById,
      existingPunchKeys,
      forceResync: window.forceResync,
      holidayDates: new Set(),
      lockedPayrollDates,
      mappedEmployeeByCode,
      maxDailyMinutes: 16 * 60,
      skipDuplicates: syncConfig.options.skipDuplicates,
      timezone: String(device.timezone ?? "UTC"),
    };

    return this.validationService.buildPreview({
      context: validationContext,
      deviceEmployees: downloadedEmployees,
      employeeLabels,
      punches: downloadedPunches,
    });
  }

  private async downloadDeviceEmployees(device: SyncSessionRow): Promise<HrAttendanceDevicePreviewEmployee[]> {
    const driver = await this.connectDriver(device);
    try {
      const deviceUsers = await driver.downloadUsers();
      const deviceCodes = deviceUsers.map((user) => user.attendanceCode).filter(Boolean);
      const orFilter = buildEmployeeCodeOrFilter(deviceCodes);
      const { data: employees } = orFilter
        ? await this.supabase
            .from("hr_employees")
            .select("id, full_name, attendance_code, employee_number")
            .eq("tenant_id", this.context.tenantId)
            .eq("company_id", this.context.companyId)
            .is("deleted_at", null)
            .or(orFilter)
        : { data: [] as EmployeeMatchRow[] };

      const employeeByCode = buildEmployeeLookupByCode(employees ?? []);

      const { data: mappings } = await this.supabase
        .from("hr_attendance_device_employee_mappings")
        .select("device_employee_code, employee_id, hr_employees(full_name, attendance_code, employee_number)")
        .eq("tenant_id", this.context.tenantId)
        .eq("device_id", device.id)
        .is("deleted_at", null);

      const mappingByCode = new Map((mappings ?? []).map((row) => [String(row.device_employee_code), row]));

      const records: HrAttendanceDevicePreviewEmployee[] = deviceUsers.map((user) => {
        const mapping = mappingByCode.get(user.attendanceCode);
        const employee = employeeByCode.get(normalizeDeviceEmployeeCode(user.attendanceCode));
        const employeeId = mapping ? String(mapping.employee_id) : employee ? String(employee.id) : null;
        const employeeLabel = mapping
          ? String((mapping.hr_employees as { full_name?: string } | null)?.full_name ?? user.name)
          : employee
            ? String(employee.full_name)
            : user.name;
        return {
          attendanceCode: user.attendanceCode,
          deviceCode: user.deviceCode,
          employeeId,
          employeeLabel,
          matchStatus: employeeId ? (mapping ? "matched" : "updated") : "unknown",
        };
      });

      await this.updateDevice(String(device.id), { employees_loaded_count: records.length });
      return records;
    } finally {
      await driver.disconnect();
    }
  }

  private async downloadDevicePunches(
    device: SyncSessionRow,
    employees: readonly HrAttendanceDevicePreviewEmployee[],
    session: SyncSessionRow,
    syncConfig: HrAttendanceDeviceSyncStrategyConfig,
  ): Promise<RawDevicePunch[]> {
    const driver = await this.connectDriver(device);
    try {
      const window = resolveDownloadWindow({
        config: syncConfig,
        lastSuccessfulSyncAt: device.last_successful_sync_at ? String(device.last_successful_sync_at) : device.last_sync_at ? String(device.last_sync_at) : null,
        missingDates: (readDeviceMetadata(session.metadata).missingDates as string[] | undefined) ?? [],
      });
      const employeeCodes = await this.resolveEmployeeAttendanceCodes(syncConfig, employees);
      const devicePunches = await driver.downloadPunches(window.sinceIso ?? `${window.dateFrom}T00:00:00.000Z`);
      let punches: RawDevicePunch[] = devicePunches.map((punch) => ({
        attendanceCode: punch.attendanceCode,
        deviceCode: punch.deviceCode,
        punchTime: punch.punchTime,
        punchType: punch.punchType,
      }));

      punches = filterPunchesByWindow(punches, window, syncConfig.options, employeeCodes);

      if (punches.length === 0 && isHrDeviceDriverSimulationEnabled()) {
        const simulationEmployees = employeeCodes
          ? employees.filter((employee) => employeeCodes.has(employee.attendanceCode))
          : employees;
        for (const [index, employee] of simulationEmployees.entries()) {
          if (!employee.employeeId) continue;
          const inTime = new Date(`${window.dateTo}T08:00:00.000Z`);
          inTime.setUTCHours(8 + (index % 3), 5, 0, 0);
          const outTime = new Date(inTime);
          outTime.setUTCHours(inTime.getUTCHours() + 8);
          punches.push({
            attendanceCode: employee.attendanceCode,
            deviceCode: String(device.code),
            punchTime: inTime.toISOString(),
            punchType: "in",
          });
          punches.push({
            attendanceCode: employee.attendanceCode,
            deviceCode: String(device.code),
            punchTime: outTime.toISOString(),
            punchType: "out",
          });
        }
      }

      const storage = await driver.getStorageStatus();
      await this.updateDevice(String(device.id), {
        health_status: "sync_running",
        pending_queue_count: 0,
        today_punches_count: punches.length,
        storage_usage_pct: storage.storageUsagePct,
        memory_usage_pct: storage.memoryUsagePct,
      });

      return punches;
    } finally {
      await driver.disconnect();
    }
  }

  private async resolveEmployeeAttendanceCodes(
    syncConfig: HrAttendanceDeviceSyncStrategyConfig,
    employees: readonly HrAttendanceDevicePreviewEmployee[],
  ): Promise<ReadonlySet<string> | undefined> {
    if (syncConfig.strategy === "employees" && syncConfig.params.employeeIds?.length) {
      const { data } = await this.supabase
        .from("hr_employees")
        .select("attendance_code, employee_number")
        .eq("tenant_id", this.context.tenantId)
        .in("id", [...syncConfig.params.employeeIds]);
      const codes = new Set<string>();
      for (const row of data ?? []) {
        if (row.attendance_code) codes.add(normalizeDeviceEmployeeCode(String(row.attendance_code)));
        if (row.employee_number) codes.add(normalizeDeviceEmployeeCode(String(row.employee_number)));
      }
      return codes;
    }

    if (syncConfig.strategy === "departments" && syncConfig.params.departmentIds?.length) {
      const { data } = await this.supabase
        .from("hr_employees")
        .select("attendance_code, employee_number")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .in("department_id", [...syncConfig.params.departmentIds])
        .is("deleted_at", null);
      const codes = new Set<string>();
      for (const row of data ?? []) {
        if (row.attendance_code) codes.add(normalizeDeviceEmployeeCode(String(row.attendance_code)));
        if (row.employee_number) codes.add(normalizeDeviceEmployeeCode(String(row.employee_number)));
      }
      return codes.size > 0 ? codes : undefined;
    }

    return undefined;
  }

  private async loadLockedPayrollDates(dateFrom: string, dateTo: string): Promise<Set<string>> {
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
      const start = String(closing.period_start).slice(0, 10);
      const end = String(closing.period_end).slice(0, 10);
      let cursor = start;
      while (cursor <= end) {
        if (cursor >= dateFrom && cursor <= dateTo) locked.add(cursor);
        const next = new Date(`${cursor}T00:00:00.000Z`);
        next.setUTCDate(next.getUTCDate() + 1);
        cursor = next.toISOString().slice(0, 10);
      }
    }
    return locked;
  }

  private async loadAttendanceLockedDates(dateFrom: string, dateTo: string): Promise<Set<string>> {
    const locked = new Set<string>();
    const { data: days } = await this.supabase
      .from("hr_attendance_days")
      .select("work_date, hr_attendance_locks(lock_level)")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .gte("work_date", dateFrom)
      .lte("work_date", dateTo)
      .is("deleted_at", null);
    for (const day of days ?? []) {
      const locks = day.hr_attendance_locks as { lock_level?: string }[] | { lock_level?: string } | null;
      const lockRows = Array.isArray(locks) ? locks : locks ? [locks] : [];
      if (lockRows.some((lock) => ["review_locked", "payroll_locked"].includes(String(lock.lock_level)))) {
        locked.add(String(day.work_date).slice(0, 10));
      }
    }
    return locked;
  }

  private async connectDriver(device: SyncSessionRow) {
    const config = buildHrDeviceConnectionConfig(device);
    const driver = createAttendanceDeviceDriverForDevice({ deviceType: config.deviceType, driverKey: config.driverKey });
    await driver.connect(config);
    return driver;
  }

  private async resolveEmploymentProfileId(employeeId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active employment profile required for import." });
    }
    return String(data.id);
  }

  private async transition(
    session: SyncSessionRow,
    nextPhase: HrAttendanceDeviceSyncPhase,
    message: string,
    devicePatch?: Record<string, unknown>,
    metadataPatch?: Record<string, unknown>,
  ) {
    const metadata = { ...readDeviceMetadata(session.metadata), ...metadataPatch };
    const recordsProcessed = Number(metadata.recordsProcessed ?? session.records_processed ?? 0);
    const recordsTotal = Number(metadata.recordsTotal ?? session.records_total ?? 0);
    const speed = recordsProcessed > 0 ? Math.max(1, Math.round(recordsProcessed / 3)) : 0;

    if (devicePatch) {
      await this.updateDevice(String(session.device_id), devicePatch);
    }

    return this.updateSession(String(session.id), {
      metadata,
      phase: nextPhase,
      phase_message: message,
      progress: phaseProgress(nextPhase),
      records_processed: recordsProcessed,
      records_total: Math.max(recordsTotal, recordsProcessed),
      speed_records_per_sec: speed,
      started_at: session.started_at ?? new Date().toISOString(),
      status: PHASE_STATUS_MAP[nextPhase],
    });
  }

  private async getSession(sessionId: string): Promise<SyncSessionRow> {
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

  private async getDevice(deviceId: string): Promise<SyncSessionRow> {
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

  private async updateSession(sessionId: string, patch: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from("hr_attendance_device_sync_sessions")
      .update({ ...patch, updated_by: this.context.userId })
      .eq("id", sessionId)
      .eq("tenant_id", this.context.tenantId)
      .select("*")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update sync session.", cause: error });
    return data;
  }

  private async updateDevice(deviceId: string, patch: Record<string, unknown>) {
    await this.supabase
      .from("hr_attendance_devices")
      .update({ ...patch, updated_by: this.context.userId })
      .eq("id", deviceId)
      .eq("tenant_id", this.context.tenantId);
  }
}
