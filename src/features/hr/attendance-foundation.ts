import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS } from "./application/constants/hr-attendance-payroll.constants";
import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrAttendancePunchType = "in" | "out" | "break_in" | "break_out" | "unknown";

export type HrAttendancePunchSource =
  | "biometric_device"
  | "manual_entry"
  | "excel_import"
  | "api_import"
  | "mobile_punch"
  | "admin_correction";

export type HrAttendancePunchStatus = "imported" | "normalized" | "ignored" | "duplicate";

export type HrAttendanceRawEventType =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end"
  | "unknown"
  | "duplicate"
  | "ignored";

export type HrAttendanceDayStatus =
  | "pending"
  | "observed"
  | "needs_review"
  | "approved"
  | "rejected"
  | "locked"
  | "exported_to_payroll";

export type HrAttendanceExceptionType =
  | "missing_punch_in"
  | "missing_punch_out"
  | "duplicate_punch"
  | "out_of_schedule"
  | "late_arrival"
  | "early_leave"
  | "possible_absence"
  | "holiday_work"
  | "overtime_requires_approval"
  | "device_mismatch"
  | "profile_missing"
  | "schedule_missing";

export type HrAttendanceExceptionSeverity = "low" | "medium" | "high" | "critical";

export type HrAttendanceExceptionStatus = "open" | "in_review" | "resolved" | "dismissed";

export type HrAttendanceAdjustmentType =
  | "add_punch"
  | "correct_punch"
  | "ignore_punch"
  | "approve_overtime"
  | "approve_holiday_work"
  | "mark_mission"
  | "mark_training"
  | "mark_leave"
  | "mark_absence_excused";

export type HrAttendanceReviewQueueItemType =
  | "attendance_exception"
  | "missing_punch"
  | "overtime_approval_needed"
  | "holiday_work_approval_needed"
  | "profile_schedule_mismatch"
  | "device_mismatch";

export type HrAttendanceReviewQueueStatus = "pending" | "assigned" | "in_review" | "resolved" | "dismissed";

export type HrAttendanceLockLevel = "unlocked" | "review_locked" | "payroll_locked";

export type HrAttendanceScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type AttendancePunchLog = HrAttendanceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  deviceId?: string | null;
  punchTime: string;
  punchType: HrAttendancePunchType;
  source: HrAttendancePunchSource;
  rawPayload?: Readonly<Record<string, unknown>>;
  importedAt: string;
  correlationId?: string | null;
  status: HrAttendancePunchStatus;
  appendOnly: true;
}>;

export type AttendanceRawEvent = HrAttendanceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  eventTime: string;
  eventType: HrAttendanceRawEventType;
  sourcePunchLogId: string;
  source: HrAttendancePunchSource;
  confidence?: number | null;
  status: HrAttendancePunchStatus;
}>;

export type AttendanceExpectedVsActualMetadata = Readonly<{
  shiftScheduleRef?: string | null;
  shiftScheduleLineRef?: string | null;
  shiftVersionRef?: string | null;
  expectedStart?: string | null;
  expectedEnd?: string | null;
  actualFirstIn?: string | null;
  actualLastOut?: string | null;
  missingIn?: boolean | null;
  missingOut?: boolean | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  overtimeMinutes?: number | null;
  absenceFlag?: boolean | null;
  holidayWorkFlag?: boolean | null;
  nightShiftFlag?: boolean | null;
  runtimeCalculationImplemented: false;
}>;

export type AttendanceCalculatedDay = HrAttendanceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  workDate: string;
  status: HrAttendanceDayStatus;
  expectedVsActual: AttendanceExpectedVsActualMetadata;
  attendancePolicyVersionRef?: string | null;
  workforceRefs?: Readonly<{
    shiftScheduleId?: string | null;
    shiftScheduleLineId?: string | null;
    shiftVersionId?: string | null;
    holidayCalendarId?: string | null;
    workforceAssignmentId?: string | null;
  }>;
  calculationRuntimeImplemented: false;
}>;

export type AttendanceObservation = Readonly<{
  key: string;
  punchLogId: string;
  rawEventIds: readonly string[];
  attendanceDayId?: string | null;
  observedAt: string;
  observationOnly: true;
}>;

export type AttendanceException = HrAttendanceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  attendanceDayId: string;
  exceptionType: HrAttendanceExceptionType;
  severity: HrAttendanceExceptionSeverity;
  source: string;
  status: HrAttendanceExceptionStatus;
  reviewerEmployeeId?: string | null;
  resolutionReference?: string | null;
}>;

export type AttendanceAdjustment = HrAttendanceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  attendanceDayId: string;
  adjustmentType: HrAttendanceAdjustmentType;
  hrActionDocumentRef?: string | null;
  punchLogRef?: string | null;
  reason?: string | null;
  workflowRuntimeImplemented: false;
}>;

export type AttendanceApprovalReadiness = Readonly<{
  key: string;
  stages: readonly ["employee_request_correction", "manager_review", "hr_approval", "attendance_recalculation"];
  workflowRuntimeImplemented: false;
  hrActionDocumentReady: true;
}>;

export type AttendancePayrollSnapshotReadiness = Readonly<{
  key: string;
  owner: "attendance";
  snapshotFields: readonly [
    "approvedAttendanceDayId",
    "workedMinutes",
    "lateMinutes",
    "earlyLeaveMinutes",
    "absenceFlag",
    "overtimeMinutes",
    "holidayWorkMinutes",
    "sourceCalculationVersion",
    "approvalStatus",
    "lockStatus",
  ];
  payrollRuntimeImplemented: true;
  retroAdjustmentRequiredAfterPayrollLock: true;
}>;

export type HrAttendanceLockReadiness = Readonly<{
  key: string;
  lockLevels: readonly HrAttendanceLockLevel[];
  payrollLockRuntimeImplemented: true;
  retroAdjustmentAfterPayrollLock: true;
}>;

export type HrAttendanceEngineBoundaryContract = Readonly<{
  key: string;
  workforceOwnsExpectedSchedule: true;
  attendanceOwnsObservedFacts: true;
  payrollOwnsPaidResults: true;
  punchLogsAppendOnly: true;
  deviceLogsNeverOverwritten: true;
  policyLogicDuplicatedInAttendance: false;
  policyResultsCalculatedInAttendance: false;
  fullAttendanceCalculationImplemented: false;
  biometricSynchronizationImplemented: false;
  payrollCalculationImplemented: false;
  workflowRuntimeImplemented: false;
}>;

export type HrAttendancePolicyIntegrationContract = Readonly<{
  key: string;
  policyRefsOnly: true;
  consumingPolicyTypes: readonly [
    "attendance",
    "shift",
    "overtime",
    "leave",
  ];
  supportedRuleCategories: readonly [
    "grace_period",
    "late_rules",
    "early_leave_rules",
    "absence_rules",
    "overtime_eligibility",
    "holiday_work_rules",
    "missing_punch_rules",
  ];
  runtimePolicyEvaluationImplemented: false;
}>;

export type HrAttendanceWorkforceIntegrationContract = Readonly<{
  key: string;
  attendanceNeverOwnsPlannedSchedules: true;
  workforceReferences: readonly [
    "shift_schedule",
    "shift_schedule_line",
    "shift_version",
    "holiday_calendar",
    "workforce_assignment",
  ];
  runtimeScheduleResolutionImplemented: false;
}>;

export function defineAttendancePunchLog<T extends AttendancePunchLog>(definition: T): T {
  return definition;
}

export function defineAttendanceRawEvent<T extends AttendanceRawEvent>(definition: T): T {
  return definition;
}

export function defineAttendanceCalculatedDay<T extends AttendanceCalculatedDay>(definition: T): T {
  return definition;
}

export function defineAttendanceException<T extends AttendanceException>(definition: T): T {
  return definition;
}

export function defineAttendanceAdjustment<T extends AttendanceAdjustment>(definition: T): T {
  return definition;
}

export function createAttendancePayrollSnapshotReadinessInput(input: {
  approvedAttendanceDayId: string;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  absenceFlag?: boolean | null;
  overtimeMinutes?: number | null;
  holidayWorkMinutes?: number | null;
  sourceCalculationVersion?: string | null;
  approvalStatus: HrAttendanceDayStatus;
  lockStatus: HrAttendanceLockLevel;
}): Readonly<{
  approvedAttendanceDayId: string;
  workedMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  absenceFlag: boolean | null;
  overtimeMinutes: number | null;
  holidayWorkMinutes: number | null;
  sourceCalculationVersion: string | null;
  approvalStatus: HrAttendanceDayStatus;
  lockStatus: HrAttendanceLockLevel;
}> {
  return {
    absenceFlag: input.absenceFlag ?? null,
    approvalStatus: input.approvalStatus,
    approvedAttendanceDayId: input.approvedAttendanceDayId,
    earlyLeaveMinutes: input.earlyLeaveMinutes ?? null,
    holidayWorkMinutes: input.holidayWorkMinutes ?? null,
    lateMinutes: input.lateMinutes ?? null,
    lockStatus: input.lockStatus,
    overtimeMinutes: input.overtimeMinutes ?? null,
    sourceCalculationVersion: input.sourceCalculationVersion ?? null,
    workedMinutes: input.workedMinutes ?? null,
  };
}

export function createExpectedVsActualMetadata(
  input: Omit<AttendanceExpectedVsActualMetadata, "runtimeCalculationImplemented">,
): AttendanceExpectedVsActualMetadata {
  return {
    ...input,
    runtimeCalculationImplemented: false,
  };
}

export const HR_ATTENDANCE_PUNCH_TYPES = [
  "in",
  "out",
  "break_in",
  "break_out",
  "unknown",
] as const satisfies readonly HrAttendancePunchType[];

export const HR_ATTENDANCE_EXCEPTION_TYPES = [
  "missing_punch_in",
  "missing_punch_out",
  "duplicate_punch",
  "out_of_schedule",
  "late_arrival",
  "early_leave",
  "possible_absence",
  "holiday_work",
  "overtime_requires_approval",
  "device_mismatch",
  "profile_missing",
  "schedule_missing",
] as const satisfies readonly HrAttendanceExceptionType[];

export const HR_ATTENDANCE_DAY_STATUSES = [
  "pending",
  "observed",
  "needs_review",
  "approved",
  "rejected",
  "locked",
  "exported_to_payroll",
] as const satisfies readonly HrAttendanceDayStatus[];

export const HR_ATTENDANCE_ADJUSTMENT_TYPES = [
  "add_punch",
  "correct_punch",
  "ignore_punch",
  "approve_overtime",
  "approve_holiday_work",
  "mark_mission",
  "mark_training",
  "mark_leave",
  "mark_absence_excused",
] as const satisfies readonly HrAttendanceAdjustmentType[];

export const HR_ATTENDANCE_ENGINE_BOUNDARY_CONTRACT: HrAttendanceEngineBoundaryContract = {
  attendanceOwnsObservedFacts: true,
  biometricSynchronizationImplemented: false,
  deviceLogsNeverOverwritten: true,
  fullAttendanceCalculationImplemented: false,
  key: "hr.attendance.foundation.boundary",
  payrollCalculationImplemented: false,
  payrollOwnsPaidResults: true,
  policyLogicDuplicatedInAttendance: false,
  policyResultsCalculatedInAttendance: false,
  punchLogsAppendOnly: true,
  workflowRuntimeImplemented: false,
  workforceOwnsExpectedSchedule: true,
};

export const HR_ATTENDANCE_POLICY_INTEGRATION_CONTRACT: HrAttendancePolicyIntegrationContract = {
  consumingPolicyTypes: ["attendance", "shift", "overtime", "leave"],
  key: "hr.attendance.policy-integration",
  policyRefsOnly: true,
  runtimePolicyEvaluationImplemented: false,
  supportedRuleCategories: [
    "grace_period",
    "late_rules",
    "early_leave_rules",
    "absence_rules",
    "overtime_eligibility",
    "holiday_work_rules",
    "missing_punch_rules",
  ],
};

export const HR_ATTENDANCE_WORKFORCE_INTEGRATION_CONTRACT: HrAttendanceWorkforceIntegrationContract = {
  attendanceNeverOwnsPlannedSchedules: true,
  key: "hr.attendance.workforce-integration",
  runtimeScheduleResolutionImplemented: false,
  workforceReferences: [
    "shift_schedule",
    "shift_schedule_line",
    "shift_version",
    "holiday_calendar",
    "workforce_assignment",
  ],
};

export const HR_ATTENDANCE_APPROVAL_READINESS: AttendanceApprovalReadiness = {
  hrActionDocumentReady: true,
  key: "hr.attendance.missing-punch-workflow-readiness",
  stages: ["employee_request_correction", "manager_review", "hr_approval", "attendance_recalculation"],
  workflowRuntimeImplemented: false,
};

export const HR_ATTENDANCE_PAYROLL_SNAPSHOT_READINESS: AttendancePayrollSnapshotReadiness = {
  key: "hr.attendance.payroll-snapshot-readiness",
  owner: "attendance",
  payrollRuntimeImplemented: true,
  retroAdjustmentRequiredAfterPayrollLock: true,
  snapshotFields: [
    "approvedAttendanceDayId",
    "workedMinutes",
    "lateMinutes",
    "earlyLeaveMinutes",
    "absenceFlag",
    "overtimeMinutes",
    "holidayWorkMinutes",
    "sourceCalculationVersion",
    "approvalStatus",
    "lockStatus",
  ],
};

export const HR_ATTENDANCE_LOCK_READINESS: HrAttendanceLockReadiness = {
  key: "hr.attendance.lock-readiness",
  lockLevels: ["unlocked", "review_locked", "payroll_locked"],
  payrollLockRuntimeImplemented: true,
  retroAdjustmentAfterPayrollLock: true,
};

export const HR_ATTENDANCE_REVIEW_QUEUE_READINESS = {
  itemTypes: [
    "attendance_exception",
    "missing_punch",
    "overtime_approval_needed",
    "holiday_work_approval_needed",
    "profile_schedule_mismatch",
    "device_mismatch",
  ] as const satisfies readonly HrAttendanceReviewQueueItemType[],
  key: "hr.attendance.review-queue-readiness",
  runtimeUiImplemented: true as const,
  scopedAndPermissionAware: true as const,
};

const hrAttendanceImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: true,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_ATTENDANCE_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeNumber", label: "Employee Number", required: true },
    { dataType: "datetime", key: "punchTime", label: "Punch Time", required: true },
    { dataType: "text", key: "punchType", label: "Punch Type", required: true },
    { dataType: "text", key: "source", label: "Source" },
    { dataType: "text", key: "deviceCode", label: "Device Code" },
  ],
  key: "hr.attendance.import",
  label: "HR Attendance Punch Import",
  mappings: [
    { key: "employee-number", sourceColumn: "Employee Number", targetField: "employeeNumber" },
    { key: "punch-time", sourceColumn: "Punch Time", targetField: "punchTime" },
    { key: "punch-type", sourceColumn: "Punch Type", targetField: "punchType" },
    { key: "source", sourceColumn: "Source", targetField: "source" },
    { key: "device-code", sourceColumn: "Device Code", targetField: "deviceCode" },
  ],
  maxFileSizeBytes: 50_000_000,
  metadata: { appendOnly: true, foundationOnly: true, biometricSyncImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.attendanceImport,
  requiresAsync: true,
  security: hrAttendanceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "employeeNumber", key: "employee-number-required", message: "Employee number is required.", severity: "error", type: "required" },
    { fieldKey: "punchTime", key: "punch-time-required", message: "Punch time is required.", severity: "error", type: "required" },
    { fieldKey: "punchType", key: "punch-type-required", message: "Punch type is required.", severity: "error", type: "required" },
  ],
});

export const HR_ATTENDANCE_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "date", key: "workDate", label: "Work Date", order: 1, sourceField: "workDate" },
    { dataType: "text", key: "employeeNumber", label: "Employee Number", order: 2, sourceField: "employeeNumber", sensitive: true, pii: true },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
    { dataType: "text", key: "lockLevel", label: "Lock Level", order: 4, sourceField: "lockLevel" },
  ],
  key: "hr.attendance.export",
  label: "HR Attendance Foundation Export",
  mappings: [
    { key: "work-date", sourceField: "workDate", targetColumn: "Work Date" },
    { key: "employee-number", sourceField: "employeeNumber", targetColumn: "Employee Number" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
    { key: "lock-level", sourceField: "lockLevel", targetColumn: "Lock Level" },
  ],
  metadata: {
    fileNameTemplate: "hr-attendance-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrAttendanceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_ATTENDANCE_EVENT_DEFINITIONS = [
  "AttendancePunchImported",
  "AttendanceRawEventCreated",
  "AttendanceDayObserved",
  "AttendanceExceptionCreated",
  "AttendanceExceptionResolved",
  "AttendanceAdjustmentRequested",
  "AttendanceAdjustmentApproved",
  "AttendanceDayApproved",
  "AttendanceDayLocked",
  "AttendanceExportedToPayroll",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Attendance Engine Foundation. No payroll or biometric runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_ATTENDANCE_AUDIT_ACTIONS = {
  ...HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS,
  adjustmentApproved: defineAuditAction("hr.attendance.adjustment.approved"),
  adjustmentRequested: defineAuditAction("hr.attendance.adjustment.requested"),
  dayApproved: defineAuditAction("hr.attendance.day.approved"),
  dayLocked: defineAuditAction("hr.attendance.day.locked"),
  dayObserved: defineAuditAction("hr.attendance.day.observed"),
  exceptionCreated: defineAuditAction("hr.attendance.exception.created"),
  exceptionResolved: defineAuditAction("hr.attendance.exception.resolved"),
  exportedToPayroll: defineAuditAction("hr.attendance.exported-to-payroll"),
  punchImported: defineAuditAction("hr.attendance.punch.imported"),
  rawEventCreated: defineAuditAction("hr.attendance.raw-event.created"),
} as const;

export const HR_ATTENDANCE_FOUNDATION_TABLES = [
  "hr_attendance_punch_logs",
  "hr_attendance_raw_events",
  "hr_attendance_days",
  "hr_attendance_exceptions",
  "hr_attendance_adjustment_refs",
  "hr_attendance_review_queue",
  "hr_attendance_locks",
] as const;

export const HR_ATTENDANCE_PAYROLL_EXPORT_TABLES = [
  "hr_attendance_closings",
  "hr_attendance_payroll_export_batches",
  "hr_attendance_payroll_snapshots",
] as const;
