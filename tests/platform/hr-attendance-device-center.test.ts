import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS,
  HR_ATTENDANCE_DEVICE_EVENT_KEYS,
  HR_ATTENDANCE_DEVICE_IMPORT_JOB_KEY,
  HR_ATTENDANCE_DEVICE_SYNC_JOB_KEY,
  HR_ATTENDANCE_DEVICE_SYNC_MODES,
  HR_ATTENDANCE_DEVICE_SYNC_PHASES,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES,
  HR_PERMISSIONS,
} from "@/features/hr/public-api";
import { HrAttendanceDeviceValidationService } from "@/features/hr/server-api";
import { computeDeviceHealthDimensions } from "@/features/hr/public-api";
import {
  buildSyncRecommendations,
  resolveDownloadWindow,
  validateStrategyConfig,
} from "@/features/hr/application/utils/hr-attendance-device-sync-strategy";

describe("HR Attendance Device Center", () => {
  test("exposes sync phases and background job keys", () => {
    assert.equal(HR_ATTENDANCE_DEVICE_SYNC_PHASES.length, 7);
    assert.equal(HR_ATTENDANCE_DEVICE_SYNC_JOB_KEY, "hr.attendance-device.sync");
    assert.equal(HR_ATTENDANCE_DEVICE_IMPORT_JOB_KEY, "hr.attendance-device.import");
  });

  test("exposes enterprise sync strategies and diagnostics", () => {
    assert.equal(HR_ATTENDANCE_DEVICE_SYNC_MODES.length, 10);
    assert.equal(HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES.length, 9);
    assert.ok(HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES.includes("incremental"));
    assert.ok(HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES.includes("force_resync"));
    assert.ok(HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS.includes("read_clock_drift"));
  });

  test("registers enterprise sync permissions", () => {
    assert.equal(HR_PERMISSIONS.attendanceDevicesSync, "hr.attendance.devices.sync");
    assert.equal(HR_PERMISSIONS.attendanceSync, "hr.attendance.sync");
    assert.equal(HR_PERMISSIONS.attendancePreview, "hr.attendance.preview");
    assert.equal(HR_PERMISSIONS.attendanceForceSync, "hr.attendance.force-sync");
    assert.equal(HR_PERMISSIONS.attendanceDevicesImportApprove, "hr.attendance.devices.import.approve");
    assert.equal(HR_PERMISSIONS.attendanceDevicesLogsView, "hr.attendance.devices.logs.view");
  });

  test("health dimensions compute overall score", () => {
    const dimensions = computeDeviceHealthDimensions({
      autoSyncInterval: "hourly",
      clockDriftSeconds: 10,
      connectionQuality: "good",
      firmwareVersion: "1.0.0",
      healthScore: "healthy",
      healthStatus: "online",
      lastHeartbeatAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      latencyMs: 40,
      memoryUsagePct: 30,
      pendingQueueCount: 2,
      storageUsagePct: 40,
    });

    assert.ok(dimensions.overallScorePercent >= 75);
    assert.equal(dimensions.network, "healthy");
    assert.equal(dimensions.queue, "healthy");
  });

  test("validation engine flags unknown employees and duplicate punches", () => {
    const service = new HrAttendanceDeviceValidationService();
    const preview = service.buildPreview({
      context: {
        attendanceLockedDates: new Set(),
        deviceBranchId: "branch-1",
        deviceCompanyId: "company-1",
        employeeBranchById: new Map([["employee-1", "branch-1"]]),
        employeeCompanyById: new Map([["employee-1", "company-1"]]),
        employeeStatusById: new Map([["employee-1", "active"]]),
        existingPunchKeys: new Set(["A001::2026-07-06T08:00:00.000Z::in"]),
        forceResync: false,
        holidayDates: new Set(),
        lockedPayrollDates: new Set(),
        mappedEmployeeByCode: new Map([["A001", "employee-1"]]),
        maxDailyMinutes: 960,
        now: new Date("2026-07-06T12:00:00.000Z"),
        skipDuplicates: true,
        timezone: "UTC",
      },
      deviceEmployees: [
        {
          attendanceCode: "A001",
          deviceCode: "A001",
          employeeId: "employee-1",
          employeeLabel: "Employee One",
          matchStatus: "matched",
        },
      ],
      employeeLabels: new Map([["employee-1", "Employee One"]]),
      punches: [
        {
          attendanceCode: "A001",
          deviceCode: "GATE-1",
          punchTime: "2026-07-06T08:00:00.000Z",
          punchType: "in",
        },
        {
          attendanceCode: "A001",
          deviceCode: "GATE-1",
          punchTime: "2026-07-06T08:00:00.000Z",
          punchType: "in",
        },
      ],
    });

    assert.ok(preview.summary.employeesMatched >= 1);
    assert.ok(preview.summary.duplicates >= 1);
    assert.ok(preview.issues.some((issue) => issue.code === "duplicate_punch"));
    assert.ok(preview.issues.some((issue) => issue.code === "unknown_employee") === false);
  });

  test("sync strategy resolver supports incremental and date range windows", () => {
    const incremental = resolveDownloadWindow({
      config: { options: { autoBuildPreview: true, dryRun: false, includeBreakPunches: true, includeCheckIn: true, includeCheckOut: true, includeDeviceEvents: false, includeInvalidPunches: false, includeManualPunches: true, recalculateAttendance: true, skipDuplicates: true }, params: {}, strategy: "incremental" },
      lastSuccessfulSyncAt: "2026-07-01T10:00:00.000Z",
      today: "2026-07-06",
    });
    assert.equal(incremental.dateFrom, "2026-07-01");

    const range = resolveDownloadWindow({
      config: {
        options: { autoBuildPreview: true, dryRun: false, includeBreakPunches: true, includeCheckIn: true, includeCheckOut: true, includeDeviceEvents: false, includeInvalidPunches: false, includeManualPunches: true, recalculateAttendance: true, skipDuplicates: true },
        params: { dateFrom: "2026-07-01", dateTo: "2026-07-05" },
        strategy: "date_range",
      },
      today: "2026-07-06",
    });
    assert.equal(range.dateFrom, "2026-07-01");
    assert.equal(range.dateTo, "2026-07-05");
    assert.equal(validateStrategyConfig({
      options: { autoBuildPreview: true, dryRun: false, includeBreakPunches: true, includeCheckIn: true, includeCheckOut: true, includeDeviceEvents: false, includeInvalidPunches: false, includeManualPunches: true, recalculateAttendance: true, skipDuplicates: true },
      params: { dateFrom: "2026-07-10", dateTo: "2026-07-01" },
      strategy: "date_range",
    }), "From date must be on or before to date.");
  });

  test("sync recommendations flag locked payroll periods", () => {
    const recommendations = buildSyncRecommendations({
      config: {
        options: { autoBuildPreview: true, dryRun: false, includeBreakPunches: true, includeCheckIn: true, includeCheckOut: true, includeDeviceEvents: false, includeInvalidPunches: false, includeManualPunches: true, recalculateAttendance: true, skipDuplicates: true },
        params: { dateFrom: "2026-07-01", dateTo: "2026-07-31" },
        strategy: "month",
      },
      hasInterruptedSession: false,
      lockedDatesInWindow: ["2026-07-15"],
      missingDates: [],
      window: { dateFrom: "2026-07-01", dateTo: "2026-07-31", forceResync: false },
    });
    assert.ok(recommendations.some((item) => item.code === "payroll_locked"));
  });

  test("notification event keys cover sync lifecycle and device alerts", () => {
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncStarted, "hr.attendance.device.sync.started");
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncCompleted, "hr.attendance.device.sync.completed");
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.syncCancelled, "hr.attendance.device.sync.cancelled");
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.deviceOffline, "hr.attendance.device.offline");
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.clockDrift, "hr.attendance.device.clock.drift");
    assert.equal(HR_ATTENDANCE_DEVICE_EVENT_KEYS.queueOverflow, "hr.attendance.device.queue.overflow");
  });
});
