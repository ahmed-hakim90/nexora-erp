import type {
  HrAttendanceDevicePreviewEmployee,
  HrAttendanceDevicePreviewPayload,
  HrAttendanceDevicePreviewPunch,
  HrAttendanceDevicePreviewSummary,
  HrAttendanceDeviceValidationIssue,
  HrAttendanceValidationSeverity,
} from "../types/hr-attendance-device.types";

type RawDevicePunch = Readonly<{
  attendanceCode: string;
  deviceCode: string;
  punchTime: string;
  punchType: "in" | "out";
}>;

type ValidationContext = Readonly<{
  attendanceLockedDates: ReadonlySet<string>;
  deviceBranchId: string | null;
  deviceCompanyId: string;
  employeeBranchById: ReadonlyMap<string, string | null>;
  employeeCompanyById: ReadonlyMap<string, string | null>;
  employeeStatusById: ReadonlyMap<string, string>;
  existingPunchKeys: ReadonlySet<string>;
  forceResync: boolean;
  holidayDates: ReadonlySet<string>;
  lockedPayrollDates: ReadonlySet<string>;
  mappedEmployeeByCode: ReadonlyMap<string, string>;
  maxDailyMinutes: number;
  now?: Date;
  skipDuplicates: boolean;
  timezone: string;
}>;

function punchKey(attendanceCode: string, punchTime: string, punchType: string) {
  return `${attendanceCode}::${punchTime}::${punchType}`;
}

function isWeekend(dateIso: string) {
  const day = new Date(dateIso).getUTCDay();
  return day === 0 || day === 6;
}

function detectDstAmbiguity(punchTime: string, timezone: string): boolean {
  if (!timezone || timezone === "UTC") return false;
  const date = new Date(punchTime);
  const jan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const jul = new Date(Date.UTC(date.getUTCFullYear(), 6, 1));
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  return Math.abs(date.getTimezoneOffset() - stdOffset) > 0;
}

function hasOverlappingPunch(
  punch: RawDevicePunch,
  employeeId: string | null,
  previewPunches: readonly HrAttendanceDevicePreviewPunch[],
): boolean {
  if (!employeeId) return false;
  const punchMs = new Date(punch.punchTime).getTime();
  return previewPunches.some((existing) => {
    if (existing.employeeId !== employeeId) return false;
    const existingMs = new Date(existing.punchTime).getTime();
    return Math.abs(existingMs - punchMs) < 60_000 && existing.punchType === punch.punchType;
  });
}

function estimateImportSeconds(readyCount: number) {
  if (readyCount <= 0) return 0;
  return Math.max(2, Math.ceil(readyCount / 250));
}

export class HrAttendanceDeviceValidationService {
  buildPreview(input: {
    context: ValidationContext;
    deviceEmployees: readonly HrAttendanceDevicePreviewEmployee[];
    employeeLabels: ReadonlyMap<string, string>;
    punches: readonly RawDevicePunch[];
  }): HrAttendanceDevicePreviewPayload {
    const issues: HrAttendanceDeviceValidationIssue[] = [];
    const previewPunches: HrAttendanceDevicePreviewPunch[] = [];
    const seenPunchKeys = new Set<string>();
    const now = input.context.now ?? new Date();

    for (const punch of input.punches) {
      const employeeId = input.context.mappedEmployeeByCode.get(punch.attendanceCode) ?? null;
      const employeeLabel = employeeId ? (input.employeeLabels.get(employeeId) ?? "Employee") : punch.attendanceCode;
      const messages: string[] = [];
      let severity: HrAttendanceValidationSeverity = "info";
      let importResult: HrAttendanceDevicePreviewPunch["importResult"] = "ready";

      const key = punchKey(punch.attendanceCode, punch.punchTime, punch.punchType);
      const isDuplicate =
        !input.context.forceResync &&
        input.context.skipDuplicates &&
        (seenPunchKeys.has(key) || input.context.existingPunchKeys.has(key));
      if (isDuplicate) {
        issues.push({
          code: "duplicate_punch",
          employeeCode: punch.attendanceCode,
          message: `Duplicate punch for ${punch.attendanceCode} at ${punch.punchTime}.`,
          punchIndex: previewPunches.length,
          severity: "warning",
        });
        messages.push("Duplicate punch");
        importResult = "duplicate";
        severity = "warning";
      }
      seenPunchKeys.add(key);

      if (!employeeId) {
        issues.push({
          code: "unknown_employee",
          employeeCode: punch.attendanceCode,
          message: `Unknown employee code ${punch.attendanceCode}.`,
          punchIndex: previewPunches.length,
          severity: "error",
        });
        messages.push("Unknown employee");
        importResult = "error";
        severity = "error";
      }

      const punchDate = punch.punchTime.slice(0, 10);
      if (new Date(punch.punchTime).getTime() > now.getTime() + 5 * 60_000) {
        issues.push({
          code: "future_time",
          employeeCode: punch.attendanceCode,
          message: `Future punch time ${punch.punchTime}.`,
          punchIndex: previewPunches.length,
          severity: "blocking",
        });
        messages.push("Future timestamp");
        importResult = "blocked";
        severity = "blocking";
      }

      if (Number.isNaN(new Date(punch.punchTime).getTime())) {
        issues.push({
          code: "invalid_timestamp",
          employeeCode: punch.attendanceCode,
          message: `Invalid timestamp ${punch.punchTime}.`,
          punchIndex: previewPunches.length,
          severity: "blocking",
        });
        messages.push("Invalid timestamp");
        importResult = "blocked";
        severity = "blocking";
      }

      if (employeeId) {
        const status = input.context.employeeStatusById.get(employeeId);
        if (status && status !== "active") {
          issues.push({
            code: "inactive_employee",
            employeeCode: punch.attendanceCode,
            message: `Employee ${employeeLabel} is not active.`,
            punchIndex: previewPunches.length,
            severity: "warning",
          });
          messages.push("Inactive employee");
          if (importResult === "ready") {
            importResult = "warning";
            severity = "warning";
          }
        }

        const employeeBranch = input.context.employeeBranchById.get(employeeId);
        if (input.context.deviceBranchId && employeeBranch && employeeBranch !== input.context.deviceBranchId) {
          issues.push({
            code: "branch_mismatch",
            employeeCode: punch.attendanceCode,
            message: `Employee branch does not match device branch.`,
            punchIndex: previewPunches.length,
            severity: "warning",
          });
          messages.push("Branch mismatch");
          if (importResult === "ready") {
            importResult = "warning";
            severity = "warning";
          }
        }

        const employeeCompany = input.context.employeeCompanyById.get(employeeId);
        if (employeeCompany && employeeCompany !== input.context.deviceCompanyId) {
          issues.push({
            code: "company_mismatch",
            employeeCode: punch.attendanceCode,
            message: "Employee company does not match device company.",
            punchIndex: previewPunches.length,
            severity: "blocking",
          });
          messages.push("Company mismatch");
          importResult = "blocked";
          severity = "blocking";
        }

        if (hasOverlappingPunch(punch, employeeId, previewPunches)) {
          issues.push({
            code: "overlapping_punch",
            employeeCode: punch.attendanceCode,
            message: `Overlapping punch within one minute for ${employeeLabel}.`,
            punchIndex: previewPunches.length,
            severity: "warning",
          });
          messages.push("Overlapping punch");
          if (importResult === "ready") {
            importResult = "warning";
            severity = "warning";
          }
        }
      }

      if (input.context.attendanceLockedDates.has(punchDate)) {
        issues.push({
          code: "attendance_locked",
          employeeCode: punch.attendanceCode,
          message: `Attendance locked for ${punchDate}.`,
          punchIndex: previewPunches.length,
          severity: "blocking",
        });
        messages.push("Attendance locked");
        importResult = "blocked";
        severity = "blocking";
      }

      if (input.context.lockedPayrollDates.has(punchDate)) {
        issues.push({
          code: "payroll_locked",
          employeeCode: punch.attendanceCode,
          message: `Payroll locked for ${punchDate}.`,
          punchIndex: previewPunches.length,
          severity: "blocking",
        });
        messages.push("Payroll locked");
        importResult = "blocked";
        severity = "blocking";
      }

      if (isWeekend(punch.punchTime)) {
        issues.push({
          code: "weekend_rule",
          employeeCode: punch.attendanceCode,
          message: `Weekend punch on ${punchDate}.`,
          punchIndex: previewPunches.length,
          severity: "info",
        });
        messages.push("Weekend rule");
      }

      if (input.context.holidayDates.has(punchDate)) {
        issues.push({
          code: "holiday_policy",
          employeeCode: punch.attendanceCode,
          message: `Holiday punch on ${punchDate}.`,
          punchIndex: previewPunches.length,
          severity: "info",
        });
        messages.push("Holiday policy");
      }

      if (detectDstAmbiguity(punch.punchTime, input.context.timezone)) {
        issues.push({
          code: "dst_ambiguity",
          employeeCode: punch.attendanceCode,
          message: `Possible DST ambiguity for ${punch.punchTime}.`,
          punchIndex: previewPunches.length,
          severity: "warning",
        });
        messages.push("DST ambiguity");
        if (importResult === "ready") {
          importResult = "warning";
          severity = "warning";
        }
      }

      const workedMinutesEstimate = previewPunches
        .filter((row) => row.employeeId === employeeId && row.punchTime.slice(0, 10) === punchDate)
        .length;
      if (workedMinutesEstimate * 240 > input.context.maxDailyMinutes) {
        issues.push({
          code: "maximum_hours",
          employeeCode: punch.attendanceCode,
          message: `Maximum daily hours may be exceeded on ${punchDate}.`,
          punchIndex: previewPunches.length,
          severity: "warning",
        });
        messages.push("Maximum hours");
      }

      previewPunches.push({
        attendanceCode: punch.attendanceCode,
        deviceCode: punch.deviceCode,
        employeeId,
        employeeLabel,
        importResult,
        punchTime: punch.punchTime,
        punchType: punch.punchType,
        validationMessages: messages,
      });

      if (severity === "blocking" && importResult !== "blocked") {
        importResult = "blocked";
      }
    }

    const summary = this.buildSummary(input.deviceEmployees, previewPunches, issues);
    return { employees: input.deviceEmployees, issues, punches: previewPunches, summary };
  }

  private buildSummary(
    employees: readonly HrAttendanceDevicePreviewEmployee[],
    punches: readonly HrAttendanceDevicePreviewPunch[],
    issues: readonly HrAttendanceDeviceValidationIssue[],
  ): HrAttendanceDevicePreviewSummary {
    return {
      blockingErrors: issues.filter((issue) => issue.severity === "blocking").length,
      duplicates: punches.filter((punch) => punch.importResult === "duplicate").length,
      employeesMatched: employees.filter((employee) => employee.matchStatus === "matched").length,
      employeesNew: employees.filter((employee) => employee.matchStatus === "new").length,
      employeesRead: employees.length,
      employeesUnknown: employees.filter((employee) => employee.matchStatus === "unknown").length,
      employeesUpdated: employees.filter((employee) => employee.matchStatus === "updated").length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      estimatedImportSeconds: estimateImportSeconds(punches.filter((punch) => punch.importResult === "ready").length),
      punchesReady: punches.filter((punch) => punch.importResult === "ready").length,
      punchesRead: punches.length,
      warnings: issues.filter((issue) => issue.severity === "warning" || issue.severity === "info").length,
    };
  }
}

export type { RawDevicePunch, ValidationContext };
