import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildIssuancePreviewLines,
  nextCompensationIssuanceBatchCode,
  resolveIssuanceLineAmount,
  roundIssuanceAmount,
} from "@/features/hr/server-api";
import {
  matchCompensationIssuanceImportRows,
  parseCompensationIssuanceImportContent,
} from "@/features/hr/server-api";

const recipients = [
  {
    branchId: "branch-1",
    employeeId: "emp-1",
    employeeLabel: "Ahmed Ali (1001)",
    positionId: "pos-accountant",
    positionLabel: "Accountant",
  },
  {
    branchId: "branch-1",
    employeeId: "emp-2",
    employeeLabel: "Sara Hassan (1002)",
    positionId: "pos-driver",
    positionLabel: "Driver",
  },
  {
    branchId: "branch-1",
    employeeId: "emp-3",
    employeeLabel: "Omar Saleh (1003)",
    positionId: null,
    positionLabel: null,
  },
] as const;

test("compensation issuance engine: batch code format", () => {
  const code = nextCompensationIssuanceBatchCode("BON-BATCH");
  assert.match(code, /^BON-BATCH-\d{4}-\d{8}$/);
});

test("compensation issuance engine: fixed amount for all recipients", () => {
  const preview = buildIssuancePreviewLines({
    amountConfig: { amount: 1000 },
    amountMode: "fixed",
    documentKind: "bonus",
    recipients,
  });

  assert.equal(preview.lines.length, 3);
  assert.equal(preview.lines.every((line) => line.lineStatus === "pending"), true);
  assert.equal(preview.totalAmount, 3000);
  assert.equal(preview.warnings.length, 0);
});

test("compensation issuance engine: by-position amounts", () => {
  const preview = buildIssuancePreviewLines({
    amountConfig: {
      byPosition: {
        "pos-accountant": 500,
        "pos-driver": 300,
      },
    },
    amountMode: "by_position",
    documentKind: "bonus",
    recipients,
  });

  assert.equal(preview.lines[0]?.amount, 500);
  assert.equal(preview.lines[1]?.amount, 300);
  assert.equal(preview.lines[2]?.lineStatus, "skipped");
  assert.equal(preview.lines.filter((line) => line.lineStatus === "skipped").length, 1);
  assert.equal(roundIssuanceAmount(preview.totalAmount), 800);
  assert.ok(preview.warnings.length > 0);
});

test("compensation issuance engine: per-employee overrides", () => {
  const preview = buildIssuancePreviewLines({
    amountConfig: {},
    amountMode: "per_employee",
    documentKind: "bonus",
    lineOverrides: [
      { amount: 1500, employeeId: "emp-1" },
      { amount: 750, employeeId: "emp-2" },
    ],
    recipients: recipients.slice(0, 2),
  });

  assert.equal(preview.lines[0]?.amount, 1500);
  assert.equal(preview.lines[1]?.amount, 750);
  assert.equal(preview.totalAmount, 2250);
});

test("compensation issuance engine: incentive accepts percentage override", () => {
  const resolution = resolveIssuanceLineAmount({
    amountConfig: {},
    amountMode: "per_employee",
    documentKind: "incentive",
    override: { employeeId: "emp-1", percentage: 12.5 },
    recipient: { employeeId: "emp-1", positionId: "pos-accountant" },
  });

  assert.equal(resolution.percentage, 12.5);
  assert.equal(resolution.amount, null);
  assert.equal(resolution.skipReason, null);
});

test("compensation issuance schemas: create draft validation", async () => {
  const { hrCompensationIssuanceCreateDraftSchema } = await import(
    "@/features/hr/server-api"
  );

  const valid = hrCompensationIssuanceCreateDraftSchema.safeParse({
    amountConfig: { amount: 1000 },
    amountMode: "fixed",
    documentKind: "bonus",
    documentSubtype: "eid",
    effectiveDate: "2026-07-09",
    selectionFilters: { positionIds: ["550e8400-e29b-41d4-a716-446655440001"] },
    selectionMode: "by_position",
  });
  assert.equal(valid.success, true);

  const invalidFixed = hrCompensationIssuanceCreateDraftSchema.safeParse({
    amountConfig: {},
    amountMode: "fixed",
    documentKind: "bonus",
    documentSubtype: "eid",
    effectiveDate: "2026-07-09",
    selectionFilters: {},
    selectionMode: "all_active",
  });
  assert.equal(invalidFixed.success, false);

  const invalidPenalty = hrCompensationIssuanceCreateDraftSchema.safeParse({
    amountConfig: { amount: 100 },
    amountMode: "fixed",
    documentKind: "penalty",
    documentSubtype: "deduction",
    effectiveDate: "2026-07-09",
    selectionFilters: { employeeIds: ["550e8400-e29b-41d4-a716-446655440000"] },
    selectionMode: "manual",
  });
  assert.equal(invalidPenalty.success, false);
});

test("compensation issuance: services exported", () => {
  const batchServicePath = path.join(
    process.cwd(),
    "src/features/hr/application/services/hr-compensation-issuance-batch.service.ts",
  );
  const recipientServicePath = path.join(
    process.cwd(),
    "src/features/hr/application/services/hr-compensation-recipient-resolver.service.ts",
  );
  const batchSource = fs.readFileSync(batchServicePath, "utf8");
  const recipientSource = fs.readFileSync(recipientServicePath, "utf8");

  assert.match(batchSource, /export class HrCompensationIssuanceBatchService/);
  assert.match(recipientSource, /export class HrCompensationRecipientResolverService/);
});

test("compensation issuance: migration defines runtime tables", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260724120000_hr_compensation_issuance_batches.sql"),
    "utf8",
  );
  assert.match(sql, /hr_compensation_issuance_batches/);
  assert.match(sql, /hr_compensation_issuance_batch_lines/);
  assert.match(sql, /batch_id/);
  assert.match(sql, /tenant_isolation_hr_compensation_issuance_batches/);
});

test("compensation issuance: constants define job and audit actions", async () => {
  const constants = await import("@/features/hr/server-api");
  assert.equal(constants.HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB.key, "hr.compensation-issuance-materialize");
  assert.equal(constants.HR_COMPENSATION_ISSUANCE_MAX_LINES, 2000);
  assert.equal(constants.HR_COMPENSATION_ISSUANCE_BATCH_CODE_PREFIX.bonus, "BON-BATCH");
});

test("compensation issuance: recipient resolver uses assignment resolver", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-compensation-recipient-resolver.service.ts"),
    "utf8",
  );
  assert.match(source, /HrAssignmentResolverService/);
  assert.match(source, /\.eq\("assignment_type", "position"\)/);
  assert.match(source, /assignmentType: "department"/);
});

test("compensation issuance: batch service records audit on create and preview", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-compensation-issuance-batch.service.ts"),
    "utf8",
  );
  assert.match(source, /HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS\.batchCreated/);
  assert.match(source, /HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS\.batchPreviewBuilt/);
  assert.match(source, /processMaterializeJob/);
  assert.match(source, /queueMaterializeJob/);
  assert.match(source, /HR_COMPENSATION_ISSUANCE_CHUNK_SIZE/);
});

test("compensation issuance: materialize job handler registered", () => {
  const handlersSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/workers/hr-background-job-handlers.ts"),
    "utf8",
  );
  assert.match(handlersSource, /runCompensationIssuanceMaterializeJob/);
  assert.match(handlersSource, /HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB\.key/);

  const jobSource = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/jobs/hr-compensation-issuance-materialize.job.ts"),
    "utf8",
  );
  assert.match(jobSource, /export async function runCompensationIssuanceMaterializeJob/);
});

test("compensation issuance: shared UI routes exist", () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/compensation/batches/[id]/page.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-compensation-issuance-wizard.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/(erp)/erp/hr/_components/hr-compensation-issuance-batch-table.tsx")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/api/hr/compensation-issuance/import-template/route.ts")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "src/app/api/hr/compensation-issuance/parse-import/route.ts")));
});

test("compensation issuance import: parses csv rows", () => {
  const csv = "employee_number,amount,notes\n1001,1000,Eid\n1002,500,\n";
  const buffer = new TextEncoder().encode(csv).buffer;
  const parsed = parseCompensationIssuanceImportContent({ buffer, fileName: "import.csv" });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0]?.employeeNumber, "1001");
  assert.equal(parsed.rows[0]?.amount, 1000);
});

test("compensation issuance import: rejects duplicate employee numbers", () => {
  const csv = "employee_number,amount\n1001,1000\n1001,500\n";
  const buffer = new TextEncoder().encode(csv).buffer;
  const parsed = parseCompensationIssuanceImportContent({ buffer, fileName: "import.csv" });
  assert.ok(parsed.errors.some((error) => error.includes("duplicate")));
});

test("compensation issuance import: matches employees by number", () => {
  const matched = matchCompensationIssuanceImportRows({
    employees: [{ employeeNumber: "1001", fullName: "Ahmed Ali", id: "550e8400-e29b-41d4-a716-446655440000" }],
    rows: [{ amount: 1000, employeeNumber: "1001", notes: null, percentage: null, row: 2 }],
  });
  assert.equal(matched.errors.length, 0);
  assert.equal(matched.rows.length, 1);
  assert.equal(matched.rows[0]?.employeeId, "550e8400-e29b-41d4-a716-446655440000");
});

test("compensation issuance: batch service detects duplicate warnings", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/features/hr/application/services/hr-compensation-issuance-batch.service.ts"),
    "utf8",
  );
  assert.match(source, /detectDuplicateIssuanceWarnings/);
  assert.match(source, /importLines/);
});
