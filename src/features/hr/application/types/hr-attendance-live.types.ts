import type {
  HR_ATTENDANCE_LIVE_EXCEPTION_PANEL_TYPES,
  HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS,
  HR_ATTENDANCE_LIVE_STATUSES,
} from "../constants/hr-attendance-live.constants";

export type HrAttendanceLiveRefreshInterval = (typeof HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS)[number];

export type HrAttendanceLiveStatus = (typeof HR_ATTENDANCE_LIVE_STATUSES)[number];

export type HrAttendanceLiveExceptionPanelType = (typeof HR_ATTENDANCE_LIVE_EXCEPTION_PANEL_TYPES)[number];

export type HrAttendanceLiveKpis = Readonly<{
  absent: number;
  activeDevices: number;
  checkedInToday: number;
  currentShiftCoveragePct: number;
  currentlyWorking: number;
  earlyLeave: number;
  employeesPresent: number;
  lateToday: number;
  missingCheckIn: number;
  missingCheckOut: number;
  offlineDevices: number;
  overtimeRunning: number;
  pendingDeviceImports: number;
  snapshotAt: string;
}>;

export type HrAttendanceLiveGpsLocation = Readonly<{
  accuracyMeters: number | null;
  capturedAt: string | null;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
}>;

export type HrAttendanceLiveGridRow = Readonly<{
  attendanceDayId: string | null;
  attendanceDeviceCode: string | null;
  attendanceDeviceLabel: string | null;
  branchLabel: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  departmentLabel: string | null;
  earlyLeaveMinutes: number;
  employeeCode: string;
  employeeId: string;
  employeeLabel: string;
  lastDeviceSyncAt: string | null;
  lateMinutes: number;
  liveStatus: HrAttendanceLiveStatus;
  location: HrAttendanceLiveGpsLocation | null;
  managerLabel: string | null;
  overtimeMinutes: number;
  photoInitials: string;
  positionLabel: string | null;
  shiftLabel: string | null;
  workedMinutes: number;
}>;

export type HrAttendanceLiveExceptionRecord = Readonly<{
  employeeId: string;
  employeeLabel: string;
  exceptionId: string;
  exceptionType: string;
  panelType: HrAttendanceLiveExceptionPanelType;
  severity: string;
  status: string;
  workDate: string;
}>;

export type HrAttendanceLiveAlert = Readonly<{
  alertKey: string;
  body: string;
  createdAt: string;
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
}>;

export type HrAttendanceLiveEmployeeDrawer = Readonly<{
  assignmentSummary: string | null;
  attendanceCalculationSummary: string | null;
  documentsCount: number;
  employeeCode: string;
  employeeId: string;
  employeeLabel: string;
  lateRulesSummary: string | null;
  leaveStatus: string | null;
  managerLabel: string | null;
  overtimeSummary: string | null;
  payrollImpactSummary: string | null;
  previousWeekPunches: readonly { label: string; punchTime: string; punchType: string }[];
  shiftSummary: string | null;
  timelineToday: readonly { label: string; punchTime: string; punchType: string }[];
  warningsCount: number;
}>;

export type HrAttendanceLiveWorkspaceData = Readonly<{
  alerts: readonly HrAttendanceLiveAlert[];
  branchOptions: readonly { id: string; label: string }[];
  defaultRefreshIntervalSeconds: HrAttendanceLiveRefreshInterval;
  departmentOptions: readonly { id: string; label: string }[];
  deviceOptions: readonly { id: string; label: string }[];
  exceptions: readonly HrAttendanceLiveExceptionRecord[];
  kpis: HrAttendanceLiveKpis;
  liveStatusOptions: readonly HrAttendanceLiveStatus[];
  managerOptions: readonly { id: string; label: string }[];
  nextCursor: string | null;
  pageSize: number;
  records: readonly HrAttendanceLiveGridRow[];
  shiftOptions: readonly { id: string; label: string }[];
  snapshotAt: string;
}>;

export type HrAttendanceLiveRefreshPayload = Readonly<{
  alerts: readonly HrAttendanceLiveAlert[];
  exceptions: readonly HrAttendanceLiveExceptionRecord[];
  kpis: HrAttendanceLiveKpis;
  nextCursor: string | null;
  records: readonly HrAttendanceLiveGridRow[];
  snapshotAt: string;
}>;
