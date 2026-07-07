import type { HrAttendanceDeviceSyncStrategy } from "../types/hr-attendance-device.types";

export type HrAttendanceDeviceSyncOptions = Readonly<{
  autoBuildPreview: boolean;
  dryRun: boolean;
  includeBreakPunches: boolean;
  includeCheckIn: boolean;
  includeCheckOut: boolean;
  includeDeviceEvents: boolean;
  includeInvalidPunches: boolean;
  includeManualPunches: boolean;
  recalculateAttendance: boolean;
  skipDuplicates: boolean;
}>;

export const HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS: HrAttendanceDeviceSyncOptions = {
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

export type HrAttendanceDeviceStrategyParams = Readonly<{
  branchId?: string;
  businessUnitId?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentIds?: readonly string[];
  deviceIds?: readonly string[];
  employeeIds?: readonly string[];
  locationId?: string;
  month?: number;
  shiftId?: string;
  specificDate?: string;
  teamId?: string;
  year?: number;
}>;

export type HrAttendanceDeviceSyncStrategyConfig = Readonly<{
  options: HrAttendanceDeviceSyncOptions;
  params: HrAttendanceDeviceStrategyParams;
  strategy: HrAttendanceDeviceSyncStrategy;
}>;

export type HrAttendanceDeviceDownloadWindow = Readonly<{
  dateFrom: string;
  dateTo: string;
  employeeAttendanceCodes?: ReadonlySet<string>;
  forceResync: boolean;
  sinceIso?: string;
}>;

export type HrAttendanceDeviceSyncRecommendation = Readonly<{
  code: string;
  message: string;
  severity: "info" | "warning" | "blocking";
}>;

export const HR_ATTENDANCE_DEVICE_MAX_DATE_RANGE_DAYS = 93;

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(year: number, month: number): { dateFrom: string; dateTo: string } {
  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { dateFrom, dateTo };
}

function daysBetweenInclusive(dateFrom: string, dateTo: string): number {
  const start = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
  const end = new Date(`${dateTo}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000) + 1);
}

export function resolveDownloadWindow(input: {
  config: HrAttendanceDeviceSyncStrategyConfig;
  lastSuccessfulSyncAt?: string | null;
  missingDates?: readonly string[];
  today?: string;
}): HrAttendanceDeviceDownloadWindow {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const { config } = input;
  const forceResync = config.strategy === "force_resync";

  switch (config.strategy) {
    case "specific_date": {
      const date = toDateOnly(config.params.specificDate ?? today);
      return {
        dateFrom: date,
        dateTo: date,
        forceResync,
        sinceIso: `${date}T00:00:00.000Z`,
      };
    }
    case "date_range": {
      const dateFrom = toDateOnly(config.params.dateFrom ?? today);
      const dateTo = toDateOnly(config.params.dateTo ?? dateFrom);
      return {
        dateFrom: dateFrom <= dateTo ? dateFrom : dateTo,
        dateTo: dateFrom <= dateTo ? dateTo : dateFrom,
        forceResync,
        sinceIso: `${dateFrom <= dateTo ? dateFrom : dateTo}T00:00:00.000Z`,
      };
    }
    case "month": {
      const year = config.params.year ?? new Date().getUTCFullYear();
      const month = config.params.month ?? new Date().getUTCMonth() + 1;
      const bounds = monthBounds(year, month);
      return {
        ...bounds,
        forceResync,
        sinceIso: `${bounds.dateFrom}T00:00:00.000Z`,
      };
    }
    case "missing_days_recovery": {
      const dates = input.missingDates?.length ? [...input.missingDates].sort() : [today];
      return {
        dateFrom: dates[0]!,
        dateTo: dates[dates.length - 1]!,
        forceResync: false,
        sinceIso: `${dates[0]!}T00:00:00.000Z`,
      };
    }
    case "incremental":
    default: {
      const since = input.lastSuccessfulSyncAt ?? `${today}T00:00:00.000Z`;
      return {
        dateFrom: toDateOnly(since),
        dateTo: today,
        forceResync: false,
        sinceIso: since,
      };
    }
  }
}

export function filterPunchesByWindow<T extends { punchTime: string; attendanceCode: string; punchType: string }>(
  punches: readonly T[],
  window: HrAttendanceDeviceDownloadWindow,
  options: HrAttendanceDeviceSyncOptions,
  employeeCodes?: ReadonlySet<string>,
): T[] {
  return punches.filter((punch) => {
    const punchDate = toDateOnly(punch.punchTime);
    if (punchDate < window.dateFrom || punchDate > window.dateTo) return false;
    if (employeeCodes && !employeeCodes.has(punch.attendanceCode)) return false;
    if (!options.includeCheckIn && punch.punchType === "in") return false;
    if (!options.includeCheckOut && punch.punchType === "out") return false;
    return true;
  });
}

export function estimateSyncMetrics(input: {
  config: HrAttendanceDeviceSyncStrategyConfig;
  employeeCount: number;
  window: HrAttendanceDeviceDownloadWindow;
}): Readonly<{ estimatedDurationSeconds: number; estimatedEmployees: number; estimatedPunches: number }> {
  const dayCount = daysBetweenInclusive(input.window.dateFrom, input.window.dateTo);
  const estimatedEmployees =
    input.config.strategy === "employees" ? (input.config.params.employeeIds?.length ?? input.employeeCount) : input.employeeCount;
  const punchesPerEmployeePerDay = 2;
  const estimatedPunches = Math.max(0, estimatedEmployees * dayCount * punchesPerEmployeePerDay);
  const estimatedDurationSeconds = Math.max(5, Math.ceil(estimatedPunches / 120) + dayCount * 2);
  return { estimatedDurationSeconds, estimatedEmployees, estimatedPunches };
}

export function buildSyncRecommendations(input: {
  config: HrAttendanceDeviceSyncStrategyConfig;
  hasInterruptedSession: boolean;
  lastSuccessfulSyncAt?: string | null;
  lockedDatesInWindow: readonly string[];
  missingDates: readonly string[];
  window: HrAttendanceDeviceDownloadWindow;
}): HrAttendanceDeviceSyncRecommendation[] {
  const recommendations: HrAttendanceDeviceSyncRecommendation[] = [];
  const metrics = estimateSyncMetrics({
    config: input.config,
    employeeCount: 50,
    window: input.window,
  });

  if (input.config.strategy === "incremental" || !input.config.strategy) {
    recommendations.push({
      code: "incremental_recommended",
      message: "Incremental sync recommended for routine operations.",
      severity: "info",
    });
  }

  if (input.lastSuccessfulSyncAt) {
    recommendations.push({
      code: "last_successful_sync",
      message: `Last successful sync: ${new Date(input.lastSuccessfulSyncAt).toLocaleString()}.`,
      severity: "info",
    });
  }

  if (input.missingDates.length > 0 && input.config.strategy !== "missing_days_recovery") {
    recommendations.push({
      code: "missing_days_detected",
      message: `${input.missingDates.length} missing attendance day(s) detected. Consider Missing Days Recovery.`,
      severity: "warning",
    });
  }

  if (input.lockedDatesInWindow.length > 0) {
    recommendations.push({
      code: "payroll_locked",
      message: `Payroll period is locked for ${input.lockedDatesInWindow.length} day(s) in the selected range.`,
      severity: "blocking",
    });
  }

  if (metrics.estimatedPunches > 5000) {
    recommendations.push({
      code: "large_import",
      message: `Large import expected (~${metrics.estimatedPunches} punches). Estimated duration ${Math.ceil(metrics.estimatedDurationSeconds / 60)} minutes.`,
      severity: "warning",
    });
  } else if (metrics.estimatedDurationSeconds > 60) {
    recommendations.push({
      code: "estimated_duration",
      message: `Estimated duration ${Math.ceil(metrics.estimatedDurationSeconds / 60)} minute(s).`,
      severity: "info",
    });
  }

  if (input.hasInterruptedSession) {
    recommendations.push({
      code: "interrupted_session",
      message: "An interrupted sync session exists. Resume or cancel before starting a new sync.",
      severity: "warning",
    });
  }

  const daySpan = daysBetweenInclusive(input.window.dateFrom, input.window.dateTo);
  if (daySpan > HR_ATTENDANCE_DEVICE_MAX_DATE_RANGE_DAYS) {
    recommendations.push({
      code: "range_too_large",
      message: `Date range exceeds maximum of ${HR_ATTENDANCE_DEVICE_MAX_DATE_RANGE_DAYS} days.`,
      severity: "blocking",
    });
  }

  return recommendations;
}

export function validateStrategyConfig(config: HrAttendanceDeviceSyncStrategyConfig): string | null {
  if (config.strategy === "specific_date" && !config.params.specificDate) {
    return "Specific date is required.";
  }
  if (config.strategy === "date_range") {
    if (!config.params.dateFrom || !config.params.dateTo) return "From and to dates are required.";
    const dateFrom = toDateOnly(config.params.dateFrom);
    const dateTo = toDateOnly(config.params.dateTo);
    if (dateFrom > dateTo) return "From date must be on or before to date.";
    if (daysBetweenInclusive(dateFrom, dateTo) > HR_ATTENDANCE_DEVICE_MAX_DATE_RANGE_DAYS) {
      return `Date range cannot exceed ${HR_ATTENDANCE_DEVICE_MAX_DATE_RANGE_DAYS} days.`;
    }
  }
  if (config.strategy === "month" && (!config.params.month || !config.params.year)) {
    return "Month and year are required.";
  }
  if (config.strategy === "employees" && (!config.params.employeeIds || config.params.employeeIds.length === 0)) {
    return "Select at least one employee.";
  }
  if (config.strategy === "departments" && (!config.params.departmentIds || config.params.departmentIds.length === 0)) {
    return "Select at least one department.";
  }
  if (config.strategy === "devices" && (!config.params.deviceIds || config.params.deviceIds.length === 0)) {
    return "Select at least one device.";
  }
  return null;
}
