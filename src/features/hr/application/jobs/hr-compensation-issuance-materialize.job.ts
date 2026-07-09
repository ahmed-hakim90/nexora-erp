import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB } from "../constants/hr-compensation-issuance.constants";
import { HrCompensationIssuanceBatchService } from "../services/hr-compensation-issuance-batch.service";

type MaterializeJobPayload = Readonly<{
  batchId: string;
  branchId?: string | null;
  companyId: string;
  tenantId: string;
  userId: string;
}>;

function parseMaterializePayload(payload: Record<string, unknown>): MaterializeJobPayload {
  const batchId = String(payload.batchId ?? "");
  const tenantId = String(payload.tenantId ?? "");
  const companyId = String(payload.companyId ?? "");
  const userId = String(payload.userId ?? "");
  if (!batchId || !tenantId || !companyId || !userId) {
    throw new Error("Compensation issuance materialize job payload is incomplete.");
  }
  return {
    batchId,
    branchId: payload.branchId ? String(payload.branchId) : null,
    companyId,
    tenantId,
    userId,
  };
}

function buildJobContext(payload: MaterializeJobPayload): BranchRequestContext {
  return {
    accessToken: "",
    branchId: payload.branchId ?? "",
    companyId: payload.companyId,
    tenantId: payload.tenantId,
    userId: payload.userId,
  } as BranchRequestContext;
}

export async function runCompensationIssuanceMaterializeJob(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<{ createdCount: number; skippedCount: number }> {
  const parsed = parseMaterializePayload(payload);
  const service = new HrCompensationIssuanceBatchService(supabase, buildJobContext(parsed));
  return service.processMaterializeJob(parsed.batchId);
}

export const compensationIssuanceMaterializeJobKey = HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB.key;
