"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { manufacturingDailyReportMutationSchema } from "../../application/schemas/daily-reports.schema";
import type { ManufacturingDailyReportRecord } from "../../application/types/daily-reports";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";
import { REPORT_COLUMNS } from "../loaders/daily-reports.loader";

const basePath = "/erp/manufacturing/daily-reports";
const reportCodeConfig = { prefix: "DPR", scope: "branch" } as const;

function formDataToObject(formData: FormData): Record<string, unknown> {
  const input = Object.fromEntries(formData.entries());
  const workerRefs = formData.getAll("workerOutputWorkerRefId");
  const targets = formData.getAll("workerOutputTargetQuantity");
  const actuals = formData.getAll("workerOutputActualQuantity");
  const notes = formData.getAll("workerOutputNotes");
  const workerOutput = workerRefs
    .map((workerRef, index) => ({
      actualQuantity: Number(actuals[index] ?? 0),
      notes: String(notes[index] ?? "").trim(),
      targetQuantity: Number(targets[index] ?? 0),
      workerRefId: String(workerRef ?? "").trim(),
    }))
    .filter((row) => row.workerRefId.length > 0 || row.targetQuantity > 0 || row.actualQuantity > 0 || row.notes.length > 0)
    .map((row) => ({
      actualQuantity: row.actualQuantity,
      notes: row.notes.length > 0 ? row.notes : undefined,
      targetQuantity: row.targetQuantity,
      workerRefId: row.workerRefId,
    }));

  return {
    ...input,
    workerOutputJson: JSON.stringify(workerOutput),
  };
}

function parseDailyReportInput(input: Record<string, unknown>) {
  try {
    return manufacturingDailyReportMutationSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = [...new Set(error.issues.map((issue) => issue.path.join(".")).filter(Boolean))];
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: fields.length > 0
          ? `Please fill the required DPR fields: ${fields.join(", ")}.`
          : "Please review the DPR form values.",
        cause: error,
      });
    }
    throw error;
  }
}
async function createParts() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.dailyReportsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

function toPayload(input: ReturnType<typeof manufacturingDailyReportMutationSchema.parse>, context: Awaited<ReturnType<typeof resolveBranchRequestContext>>) {
  return {
    actual_quantity: input.actualQuantity,
    branch_id: context.branchId,
    company_id: context.companyId,
    cost_calculation_implemented: false,
    downtime_minutes: input.downtimeMinutes,
    manufacturing_product_id: input.manufacturingProductId,
    notes: input.notes ?? null,
    payroll_calculation_implemented: false,
    planned_quantity: input.plannedQuantity,
    production_line_id: input.productionLineId,
    quality_workflow_implemented: false,
    report_date: input.reportDate,
    report_key: input.reportKey.toLowerCase(),
    rework_quantity: input.reworkQuantity,
    scrap_quantity: input.scrapQuantity,
    shift_key: input.shiftKey,
    status: input.status,
    supervisor_ref_id: input.supervisorRefId ?? null,
    tenant_id: context.tenantId,
    updated_by: context.userId,
    worker_output: input.workerOutputJson,
  };
}

function validateWorkerOutput(input: ReturnType<typeof manufacturingDailyReportMutationSchema.parse>) {
  const workerRows = input.workerOutputJson as Array<Record<string, unknown>>;
  let totalActual = 0;
  for (const [index, row] of workerRows.entries()) {
    const workerRefId = typeof row.workerRefId === "string" ? row.workerRefId.trim() : "";
    const targetQuantity = Number(row.targetQuantity ?? 0);
    const actualQuantity = Number(row.actualQuantity ?? 0);
    if (!workerRefId) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Worker output row ${index + 1} requires a worker.` });
    }
    if (targetQuantity < 0 || actualQuantity < 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Worker output quantities cannot be negative." });
    }
    totalActual += actualQuantity;
  }
  if (workerRows.length > 0 && Math.abs(totalActual - input.actualQuantity) > 0.000001) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Worker output total must match the DPR actual quantity." });
  }
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function mapSavedReport(row: Record<string, unknown>): ManufacturingDailyReportRecord {
  return {
    actualQuantity: toNumber(row.actual_quantity),
    branchId: row.branch_id as string,
    companyId: row.company_id as string,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | null,
    downtimeMinutes: toNumber(row.downtime_minutes),
    id: row.id as string,
    isActive: row.is_active as boolean,
    manufacturingProductId: row.manufacturing_product_id as string,
    notes: row.notes as string | null,
    plannedQuantity: toNumber(row.planned_quantity),
    productionLineId: row.production_line_id as string,
    reportDate: row.report_date as string,
    reportKey: row.report_key as string,
    reworkQuantity: toNumber(row.rework_quantity),
    scrapQuantity: toNumber(row.scrap_quantity),
    shiftKey: row.shift_key as string,
    status: row.status as ManufacturingDailyReportRecord["status"],
    supervisorRefId: row.supervisor_ref_id as string | null,
    tenantId: row.tenant_id as string,
    updatedAt: row.updated_at as string,
    updatedBy: row.updated_by as string | null,
    version: row.version as number,
    workerOutput: Array.isArray(row.worker_output) ? row.worker_output : [],
  };
}

export async function createManufacturingDailyReportAction(formData: FormData): Promise<ManufacturingDailyReportRecord> {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  setGeneratedBusinessCode(rawInput, "reportKey", await generateNextBusinessCode(supabase, {
    column: "report_key",
    config: reportCodeConfig,
    scope: { branchId: context.branchId, companyId: context.companyId, tenantId: context.tenantId },
    table: "manufacturing_daily_reports",
  }));
  const input = parseDailyReportInput(rawInput);
  validateWorkerOutput(input);
  const { data, error } = await supabase
    .from("manufacturing_daily_reports")
    .insert({ ...toPayload(input, context), created_by: context.userId })
    .select(REPORT_COLUMNS)
    .single();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create daily production report.", cause: error });
  }

  revalidatePath(basePath);
  return mapSavedReport(data as Record<string, unknown>);
}

export async function updateManufacturingDailyReportAction(id: string, formData: FormData): Promise<ManufacturingDailyReportRecord> {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (typeof rawInput.reportKey !== "string" || rawInput.reportKey.trim().length === 0) {
    const { data, error } = await supabase
      .from("manufacturing_daily_reports")
      .select("report_key")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read existing DPR code.", cause: error });
    rawInput.reportKey = data.report_key as string;
  }
  const input = parseDailyReportInput(rawInput);
  validateWorkerOutput(input);
  const { data, error } = await supabase
    .from("manufacturing_daily_reports")
    .update(toPayload(input, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .eq("id", id)
    .is("deleted_at", null)
    .select(REPORT_COLUMNS)
    .single();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update daily production report.", cause: error });
  }

  revalidatePath(basePath);
  return mapSavedReport(data as Record<string, unknown>);
}

export async function archiveManufacturingDailyReportAction(id: string) {
  const { context, supabase } = await createParts();
  const { error } = await supabase
    .from("manufacturing_daily_reports")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive daily production report.", cause: error });
  }

  revalidatePath(basePath);
}
