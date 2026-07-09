"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { HrCompensationIssuanceDocumentKind } from "../../application/constants/hr-compensation-issuance.constants";
import {
  compensationIssuanceBatchPath,
  compensationIssuanceListPath,
} from "../../application/utils/hr-compensation-issuance-paths";
import {
  hrCompensationIssuanceBatchIdSchema,
  hrCompensationIssuanceBuildPreviewSchema,
  hrCompensationIssuanceCreateDraftSchema,
} from "../../application/schemas/hr-compensation-issuance-batch.schema";
import { HrCompensationIssuanceBatchService } from "../../application/services/hr-compensation-issuance-batch.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

const hrCompensationIssuanceRejectSchema = z.object({
  batchId: z.string().uuid(),
  documentKind: z.enum(["bonus", "incentive", "penalty"]).optional(),
  reason: z.string().trim().min(3, "Rejection reason is required."),
});

function revalidateIssuancePaths(documentKind: HrCompensationIssuanceDocumentKind, batchId?: string) {
  revalidatePath(compensationIssuanceListPath(documentKind));
  if (batchId) revalidatePath(compensationIssuanceBatchPath(batchId));
}

async function issuanceService() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrCompensationIssuanceBatchService(supabase, context) };
}

const hrCompensationIssuanceImportRowSchema = z.object({
  amount: z.number().nullable().optional(),
  employeeId: z.string().uuid(),
  employeeLabel: z.string().optional(),
  employeeNumber: z.string().optional(),
  notes: z.string().nullable().optional(),
  percentage: z.number().nullable().optional(),
  row: z.number().optional(),
});

export async function createCompensationIssuanceImportBatchAction(formData: FormData) {
  const documentKind = String(formData.get("documentKind") ?? "bonus") as HrCompensationIssuanceDocumentKind;
  const importRows = z.array(hrCompensationIssuanceImportRowSchema).min(1).parse(JSON.parse(String(formData.get("importRows") ?? "[]")));

  const selectionFilters = {
    employeeIds: importRows.map((row) => row.employeeId),
    importLines: importRows.map((row) => ({
      amount: row.amount ?? undefined,
      employeeId: row.employeeId,
      employeeNumber: row.employeeNumber,
      notes: row.notes ?? undefined,
      percentage: row.percentage ?? undefined,
    })),
  };

  const parsed = hrCompensationIssuanceCreateDraftSchema.parse({
    amountConfig: {},
    amountMode: "per_employee",
    documentKind,
    documentSubtype: String(formData.get("documentSubtype") ?? "eid"),
    effectiveDate: String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10)),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    payrollPeriod: String(formData.get("payrollPeriod") ?? "").trim() || undefined,
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    selectionFilters,
    selectionMode: "import",
  });

  const { service } = await issuanceService();
  const draft = await service.createDraft(parsed);
  const preview = await service.buildPreview({ batchId: draft.batchId });
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
  revalidateIssuancePaths(documentKind, draft.batchId);
  return { ...draft, preview };
}

export async function createCompensationIssuanceDraftAction(formData: FormData) {
  const positionId = String(formData.get("positionId") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const selectionMode = String(formData.get("selectionMode") ?? "all_active");
  const documentKind = String(formData.get("documentKind") ?? "bonus") as HrCompensationIssuanceDocumentKind;

  const selectionFilters: Record<string, string[]> = {};
  if (positionId) selectionFilters.positionIds = [positionId];
  if (employeeId) selectionFilters.employeeIds = [employeeId];

  const amountMode = String(formData.get("amountMode") ?? "fixed");
  const fixedAmount = parseFloat(String(formData.get("amount") ?? "0"));
  const amountConfig =
    amountMode === "fixed"
      ? { amount: fixedAmount }
      : amountMode === "by_position" && positionId
        ? { byPosition: { [positionId]: fixedAmount } }
        : {};

  const parsed = hrCompensationIssuanceCreateDraftSchema.parse({
    amountConfig,
    amountMode,
    documentKind,
    documentSubtype: String(formData.get("documentSubtype") ?? "eid"),
    effectiveDate: String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10)),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    payrollPeriod: String(formData.get("payrollPeriod") ?? "").trim() || undefined,
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    selectionFilters,
    selectionMode,
  });

  const { service } = await issuanceService();
  const result = await service.createDraft(parsed);
  revalidateIssuancePaths(documentKind);
  return result;
}

export async function previewCompensationIssuanceBatchAction(batchId: string, documentKind?: HrCompensationIssuanceDocumentKind) {
  const parsed = hrCompensationIssuanceBuildPreviewSchema.parse({ batchId });
  const { service } = await issuanceService();
  const preview = await service.buildPreview(parsed);
  await service.savePreviewLines({
    batchId: parsed.batchId,
    lines: preview.lines.map((line) => ({
      amount: line.amount,
      employeeId: line.employeeId,
      percentage: line.percentage,
      positionId: line.positionId,
      positionLabel: line.positionLabel,
      skipReason: line.skipReason,
    })),
  });
  revalidateIssuancePaths(documentKind ?? preview.documentKind, parsed.batchId);
  return preview;
}

export async function submitCompensationIssuanceBatchAction(batchId: string, documentKind?: HrCompensationIssuanceDocumentKind) {
  const parsed = hrCompensationIssuanceBatchIdSchema.parse({ batchId });
  const { service } = await issuanceService();
  const batch = await service.getBatch(parsed.batchId);
  const result = await service.submitBatch(parsed.batchId);
  revalidateIssuancePaths(documentKind ?? batch.document_kind, parsed.batchId);
  return result;
}

export async function approveCompensationIssuanceBatchAction(batchId: string, documentKind?: HrCompensationIssuanceDocumentKind) {
  const parsed = hrCompensationIssuanceBatchIdSchema.parse({ batchId });
  const { service } = await issuanceService();
  const batch = await service.getBatch(parsed.batchId);
  await service.approveBatch(parsed.batchId);
  revalidateIssuancePaths(documentKind ?? batch.document_kind, parsed.batchId);
}

export async function rejectCompensationIssuanceBatchAction(formData: FormData) {
  const parsed = hrCompensationIssuanceRejectSchema.parse({
    batchId: String(formData.get("batchId") ?? ""),
    documentKind: String(formData.get("documentKind") ?? "") || undefined,
    reason: String(formData.get("reason") ?? ""),
  });
  const { service } = await issuanceService();
  const batch = await service.getBatch(parsed.batchId);
  await service.rejectBatch(parsed.batchId, parsed.reason);
  revalidateIssuancePaths(parsed.documentKind ?? batch.document_kind, parsed.batchId);
}
