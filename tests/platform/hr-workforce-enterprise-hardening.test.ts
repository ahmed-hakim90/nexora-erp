import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  HR_DEVICE_COMMAND_KEYS,
  HR_WORKFORCE_ENTERPRISE_EVENT_KEYS,
  HR_WORKFORCE_ENTERPRISE_JOB_KEYS,
} from "@/features/hr/application/constants/hr-workforce-enterprise.constants";
import {
  createAttendanceDeviceDriver,
  createAttendanceDeviceDriverForDevice,
  listDeviceDriverDescriptors,
  resolveDriverKey,
} from "@/features/hr/application/device-drivers/registry";
import { HR_PERMISSIONS } from "@/features/hr/permissions/permission-registry";
import { HR_WORKFORCE_ENTERPRISE_READINESS } from "@/features/hr/workforce-enterprise-foundation";

describe("HR Workforce Enterprise Hardening", () => {
  test("readiness contract marks enterprise foundations implemented", () => {
    assert.equal(HR_WORKFORCE_ENTERPRISE_READINESS.driverFrameworkImplemented, true);
    assert.equal(HR_WORKFORCE_ENTERPRISE_READINESS.replayCenterImplemented, true);
    assert.equal(HR_WORKFORCE_ENTERPRISE_READINESS.queueManagerImplemented, true);
  });

  test("registers driver descriptors for all vendor protocols", () => {
    const descriptors = listDeviceDriverDescriptors();
    const keys = descriptors.map((descriptor) => descriptor.key);
    assert.ok(keys.includes("zkteco"));
    assert.ok(keys.includes("suprema"));
    assert.ok(keys.includes("hikvision"));
    assert.ok(keys.includes("anviz"));
    assert.ok(keys.includes("generic_tcp"));
    assert.ok(keys.includes("generic_rest"));
    assert.ok(keys.includes("sdk"));
    assert.ok(keys.includes("file_import"));
  });

  test("resolves device types to driver keys", () => {
    assert.equal(resolveDriverKey("zkteco"), "zkteco");
    assert.equal(resolveDriverKey("excel_import"), "file_import");
    assert.equal(resolveDriverKey("api_import"), "generic_rest");
    assert.equal(resolveDriverKey("unknown_type"), "generic_rest");
  });

  test("driver exposes connect ping downloadUsers downloadPunches lifecycle", async () => {
    const previous = process.env.HR_DEVICE_DRIVER_SIMULATION;
    process.env.HR_DEVICE_DRIVER_SIMULATION = "true";
    try {
      const driver = createAttendanceDeviceDriver("zkteco");
      await driver.connect({
        deviceId: "device-1",
        deviceType: "zkteco",
        driverKey: "zkteco",
        ipAddress: "192.168.1.10",
        port: 4370,
        timezone: "UTC",
      });
      const ping = await driver.ping();
      assert.ok(ping.reachable);
      const users = await driver.downloadUsers();
      assert.ok(users.length > 0);
      const punches = await driver.downloadPunches();
      assert.ok(punches.length > 0);
      const info = await driver.getDeviceInfo();
      assert.ok(info.serialNumber);
      await driver.disconnect();
    } finally {
      if (previous === undefined) delete process.env.HR_DEVICE_DRIVER_SIMULATION;
      else process.env.HR_DEVICE_DRIVER_SIMULATION = previous;
    }
  });

  test("createAttendanceDeviceDriverForDevice respects override driver key", () => {
    const driver = createAttendanceDeviceDriverForDevice({ deviceType: "api_import", driverKey: "hikvision" });
    assert.equal(driver.key, "hikvision");
  });

  test("registers enterprise permissions and job keys", () => {
    assert.equal(HR_PERMISSIONS.attendanceDevicesCommandsRun, "hr.devices.commands.run");
    assert.equal(HR_PERMISSIONS.attendanceReplayManage, "hr.attendance.replay.manage");
    assert.equal(HR_PERMISSIONS.workforceMonitorView, "hr.workforce.monitor.view");
    assert.equal(HR_WORKFORCE_ENTERPRISE_JOB_KEYS.deviceMonitor, "hr.workforce.device-monitor");
    assert.equal(HR_WORKFORCE_ENTERPRISE_JOB_KEYS.autoRecovery, "hr.workforce.auto-recovery");
  });

  test("defines device command catalog", () => {
    assert.ok(HR_DEVICE_COMMAND_KEYS.includes("ping"));
    assert.ok(HR_DEVICE_COMMAND_KEYS.includes("factory_reset"));
    assert.ok(HR_DEVICE_COMMAND_KEYS.includes("sync_time"));
  });

  test("event keys cover command and replay lifecycle", () => {
    assert.equal(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.commandStarted, "hr.workforce.device.command.started");
    assert.equal(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.replayCompleted, "hr.workforce.attendance.replay.completed");
    assert.equal(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.timeDriftCorrected, "hr.workforce.device.time.drift.corrected");
  });
});
