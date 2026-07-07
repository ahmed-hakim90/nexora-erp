import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrWorkforceRecordStatus = "draft" | "active" | "inactive" | "archived";

export type HrWorkCalendarType = "company" | "branch" | "department" | "production";

export type HrShiftKind =
  | "morning"
  | "evening"
  | "night"
  | "24_hour"
  | "12_hour"
  | "split"
  | "flexible"
  | "custom";

export type HrShiftRotationCadence = "weekly" | "bi_weekly" | "monthly" | "custom";

export type HrHolidayType =
  | "national"
  | "company"
  | "branch"
  | "factory_shutdown"
  | "emergency_closure"
  | "half_day"
  | "recurring";

export type HrAttendanceDeviceType =
  | "zkteco"
  | "suprema"
  | "anviz"
  | "fingertec"
  | "cloud_attendance"
  | "excel_import"
  | "api_import";

export type HrWorkforceAvailabilityState =
  | "available"
  | "shift_assigned"
  | "leave"
  | "training"
  | "mission"
  | "suspended"
  | "holiday"
  | "unavailable";

export type HrWorkforceAssignmentType =
  | "temporary_department"
  | "temporary_branch"
  | "temporary_production_line"
  | "temporary_supervisor"
  | "temporary_work_location"
  | "temporary_shift";

export type HrWorkforceScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrWorkWeekDefinition = Readonly<{
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}>;

export type HrWorkCalendarDefinition = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  calendarType: HrWorkCalendarType;
  timezone: string;
  workWeek: HrWorkWeekDefinition;
  departmentId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftDefinitionIdentity = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  shiftKind: HrShiftKind;
  description?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftVersionDefinition = HrWorkforceScope & Readonly<{
  shiftId: string;
  version: number;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  paidBreakMinutes: number;
  unpaidBreakMinutes: number;
  totalPlannedHours: number;
  gracePeriodMinutes: number;
  overtimeEligible: boolean;
  shiftPolicyVersionRef?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftTemplateDefinition = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  weeklyPattern: readonly number[];
  defaultRestDays: readonly number[];
  rotationReady: boolean;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftTemplateLineDefinition = HrWorkforceScope & Readonly<{
  shiftTemplateId: string;
  dayOfWeek: number;
  shiftVersionId: string;
  isRestDay: boolean;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftRotationDefinition = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  cadence: HrShiftRotationCadence;
  patternWeeks: readonly string[];
  repeatFromWeekIndex: number;
  description?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftScheduleDefinition = HrWorkforceScope & Readonly<{
  employmentProfileId: string;
  employeeId: string;
  shiftTemplateId?: string | null;
  shiftRotationId?: string | null;
  workCalendarId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrShiftScheduleLineDefinition = HrWorkforceScope & Readonly<{
  shiftScheduleId: string;
  weekIndex: number;
  dayOfWeek: number;
  shiftVersionId?: string | null;
  isRestDay: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrWorkforceAssignmentDefinition = HrWorkforceScope & Readonly<{
  employmentProfileId: string;
  employeeId: string;
  assignmentType: HrWorkforceAssignmentType;
  targetDepartmentId?: string | null;
  targetBranchId?: string | null;
  targetProductionLineRef?: string | null;
  targetSupervisorEmployeeId?: string | null;
  targetWorkLocationId?: string | null;
  targetShiftScheduleId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string | null;
  approvalDocumentRef?: string | null;
  timelineEventReadiness: true;
  status: HrWorkforceRecordStatus;
}>;

export type HrHolidayCalendarDefinition = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  workCalendarId?: string | null;
  calendarScope: HrWorkCalendarType | "national";
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrHolidayDefinition = HrWorkforceScope & Readonly<{
  holidayCalendarId: string;
  holidayType: HrHolidayType;
  name: string;
  holidayDate?: string | null;
  isHalfDay: boolean;
  recurringRule?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforceRecordStatus;
}>;

export type HrAttendanceDeviceDefinition = HrWorkforceScope & Readonly<{
  code: string;
  name: string;
  workLocationId?: string | null;
  ipAddress?: string | null;
  timezone: string;
  deviceType: HrAttendanceDeviceType;
  lastSyncAt?: string | null;
  synchronizationRuntimeImplemented: false;
  status: HrWorkforceRecordStatus;
}>;

export type HrWorkforceAvailabilityContract = Readonly<{
  key: string;
  states: readonly HrWorkforceAvailabilityState[];
  runtimeEvaluationImplemented: false;
}>;

export type HrWorkforcePlanningReadiness = Readonly<{
  key: string;
  metadataFields: readonly [
    "planned_headcount",
    "actual_headcount",
    "coverage",
    "vacancies",
    "required_skills",
    "production_coverage",
  ];
  runtimeCalculationImplemented: false;
}>;

export type HrWorkforceManufacturingReadiness = Readonly<{
  key: string;
  supportedFutureReferences: readonly [
    "production_line",
    "work_center",
    "machine_group",
    "operation",
    "production_calendar",
  ];
  manufacturingDependencyImplemented: false;
  runtimeSchedulingImplemented: false;
}>;

export type HrWorkforceEngineBoundaryContract = Readonly<{
  key: string;
  workforcePlansWhenEmployeeExpectedToWork: true;
  attendanceObservesWhatHappened: true;
  payrollPaysWhatGetsPaid: true;
  attendanceCalculationImplemented: false;
  biometricSynchronizationImplemented: false;
  schedulerRuntimeImplemented: false;
  mixesWorkforceWithAttendanceRecords: false;
}>;

export type HrWorkforceEffectiveDatingContract = Readonly<{
  key: string;
  owner: "workforce";
  effectiveDatedEntities: readonly [
    "hr_work_calendars",
    "hr_shift_versions",
    "hr_shift_template_lines",
    "hr_shift_schedules",
    "hr_shift_schedule_lines",
    "hr_workforce_assignments",
    "hr_holidays",
  ];
  oneActiveShiftSchedulePerEmployeeDateRange: true;
  historicalVersionsMutableByDirectEdit: false;
  historicalVersionsRequireSupersedingVersion: true;
}>;

export function defineHrWorkCalendar<T extends HrWorkCalendarDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftDefinition<T extends HrShiftDefinitionIdentity>(definition: T): T {
  return definition;
}

export function defineHrShiftVersion<T extends HrShiftVersionDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftTemplate<T extends HrShiftTemplateDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftTemplateLine<T extends HrShiftTemplateLineDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftRotation<T extends HrShiftRotationDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftSchedule<T extends HrShiftScheduleDefinition>(definition: T): T {
  return definition;
}

export function defineHrShiftScheduleLine<T extends HrShiftScheduleLineDefinition>(definition: T): T {
  return definition;
}

export function defineHrWorkforceAssignment<T extends HrWorkforceAssignmentDefinition>(definition: T): T {
  return definition;
}

export function defineHrHolidayCalendar<T extends HrHolidayCalendarDefinition>(definition: T): T {
  return definition;
}

export function defineHrHoliday<T extends HrHolidayDefinition>(definition: T): T {
  return definition;
}

export function defineHrAttendanceDevice<T extends HrAttendanceDeviceDefinition>(definition: T): T {
  return definition;
}

export function shiftVersionAppliesOn(
  version: Pick<HrShiftVersionDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (version.status !== "active") {
    return false;
  }

  return version.effectiveFrom <= effectiveDate && (version.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export function shiftScheduleAppliesOn(
  schedule: Pick<HrShiftScheduleDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (schedule.status !== "active") {
    return false;
  }

  return schedule.effectiveFrom <= effectiveDate && (schedule.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export function shiftSchedulesOverlap(
  first: Pick<HrShiftScheduleDefinition, "employeeId" | "effectiveFrom" | "effectiveTo" | "status">,
  second: Pick<HrShiftScheduleDefinition, "employeeId" | "effectiveFrom" | "effectiveTo" | "status">,
): boolean {
  if (first.employeeId !== second.employeeId || first.status !== "active" || second.status !== "active") {
    return false;
  }

  const firstEnd = first.effectiveTo ?? "9999-12-31";
  const secondEnd = second.effectiveTo ?? "9999-12-31";

  return first.effectiveFrom <= secondEnd && second.effectiveFrom <= firstEnd;
}

export function workforceAssignmentAppliesOn(
  assignment: Pick<HrWorkforceAssignmentDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (assignment.status !== "active") {
    return false;
  }

  return assignment.effectiveFrom <= effectiveDate && (assignment.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export const HR_SHIFT_KINDS = [
  "morning",
  "evening",
  "night",
  "24_hour",
  "12_hour",
  "split",
  "flexible",
  "custom",
] as const satisfies readonly HrShiftKind[];

export const HR_SHIFT_KIND_DEFINITIONS = [
  { shiftKind: "morning", label: "Morning" },
  { shiftKind: "evening", label: "Evening" },
  { shiftKind: "night", label: "Night" },
  { shiftKind: "24_hour", label: "24-hour" },
  { shiftKind: "12_hour", label: "12-hour" },
  { shiftKind: "split", label: "Split Shift" },
  { shiftKind: "flexible", label: "Flexible" },
  { shiftKind: "custom", label: "Custom" },
] as const;

export const HR_SHIFT_TEMPLATE_EXAMPLES = [
  { code: "FACTORY_DAY", name: "Factory Day Shift" },
  { code: "FACTORY_NIGHT", name: "Factory Night Shift" },
  { code: "OFFICE", name: "Office" },
  { code: "WAREHOUSE", name: "Warehouse" },
  { code: "SUPERVISOR", name: "Supervisor" },
] as const;

export const HR_SHIFT_ROTATION_EXAMPLES = [
  { code: "ABC_WEEKLY", name: "Week A → Week B → Week C → Repeat", patternWeeks: ["Week A", "Week B", "Week C"] },
] as const;

export const HR_ATTENDANCE_DEVICE_TYPES = [
  "zkteco",
  "suprema",
  "anviz",
  "fingertec",
  "cloud_attendance",
  "excel_import",
  "api_import",
] as const satisfies readonly HrAttendanceDeviceType[];

export const HR_WORKFORCE_AVAILABILITY_CONTRACT: HrWorkforceAvailabilityContract = {
  key: "hr.workforce.availability",
  runtimeEvaluationImplemented: false,
  states: [
    "available",
    "shift_assigned",
    "leave",
    "training",
    "mission",
    "suspended",
    "holiday",
    "unavailable",
  ],
};

export const HR_WORKFORCE_PLANNING_READINESS: HrWorkforcePlanningReadiness = {
  key: "hr.workforce.planning-readiness",
  metadataFields: [
    "planned_headcount",
    "actual_headcount",
    "coverage",
    "vacancies",
    "required_skills",
    "production_coverage",
  ],
  runtimeCalculationImplemented: false,
};

export const HR_WORKFORCE_MANUFACTURING_READINESS: HrWorkforceManufacturingReadiness = {
  key: "hr.workforce.manufacturing-readiness",
  manufacturingDependencyImplemented: false,
  runtimeSchedulingImplemented: false,
  supportedFutureReferences: [
    "production_line",
    "work_center",
    "machine_group",
    "operation",
    "production_calendar",
  ],
};

export const HR_WORKFORCE_ENGINE_BOUNDARY_CONTRACT: HrWorkforceEngineBoundaryContract = {
  attendanceCalculationImplemented: false,
  attendanceObservesWhatHappened: true,
  biometricSynchronizationImplemented: false,
  key: "hr.workforce.foundation.boundary",
  mixesWorkforceWithAttendanceRecords: false,
  payrollPaysWhatGetsPaid: true,
  schedulerRuntimeImplemented: false,
  workforcePlansWhenEmployeeExpectedToWork: true,
};

export const HR_WORKFORCE_EFFECTIVE_DATING_CONTRACT: HrWorkforceEffectiveDatingContract = {
  effectiveDatedEntities: [
    "hr_work_calendars",
    "hr_shift_versions",
    "hr_shift_template_lines",
    "hr_shift_schedules",
    "hr_shift_schedule_lines",
    "hr_workforce_assignments",
    "hr_holidays",
  ],
  historicalVersionsMutableByDirectEdit: false,
  historicalVersionsRequireSupersedingVersion: true,
  key: "hr.workforce.effective-dating",
  oneActiveShiftSchedulePerEmployeeDateRange: true,
  owner: "workforce",
};

const hrWorkforceImportExportSecurity = {
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

export const HR_WORKFORCE_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "date", key: "effectiveFrom", label: "Effective From" },
    { dataType: "date", key: "effectiveTo", label: "Effective To" },
  ],
  key: "hr.workforce.import",
  label: "HR Workforce Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "effective-from", sourceColumn: "Effective From", targetField: "effectiveFrom" },
    { key: "effective-to", sourceColumn: "Effective To", targetField: "effectiveTo" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, runtimeSchedulingImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkforceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "workforce-code-required", message: "Workforce code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "workforce-name-required", message: "Workforce name is required.", severity: "error", type: "required" },
  ],
});

export const HR_WORKFORCE_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name", sensitive: true, pii: true },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.workforce.export",
  label: "HR Workforce Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-workforce-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkforceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_WORKFORCE_EVENT_DEFINITIONS = [
  "WorkCalendarCreated",
  "ShiftCreated",
  "ShiftVersionCreated",
  "ShiftAssigned",
  "ShiftScheduleCreated",
  "ShiftRotationAssigned",
  "HolidayCreated",
  "AssignmentCreated",
  "DeviceRegistered",
  "AvailabilityChanged",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Workforce Engine Foundation. No attendance runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_WORKFORCE_AUDIT_ACTIONS = {
  assignmentCreated: defineAuditAction("hr.workforce.assignment.created"),
  availabilityChanged: defineAuditAction("hr.workforce.availability.changed"),
  deviceRegistered: defineAuditAction("hr.workforce.device.registered"),
  holidayCreated: defineAuditAction("hr.workforce.holiday.created"),
  shiftAssigned: defineAuditAction("hr.workforce.shift.assigned"),
  shiftCreated: defineAuditAction("hr.workforce.shift.created"),
  shiftRotationAssigned: defineAuditAction("hr.workforce.shift-rotation.assigned"),
  shiftScheduleCreated: defineAuditAction("hr.workforce.shift-schedule.created"),
  shiftVersionCreated: defineAuditAction("hr.workforce.shift.version.created"),
  workCalendarCreated: defineAuditAction("hr.workforce.calendar.created"),
} as const;

export const HR_WORKFORCE_FOUNDATION_TABLES = [
  "hr_work_calendars",
  "hr_shift_definitions",
  "hr_shift_versions",
  "hr_shift_templates",
  "hr_shift_template_lines",
  "hr_shift_rotations",
  "hr_shift_schedules",
  "hr_shift_schedule_lines",
  "hr_workforce_assignments",
  "hr_holiday_calendars",
  "hr_holidays",
  "hr_attendance_devices",
] as const;
