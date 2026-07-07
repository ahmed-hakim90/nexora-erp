import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  HR_ATTENDANCE_LIVE_AUDIT_ACTIONS,
  HR_ATTENDANCE_LIVE_EVENT_KEYS,
  HR_ATTENDANCE_LIVE_JOB_KEYS,
  HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS,
  HR_ATTENDANCE_LIVE_STATUSES,
  HR_PERMISSIONS,
  hrAttendanceLiveListQuerySchema,
  hrAttendanceLiveSupervisorActionSchema,
} from "@/features/hr/public-api";

describe("HR Attendance Live Monitor", () => {
  test("registers live monitor permissions", () => {
    assert.equal(HR_PERMISSIONS.attendanceMonitorView, "hr.attendance.monitor.view");
    assert.equal(HR_PERMISSIONS.attendanceMonitorManage, "hr.attendance.monitor.manage");
    assert.equal(HR_PERMISSIONS.attendanceExceptionResolve, "hr.attendance.exception.resolve");
    assert.equal(HR_PERMISSIONS.attendanceLiveExport, "hr.attendance.live.export");
  });

  test("defines live status badges and refresh intervals", () => {
    assert.ok(HR_ATTENDANCE_LIVE_STATUSES.includes("present"));
    assert.ok(HR_ATTENDANCE_LIVE_STATUSES.includes("missing_punch"));
    assert.equal(HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS.includes(30), true);
  });

  test("defines background jobs and audit actions", () => {
    assert.equal(HR_ATTENDANCE_LIVE_JOB_KEYS.monitoring, "hr.attendance-live.monitoring");
    assert.equal(HR_ATTENDANCE_LIVE_JOB_KEYS.exceptionScan, "hr.attendance-live.exception-scan");
    assert.equal(HR_ATTENDANCE_LIVE_JOB_KEYS.heartbeat, "hr.attendance-live.heartbeat");
    assert.equal(HR_ATTENDANCE_LIVE_AUDIT_ACTIONS.exportSnapshot, "hr.attendance-live.export.snapshot");
    assert.equal(HR_ATTENDANCE_LIVE_EVENT_KEYS.deviceOffline, "hr.attendance-live.device.offline");
  });

  test("validates list query and supervisor action schemas", () => {
    const query = hrAttendanceLiveListQuerySchema.parse({
      pageSize: "50",
      refreshIntervalSeconds: "30",
      search: "Ahmed",
    });
    assert.equal(query.pageSize, 50);
    assert.equal(query.refreshIntervalSeconds, 30);

    const action = hrAttendanceLiveSupervisorActionSchema.parse({
      action: "approve_missing_punch",
      employeeId: "00000000-0000-4000-8000-000000000001",
      exceptionId: "00000000-0000-4000-8000-000000000002",
      reason: "Approved by supervisor",
    });
    assert.equal(action.action, "approve_missing_punch");
  });

  test("navigation includes attendance live route", async () => {
    const { HR_NAV_ITEMS } = await import("@/features/hr/navigation/hr-navigation");
    const item = HR_NAV_ITEMS.find((entry) => entry.key === "attendance-live");
    assert.ok(item);
    assert.equal(item?.href, "/erp/hr/attendance-live");
    assert.equal(item?.permission, HR_PERMISSIONS.attendanceMonitorView);
  });
});
