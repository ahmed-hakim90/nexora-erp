/**
 * One-shot UAT: compensation batch issuance (bonus) against hakimo seed data.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { BranchRequestContext } from "../src/platform/auth/authenticated-context";
import { HrCompensationIssuanceBatchService } from "../src/features/hr/application/services/hr-compensation-issuance-batch.service";

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

function createContext(): BranchRequestContext {
  return {
    accessToken: "uat-service-role",
    branchId: BRANCH_ID,
    companyId: COMPANY_ID,
    correlationId: `uat-compensation-batch-${Date.now()}`,
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
  const service = new HrCompensationIssuanceBatchService(supabase, context);

  const { data: employees, error: employeesError } = await supabase
    .from("hr_employees")
    .select("id, employee_number, full_name")
    .eq("tenant_id", TENANT_ID)
    .eq("company_id", COMPANY_ID)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(3);

  if (employeesError || !employees?.length) {
    throw new Error("No active employees found for UAT compensation batch.");
  }

  const effectiveDate = new Date().toISOString().slice(0, 10);
  const importLines = employees.map((employee, index) => ({
    amount: 500 + index * 100,
    employeeId: String(employee.id),
    employeeNumber: String(employee.employee_number),
  }));

  console.log("1) createDraft (import mode)...");
  const draft = await service.createDraft({
    amountConfig: {},
    amountMode: "per_employee",
    branchId: BRANCH_ID,
    currencyCode: "SAR",
    documentKind: "bonus",
    documentSubtype: "eid",
    effectiveDate,
    reason: "UAT compensation batch",
    selectionFilters: {
      employeeIds: importLines.map((line) => line.employeeId),
      importLines,
    },
    selectionMode: "import",
  });
  console.log(draft);

  console.log("2) buildPreview...");
  const preview = await service.buildPreview({ batchId: draft.batchId });
  console.log({
    employeeCount: preview.employeeCount,
    includedCount: preview.includedCount,
    totalAmount: preview.totalAmount,
    warnings: preview.warnings,
  });

  if (preview.includedCount === 0) {
    throw new Error("Preview included zero employees.");
  }

  console.log("3) savePreviewLines...");
  await service.savePreviewLines({
    batchId: draft.batchId,
    lines: preview.lines.map((line) => ({
      amount: line.amount,
      employeeId: line.employeeId,
      percentage: line.percentage,
      positionId: line.positionId,
      positionLabel: line.positionLabel,
      skipReason: line.skipReason,
    })),
  });

  console.log("4) submitBatch...");
  const submit = await service.submitBatch(draft.batchId);
  console.log(submit);

  if (submit.queued) {
    console.log("Batch queued for background processing — run POST /api/jobs/process then approve manually.");
    return;
  }

  console.log("5) approveBatch...");
  await service.approveBatch(draft.batchId);
  console.log("approved");

  const { count: bonusCount } = await supabase
    .from("hr_employee_bonuses")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT_ID)
    .eq("batch_id", draft.batchId)
    .eq("status", "approved")
    .is("deleted_at", null);

  console.log(JSON.stringify({ batchId: draft.batchId, approvedBonuses: bonusCount }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
