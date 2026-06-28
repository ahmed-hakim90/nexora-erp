"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  manufacturingBomLineMutationSchema,
  manufacturingOrderLifecycleSchema,
  manufacturingPlanLineMutationSchema,
  manufacturingRoutingStepMutationSchema,
  manufacturingWorkOrderLifecycleSchema,
} from "../../application/schemas/operational.schema";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function parts() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

async function loadHeader(table: "manufacturing_boms" | "manufacturing_routings" | "manufacturing_plans", id: string) {
  const { context, supabase } = await parts();
  const { data, error } = await supabase
    .from(table)
    .select("id, tenant_id, company_id, branch_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw new ApplicationError({ code: "NOT_FOUND", message: "Manufacturing header was not found.", cause: error });
  return { context, header: data as { tenant_id: string; company_id: string; branch_id: string | null }, supabase };
}

export async function createBomLineAction(bomId: string, formData: FormData) {
  const input = manufacturingBomLineMutationSchema.parse(formDataToObject(formData));
  const { context, header, supabase } = await loadHeader("manufacturing_boms", bomId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.bomManage });
  const { error } = await supabase.from("manufacturing_bom_lines").insert({
    bom_id: bomId,
    branch_id: header.branch_id,
    company_id: header.company_id,
    component_product_id: input.componentProductId,
    created_by: context.userId,
    line_number: input.lineNumber,
    notes: input.notes,
    operation_id: input.operationId,
    quantity: input.quantity,
    scrap_percent: input.scrapPercent,
    status: input.status,
    tenant_id: header.tenant_id,
    uom_id: input.uomId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create BOM line.", cause: error });
  revalidatePath(`/erp/manufacturing/boms/${bomId}`);
}

export async function updateBomLineAction(bomId: string, lineId: string, formData: FormData) {
  const input = manufacturingBomLineMutationSchema.parse(formDataToObject(formData));
  const { context, supabase } = await loadHeader("manufacturing_boms", bomId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.bomManage });
  const { error } = await supabase.from("manufacturing_bom_lines").update({
    component_product_id: input.componentProductId,
    line_number: input.lineNumber,
    notes: input.notes,
    operation_id: input.operationId,
    quantity: input.quantity,
    scrap_percent: input.scrapPercent,
    status: input.status,
    uom_id: input.uomId,
    updated_by: context.userId,
  }).eq("tenant_id", context.tenantId).eq("bom_id", bomId).eq("id", lineId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update BOM line.", cause: error });
  revalidatePath(`/erp/manufacturing/boms/${bomId}`);
}

export async function archiveBomLineAction(bomId: string, lineId: string) {
  const { context, supabase } = await loadHeader("manufacturing_boms", bomId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.bomManage });
  const { error } = await supabase.from("manufacturing_bom_lines").update({
    deleted_at: new Date().toISOString(),
    deleted_by: context.userId,
    is_active: false,
  }).eq("tenant_id", context.tenantId).eq("bom_id", bomId).eq("id", lineId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive BOM line.", cause: error });
  revalidatePath(`/erp/manufacturing/boms/${bomId}`);
}

export async function createRoutingStepAction(routingId: string, formData: FormData) {
  const input = manufacturingRoutingStepMutationSchema.parse(formDataToObject(formData));
  const { context, header, supabase } = await loadHeader("manufacturing_routings", routingId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.routingManage });
  const { error } = await supabase.from("manufacturing_routing_steps").insert({
    branch_id: header.branch_id,
    company_id: header.company_id,
    created_by: context.userId,
    estimated_time_minutes: input.estimatedTimeMinutes,
    notes: input.notes,
    operation_id: input.operationId,
    routing_id: routingId,
    run_time_minutes: input.runTimeMinutes,
    setup_time_minutes: input.setupTimeMinutes,
    status: input.status,
    step_sequence: input.stepSequence,
    tenant_id: header.tenant_id,
    updated_by: context.userId,
    work_center_id: input.workCenterId,
    workstation_id: input.workstationId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create routing step.", cause: error });
  revalidatePath(`/erp/manufacturing/routing-plans/${routingId}`);
}

export async function updateRoutingStepAction(routingId: string, stepId: string, formData: FormData) {
  const input = manufacturingRoutingStepMutationSchema.parse(formDataToObject(formData));
  const { context, supabase } = await loadHeader("manufacturing_routings", routingId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.routingManage });
  const { error } = await supabase.from("manufacturing_routing_steps").update({
    estimated_time_minutes: input.estimatedTimeMinutes,
    notes: input.notes,
    operation_id: input.operationId,
    run_time_minutes: input.runTimeMinutes,
    setup_time_minutes: input.setupTimeMinutes,
    status: input.status,
    step_sequence: input.stepSequence,
    updated_by: context.userId,
    work_center_id: input.workCenterId,
    workstation_id: input.workstationId,
  }).eq("tenant_id", context.tenantId).eq("routing_id", routingId).eq("id", stepId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update routing step.", cause: error });
  revalidatePath(`/erp/manufacturing/routing-plans/${routingId}`);
}

export async function archiveRoutingStepAction(routingId: string, stepId: string) {
  const { context, supabase } = await loadHeader("manufacturing_routings", routingId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.routingManage });
  const { error } = await supabase.from("manufacturing_routing_steps").update({
    deleted_at: new Date().toISOString(),
    deleted_by: context.userId,
    is_active: false,
  }).eq("tenant_id", context.tenantId).eq("routing_id", routingId).eq("id", stepId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive routing step.", cause: error });
  revalidatePath(`/erp/manufacturing/routing-plans/${routingId}`);
}

export async function createPlanLineAction(planId: string, formData: FormData) {
  const input = manufacturingPlanLineMutationSchema.parse(formDataToObject(formData));
  const { context, header, supabase } = await loadHeader("manufacturing_plans", planId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.planningManage });
  const { error } = await supabase.from("manufacturing_plan_lines").insert({
    branch_id: header.branch_id,
    company_id: header.company_id,
    created_by: context.userId,
    line_number: input.lineNumber,
    manufacturing_product_id: input.manufacturingProductId,
    plan_id: planId,
    planned_end: input.plannedEnd,
    planned_line_id: input.plannedLineId,
    planned_quantity: input.plannedQuantity,
    planned_shift_key: input.plannedShiftKey,
    planned_start: input.plannedStart,
    priority: input.priority,
    status: input.status,
    tenant_id: header.tenant_id,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create production plan line.", cause: error });
  revalidatePath(`/erp/manufacturing/production-plans/${planId}`);
}

export async function updatePlanLineAction(planId: string, lineId: string, formData: FormData) {
  const input = manufacturingPlanLineMutationSchema.parse(formDataToObject(formData));
  const { context, supabase } = await loadHeader("manufacturing_plans", planId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.planningManage });
  const { error } = await supabase.from("manufacturing_plan_lines").update({
    line_number: input.lineNumber,
    manufacturing_product_id: input.manufacturingProductId,
    planned_end: input.plannedEnd,
    planned_line_id: input.plannedLineId,
    planned_quantity: input.plannedQuantity,
    planned_shift_key: input.plannedShiftKey,
    planned_start: input.plannedStart,
    priority: input.priority,
    status: input.status,
    updated_by: context.userId,
  }).eq("tenant_id", context.tenantId).eq("plan_id", planId).eq("id", lineId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update production plan line.", cause: error });
  revalidatePath(`/erp/manufacturing/production-plans/${planId}`);
}

export async function archivePlanLineAction(planId: string, lineId: string) {
  const { context, supabase } = await loadHeader("manufacturing_plans", planId);
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.planningManage });
  const { error } = await supabase.from("manufacturing_plan_lines").update({
    deleted_at: new Date().toISOString(),
    deleted_by: context.userId,
    is_active: false,
  }).eq("tenant_id", context.tenantId).eq("plan_id", planId).eq("id", lineId).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive production plan line.", cause: error });
  revalidatePath(`/erp/manufacturing/production-plans/${planId}`);
}

const manufacturingOrderTransitions: Record<string, readonly string[]> = {
  active: ["completed", "cancelled"],
  draft: ["released", "cancelled"],
  released: ["active", "cancelled"],
};

const workOrderTransitions: Record<string, readonly string[]> = {
  active: ["paused", "completed", "cancelled"],
  draft: ["ready", "cancelled"],
  paused: ["active", "completed", "cancelled"],
  ready: ["active", "cancelled"],
};

async function transitionStatus(table: "manufacturing_orders" | "manufacturing_work_orders", id: string, nextStatus: string, transitions: Record<string, readonly string[]>, path: string) {
  const { context, supabase } = await parts();
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.executionManage });
  const { data, error } = await supabase
    .from(table)
    .select("id, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw new ApplicationError({ code: "NOT_FOUND", message: "Manufacturing execution document was not found.", cause: error });
  const currentStatus = String(data.status);
  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Invalid lifecycle transition from ${currentStatus} to ${nextStatus}.` });
  }
  const result = await supabase.from(table).update({ status: nextStatus, updated_by: context.userId }).eq("tenant_id", context.tenantId).eq("id", id).is("deleted_at", null);
  if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update lifecycle status.", cause: result.error });
  revalidatePath(path);
}

export async function transitionManufacturingOrderAction(orderId: string, formData: FormData) {
  const input = manufacturingOrderLifecycleSchema.parse(formDataToObject(formData));
  await transitionStatus("manufacturing_orders", orderId, input.nextStatus, manufacturingOrderTransitions, `/erp/manufacturing/manufacturing-orders/${orderId}`);
}

export async function transitionWorkOrderAction(workOrderId: string, formData: FormData) {
  const input = manufacturingWorkOrderLifecycleSchema.parse(formDataToObject(formData));
  await transitionStatus("manufacturing_work_orders", workOrderId, input.nextStatus, workOrderTransitions, `/erp/manufacturing/work-orders/${workOrderId}`);
}
