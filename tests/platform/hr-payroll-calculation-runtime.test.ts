import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  calculateEgyptEndOfService,
  calculateEgyptPayrollBreakdown,
  generateWpsBankFileContent,
} from "@/features/hr/server-api";

describe("HR payroll calculation runtime", () => {
  test("calculateEgyptPayrollBreakdown uses insurable salary separately from gross", () => {
    const result = calculateEgyptPayrollBreakdown(25000, 1000, 15000);
    assert.equal(result.grossEarnings, 25000);
    assert.equal(result.basicSalary, 15000);
    assert.ok(result.employeeSocialInsurance > 0);
    assert.ok(result.netPay < result.grossEarnings);
  });

  test("calculateEgyptEndOfService applies first-five and remaining bands", () => {
    const threeYears = calculateEgyptEndOfService(10000, 3);
    assert.equal(threeYears.endOfServiceAmount, 30000);

    const sevenYears = calculateEgyptEndOfService(10000, 7);
    assert.equal(sevenYears.endOfServiceAmount, 80000);
  });

  test("generateWpsBankFileContent renders pipe-delimited rows", () => {
    const content = generateWpsBankFileContent([
      {
        accountNumber: "1234567890",
        amount: 15000.5,
        bankCode: "EG",
        currency: "EGP",
        employeeName: "Ahmed Ali",
        employeeNumber: "EMP-001",
        reference: "PAYROLL-202607",
      },
    ]);
    assert.match(content, /^EmployeeNumber\|EmployeeName\|BankCode/);
    assert.match(content, /EMP-001\|Ahmed Ali\|EG\|1234567890\|15000\.50\|EGP\|PAYROLL-202607/);
  });
});
