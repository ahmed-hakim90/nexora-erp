import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildZkTimeoutArabicHint,
  formatDeviceDriverError,
  isCommKeyRejectionError,
  isRetryableZkDeviceError,
} from "@/features/hr/application/device-drivers/device-driver-error";
import { makeZkCommKey } from "@/features/hr/application/device-drivers/zkteco-comm-key";

describe("ZKTeco device driver helpers", () => {
  test("makeZkCommKey matches pyzk reference output", () => {
    const key = makeZkCommKey(0, 32031, 50);
    assert.equal(key.length, 4);
    assert.deepEqual([...key], [97, 125, 50, 4]);
  });

  test("formatDeviceDriverError replaces undefined TCP command with port", () => {
    const message = formatDeviceDriverError(
      {
        command: "[TCP] undefined",
        err: { message: "TIMEOUT_ON_RECEIVING_REQUEST_DATA" },
        ip: "192.168.88.3",
        toast: () => "TIMEOUT_ON_RECEIVING_REQUEST_DATA",
      },
      { ip: "192.168.88.3", operation: "download_users", port: 4370 },
    );

    assert.match(message, /TIMEOUT_ON_RECEIVING_REQUEST_DATA/);
    assert.match(message, /192\.168\.88\.3:4370/);
    assert.doesNotMatch(message, /undefined/);
    assert.match(message, /مفتاح الاتصال Comm Key/);
  });

  test("buildZkTimeoutArabicHint names the failing phase", () => {
    const hint = buildZkTimeoutArabicHint({
      ip: "192.168.88.3",
      operation: "download_users",
      port: 4370,
    });

    assert.match(hint, /تحميل المستخدمين/);
    assert.match(hint, /192\.168\.88\.3:4370/);
  });

  test("isRetryableZkDeviceError detects timeout failures", () => {
    assert.equal(
      isRetryableZkDeviceError(new Error("TIMEOUT_ON_RECEIVING_REQUEST_DATA")),
      true,
    );
    assert.equal(isRetryableZkDeviceError(new Error("Invalid comm key")), false);
  });

  test("isCommKeyRejectionError distinguishes comm key failures from timeouts", () => {
    assert.equal(
      isCommKeyRejectionError(new Error("ZKTeco communication key was rejected by the device.")),
      true,
    );
    assert.equal(
      isCommKeyRejectionError(new Error("TIMEOUT_ON_RECEIVING_REQUEST_DATA")),
      false,
    );

    const timeoutMessage = formatDeviceDriverError(
      new Error("TIMEOUT_ON_RECEIVING_REQUEST_DATA"),
      { ip: "192.168.88.3", operation: "download_punches", port: 4370 },
    );
    const commKeyMessage = formatDeviceDriverError(
      new Error("ZKTeco communication key was rejected by the device."),
      { ip: "192.168.88.3", operation: "authenticate", port: 4370 },
    );

    assert.match(timeoutMessage, /مفتاح الاتصال Comm Key/);
    assert.doesNotMatch(commKeyMessage, /انتهت مهلة انتظار رد الجهاز/);
  });
});
