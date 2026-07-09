/** When true, payroll calc may fall back to live attendance readers (dev/test only). */
export function isPayrollLiveFallbackAllowed(): boolean {
  if (process.env.HR_PAYROLL_ALLOW_LIVE_FALLBACK === "true") {
    return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  }
  return false;
}

export const PAYROLL_SNAPSHOT_REQUIRED_MESSAGE =
  "Export attendance payroll snapshot first. Payroll calculation requires an immutable attendance snapshot for this period.";

export const PAYROLL_EXPORT_BATCH_REQUIRED_MESSAGE =
  "Complete an attendance payroll export for this period before calculating payroll.";

export const PAYROLL_PERIOD_FROZEN_STATUSES = [
  "locked",
  "closed",
  "posted",
  "paid",
] as const;

export type PayrollPeriodFrozenStatus = (typeof PAYROLL_PERIOD_FROZEN_STATUSES)[number];
