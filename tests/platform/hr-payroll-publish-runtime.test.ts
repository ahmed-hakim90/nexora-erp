import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  payrollRunAllowsApproval,
  payrollRunAllowsCalculation,
  payrollRunAllowsPublish,
} from "@/features/hr/server-api";

describe("HR payroll publish runtime guards", () => {
  test("calculation is allowed for ready and completed runs", () => {
    assert.equal(payrollRunAllowsCalculation("ready"), true);
    assert.equal(payrollRunAllowsCalculation("validating"), true);
    assert.equal(payrollRunAllowsCalculation("completed"), true);
    assert.equal(payrollRunAllowsCalculation("draft"), false);
    assert.equal(payrollRunAllowsCalculation("approved"), false);
    assert.equal(payrollRunAllowsCalculation("paid"), false);
  });

  test("approval is allowed only for completed runs", () => {
    assert.equal(payrollRunAllowsApproval("completed"), true);
    assert.equal(payrollRunAllowsApproval("ready"), false);
    assert.equal(payrollRunAllowsApproval("approved"), false);
    assert.equal(payrollRunAllowsApproval("paid"), false);
  });

  test("publish is allowed only for approved runs", () => {
    assert.equal(payrollRunAllowsPublish("approved"), true);
    assert.equal(payrollRunAllowsPublish("completed"), false);
    assert.equal(payrollRunAllowsPublish("paid"), false);
    assert.equal(payrollRunAllowsPublish("draft"), false);
  });
});
