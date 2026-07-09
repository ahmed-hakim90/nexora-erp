import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const ROOT = join(process.cwd());

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("HCM Enterprise Production Gate", () => {
  test("Gate 1: payroll calculation service uses snapshot resolver without unconditional live fallback", () => {
    const source = readRepoFile("src/features/hr/application/services/hr-payroll-calculation.service.ts");
    assert.match(source, /resolveAttendanceInputsForPayroll/);
    assert.match(source, /isPayrollLiveFallbackAllowed/);
    assert.doesNotMatch(source, /\?\?\s*\(await this\.loadLiveAttendanceInputs/);
  });

  test("Gate 2: payroll period lifecycle service implements open/lock/close/reopen", () => {
    const source = readRepoFile("src/features/hr/application/services/hr-payroll-period-lifecycle.service.ts");
    assert.match(source, /async lockPeriod/);
    assert.match(source, /async closePeriod/);
    assert.match(source, /async reopenPeriod/);
    assert.match(source, /async validatePeriodForPayroll/);
    assert.match(source, /assertPeriodAllowsPayrollMutation/);
  });

  test("Gate 3: unified shift resolution service is consumed by attendance and late/early", () => {
    const shiftSource = readRepoFile("src/features/hr/application/services/hr-shift-resolution.service.ts");
    assert.match(shiftSource, /class HrShiftResolutionService/);

    const attendanceSource = readRepoFile("src/features/hr/application/services/hr-attendance.service.ts");
    assert.match(attendanceSource, /HrShiftResolutionService/);
    assert.match(attendanceSource, /shift_version_id/);

    const lateEarlySource = readRepoFile("src/features/hr/application/services/hr-late-early-policy.engine.ts");
    assert.match(lateEarlySource, /HrShiftResolutionService/);
  });

  test("Gate 4: UAT checklist documents end-to-end operator cycle", () => {
    const checklist = readRepoFile("docs/09-history/HCM_UAT_E2E_CHECKLIST.md");
    assert.match(checklist, /Employee/);
    assert.match(checklist, /Attendance Export/);
    assert.match(checklist, /Payroll Calculate/);
    assert.match(checklist, /Publish/);
    assert.match(checklist, /READY FOR PRODUCTION/);
  });

  test("Gate 5: implementation status documents five production gates", () => {
    const status = readRepoFile("docs/00-overview/IMPLEMENTATION_STATUS.md");
    assert.match(status, /Enterprise Production Ready/);
    assert.match(status, /Snapshot/);
    assert.match(status, /Period Lifecycle/);
    assert.match(status, /Shift Resolution/);
  });
});
