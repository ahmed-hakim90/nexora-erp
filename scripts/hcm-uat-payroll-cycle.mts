/**
 * One-shot UAT remediation: run payroll lifecycle against hakimo seed data.
 * Uses service-role client + HR payroll services (snapshot-only calc).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { BranchRequestContext } from "../src/platform/auth/authenticated-context";
import { HrPayrollService } from "../src/features/hr/application/services/hr-payroll.service";
import { HrPayrollPeriodLifecycleService } from "../src/features/hr/application/services/hr-payroll-period-lifecycle.service";

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const TENANT_ID = "5bb51aac-5cae-49d3-8259-4bece8e19390";
const COMPANY_ID = "6fe344a6-6bf5-45c9-9d47-a69d85cfff8d";
const BRANCH_ID = "10b01096-7d9d-4d3a-8c3c-6a7666b8c2f9";
const USER_ID = "2ae3d979-b364-41ad-81fe-ec1ff8cddcae";
const PERIOD_ID = "f5050001-0001-4000-8000-000000000001";
const GROUP_ID = "f5040001-0001-4000-8000-000000000001";

function createContext(): BranchRequestContext {
  return {
    accessToken: "uat-service-role",
    branchId: BRANCH_ID,
    companyId: COMPANY_ID,
    correlationId: `uat-payroll-${Date.now()}`,
    experience: "erp",
    locale: "en",
    requestId: `req-${Date.now()}`,
    tenantId: TENANT_ID,
    timezone: "Africa/Cairo",
    userId: USER_ID,
  } as BranchRequestContext;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const context = createContext();
  const payroll = new HrPayrollService(supabase, context);
  const lifecycle = new HrPayrollPeriodLifecycleService(supabase, context);

  console.log("1) validatePeriodForPayroll...");
  const periodValidation = await lifecycle.validatePeriodForPayroll(PERIOD_ID);
  console.log(periodValidation);
  if (periodValidation.blockingCount > 0) {
    throw new Error(`Period validation blocked with ${periodValidation.blockingCount} issue(s)`);
  }

  console.log("2) createPayrollRun...");
  const run = await payroll.createPayrollRun({ payrollGroupId: GROUP_ID, payrollPeriodId: PERIOD_ID });
  console.log(run);

  console.log("3) validatePayrollRun...");
  const runValidation = await payroll.validatePayrollRun(run.id);
  console.log(runValidation);
  if (runValidation.issueCount > 0) {
    throw new Error(`Run validation found ${runValidation.issueCount} issue(s)`);
  }

  console.log("4) calculatePayrollRun...");
  const calc = await payroll.calculatePayrollRun(run.id);
  console.log(calc);

  console.log("5) approvePayrollRun...");
  await payroll.approvePayrollRun(run.id);
  console.log("approved");

  console.log("6) publishPayslips...");
  const publish = await payroll.publishPayslips(run.id);
  console.log(publish);

  console.log("7) lockPayrollPeriod...");
  await lifecycle.lockPeriod(PERIOD_ID, "UAT cycle complete");
  console.log("locked");

  console.log("8) closePayrollPeriod...");
  await lifecycle.closePeriod(PERIOD_ID, "UAT cycle complete");
  console.log("closed");

  const { data: results } = await supabase
    .from("hr_payroll_results")
    .select("employee_id, gross_earnings, total_deductions, net_pay, currency")
    .eq("payroll_run_id", run.id)
    .is("deleted_at", null);

  const { count: publications } = await supabase
    .from("hr_payslip_publications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT_ID)
    .eq("publishing_status", "published")
    .is("deleted_at", null);

  console.log(JSON.stringify({
    netResults: results,
    publications: publications ?? 0,
    runId: run.id,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
