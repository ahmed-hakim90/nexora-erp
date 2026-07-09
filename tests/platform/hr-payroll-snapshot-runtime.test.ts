import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isPayrollLiveFallbackAllowed,
  PAYROLL_PERIOD_FROZEN_STATUSES,
  PAYROLL_SNAPSHOT_REQUIRED_MESSAGE,
} from "@/features/hr/application/constants/hr-payroll-runtime.constants";
import { HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT, HR_PAYROLL_LOCK_READINESS } from "@/features/hr/payroll-foundation";

describe("HR payroll snapshot-only runtime", () => {
  test("live fallback requires explicit dev/test flag", () => {
    assert.equal(isPayrollLiveFallbackAllowed(), process.env.HR_PAYROLL_ALLOW_LIVE_FALLBACK === "true"
      && (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"));
  });

  test("snapshot required message is explicit for operators", () => {
    assert.match(PAYROLL_SNAPSHOT_REQUIRED_MESSAGE, /Export attendance payroll snapshot first/i);
  });

  test("payroll foundation contract enforces snapshot-only calculation", () => {
    assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.calculatesFromSnapshotsOnly, true);
    assert.equal(HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT.calculateFromSnapshotsRuntimeImplemented, true);
    assert.equal(HR_PAYROLL_LOCK_READINESS.lockRuntimeImplemented, true);
  });

  test("frozen payroll period statuses include locked and closed", () => {
    assert.ok(PAYROLL_PERIOD_FROZEN_STATUSES.includes("locked"));
    assert.ok(PAYROLL_PERIOD_FROZEN_STATUSES.includes("closed"));
  });
});
