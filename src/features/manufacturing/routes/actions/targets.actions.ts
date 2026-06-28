"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { manufacturingTargetMutationSchema, manufacturingTargetTypeSchema } from "../../application/schemas/targets.schema";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

const basePath = "/erp/manufacturing/targets";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function createParts() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.targetsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

function targetConfig(targetType: string) {
  const parsed = manufacturingTargetTypeSchema.parse(targetType);
  if (parsed === "product") return { table: "manufacturing_product_targets", branchScoped: false };
  if (parsed === "line") return { table: "manufacturing_line_targets", branchScoped: true };
  return { table: "manufacturing_worker_targets", branchScoped: true };
}

function toPayload(input: ReturnType<typeof manufacturingTargetMutationSchema.parse>, context: Awaited<ReturnType<typeof resolveBranchRequestContext>>) {
  const base = {
    company_id: context.companyId,
    is_active: input.status !== "archived" && input.status !== "inactive",
    status: input.status,
    target_key: input.targetKey.toLowerCase(),
    tenant_id: context.tenantId,
    updated_by: context.userId,
  };

  if (input.targetType === "product") {
    return {
      ...base,
      branch_id: context.branchId,
      incentive_calculation_implemented: false,
      manufacturing_product_id: input.manufacturingProductId,
      target_period: input.targetPeriod,
      target_quantity: input.targetQuantity,
    };
  }

  if (input.targetType === "line") {
    return {
      ...base,
      actual_quantity: input.actualQuantity,
      branch_id: context.branchId,
      incentive_calculation_implemented: false,
      manufacturing_product_id: input.manufacturingProductId,
      plan_id: input.planId,
      planned_quantity: input.plannedQuantity,
      production_line_id: input.productionLineId,
    };
  }

  return {
    ...base,
    actual_quantity: input.actualQuantity,
    branch_id: context.branchId,
    payroll_calculation_implemented: false,
    plan_id: input.planId,
    production_line_id: input.productionLineId,
    target_quantity: input.targetQuantity,
    worker_ref_id: input.workerRefId,
  };
}

export async function createManufacturingTargetAction(formData: FormData) {
  const { context, supabase } = await createParts();
  const input = manufacturingTargetMutationSchema.parse(formDataToObject(formData));
  const config = targetConfig(input.targetType);
  const { error } = await supabase
    .from(config.table)
    .insert({ ...toPayload(input, context), created_by: context.userId });

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create manufacturing target.", cause: error });
  }

  revalidatePath(basePath);
}

export async function updateManufacturingTargetAction(targetType: string, id: string, formData: FormData) {
  const { context, supabase } = await createParts();
  const input = manufacturingTargetMutationSchema.parse({ ...formDataToObject(formData), targetType });
  const config = targetConfig(targetType);
  let request = supabase
    .from(config.table)
    .update(toPayload(input, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (config.branchScoped) request = request.eq("branch_id", context.branchId);

  const { error } = await request;

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update manufacturing target.", cause: error });
  }

  revalidatePath(basePath);
}

export async function archiveManufacturingTargetAction(targetType: string, id: string) {
  const { context, supabase } = await createParts();
  const config = targetConfig(targetType);
  let request = supabase
    .from(config.table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (config.branchScoped) request = request.eq("branch_id", context.branchId);

  const { error } = await request;

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive manufacturing target.", cause: error });
  }

  revalidatePath(basePath);
}
