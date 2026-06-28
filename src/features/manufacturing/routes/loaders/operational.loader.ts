import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type OperationalLookup = Readonly<{ id: string; label: string }>;
export type BomLineRecord = Readonly<{
  id: string;
  lineNumber: number;
  componentProductId: string;
  quantity: number;
  uomId: string;
  scrapPercent: number;
  operationId: string | null;
  notes: string | null;
  status: string;
}>;
export type RoutingStepRecord = Readonly<{
  id: string;
  stepSequence: number;
  operationId: string;
  workCenterId: string;
  workstationId: string | null;
  estimatedTimeMinutes: number;
  setupTimeMinutes: number;
  runTimeMinutes: number;
  notes: string | null;
  status: string;
}>;
export type PlanLineRecord = Readonly<{
  id: string;
  lineNumber: number;
  manufacturingProductId: string;
  plannedLineId: string;
  plannedQuantity: number;
  actualQuantity: number;
  achievementPercent: number;
  remainingQuantity: number;
  plannedShiftKey: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  priority: string;
  status: string;
}>;

export type ManufacturingOperationalLookups = Readonly<{
  lines: readonly OperationalLookup[];
  operations: readonly OperationalLookup[];
  products: readonly OperationalLookup[];
  uoms: readonly OperationalLookup[];
  workCenters: readonly OperationalLookup[];
  workstations: readonly OperationalLookup[];
}>;

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

async function loadLookups() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [products, uoms, operations, lines, workCenters, workstations] = await Promise.all([
    supabase.from("manufacturing_products").select("id, product_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_uoms").select("id, uom_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("manufacturing_operations").select("id, operation_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("manufacturing_lines").select("id, line_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("branch_id", context.branchId).is("deleted_at", null).order("name"),
    supabase.from("manufacturing_work_centers").select("id, work_center_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("branch_id", context.branchId).is("deleted_at", null).order("name"),
    supabase.from("manufacturing_workstations").select("id, workstation_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("branch_id", context.branchId).is("deleted_at", null).order("name"),
  ]);

  for (const [result, message] of [
    [products, "Could not load product lookups."],
    [uoms, "Could not load UOM lookups."],
    [operations, "Could not load operation lookups."],
    [lines, "Could not load line lookups."],
    [workCenters, "Could not load work center lookups."],
    [workstations, "Could not load workstation lookups."],
  ] as const) {
    if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }

  return {
    context,
    lookups: {
      lines: (lines.data ?? []).map((row) => ({ id: row.id as string, label: `${row.line_key as string} — ${row.name as string}` })),
      operations: (operations.data ?? []).map((row) => ({ id: row.id as string, label: `${row.operation_key as string} — ${row.name as string}` })),
      products: (products.data ?? []).map((row) => ({ id: row.id as string, label: `${row.product_key as string} — ${row.name as string}` })),
      uoms: (uoms.data ?? []).map((row) => ({ id: row.id as string, label: `${row.uom_key as string} — ${row.name as string}` })),
      workCenters: (workCenters.data ?? []).map((row) => ({ id: row.id as string, label: `${row.work_center_key as string} — ${row.name as string}` })),
      workstations: (workstations.data ?? []).map((row) => ({ id: row.id as string, label: `${row.workstation_key as string} — ${row.name as string}` })),
    } satisfies ManufacturingOperationalLookups,
    supabase,
  };
}

export async function loadBomOperationalDetails(bomId: string) {
  const { context, lookups, supabase } = await loadLookups();
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.bomView });
  const { data, error } = await supabase
    .from("manufacturing_bom_lines")
    .select("id, line_number, component_product_id, quantity, uom_id, scrap_percent, operation_id, notes, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("bom_id", bomId)
    .is("deleted_at", null)
    .order("line_number", { ascending: true });

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load BOM lines.", cause: error });

  return {
    lines: (data ?? []).map((row) => ({
      componentProductId: row.component_product_id as string,
      id: row.id as string,
      lineNumber: row.line_number as number,
      notes: row.notes as string | null,
      operationId: row.operation_id as string | null,
      quantity: numberValue(row.quantity),
      scrapPercent: numberValue(row.scrap_percent),
      status: row.status as string,
      uomId: row.uom_id as string,
    })) satisfies BomLineRecord[],
    lookups,
  };
}

export async function loadRoutingOperationalDetails(routingId: string) {
  const { context, lookups, supabase } = await loadLookups();
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.routingView });
  const { data, error } = await supabase
    .from("manufacturing_routing_steps")
    .select("id, step_sequence, operation_id, work_center_id, workstation_id, estimated_time_minutes, setup_time_minutes, run_time_minutes, notes, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("routing_id", routingId)
    .is("deleted_at", null)
    .order("step_sequence", { ascending: true });

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load routing steps.", cause: error });

  return {
    lookups,
    steps: (data ?? []).map((row) => ({
      estimatedTimeMinutes: numberValue(row.estimated_time_minutes),
      id: row.id as string,
      notes: row.notes as string | null,
      operationId: row.operation_id as string,
      runTimeMinutes: numberValue(row.run_time_minutes),
      setupTimeMinutes: numberValue(row.setup_time_minutes),
      status: row.status as string,
      stepSequence: row.step_sequence as number,
      workCenterId: row.work_center_id as string,
      workstationId: row.workstation_id as string | null,
    })) satisfies RoutingStepRecord[],
  };
}

export async function loadPlanOperationalDetails(planId: string) {
  const { context, lookups, supabase } = await loadLookups();
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.planningView });
  const { data, error } = await supabase
    .from("manufacturing_plan_lines")
    .select("id, line_number, manufacturing_product_id, planned_line_id, planned_quantity, planned_shift_key, planned_start, planned_end, priority, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .eq("plan_id", planId)
    .is("deleted_at", null)
    .order("line_number", { ascending: true });

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load production plan lines.", cause: error });

  const rows = data ?? [];
  const actuals = await Promise.all(rows.map(async (row) => {
    const result = await supabase
      .from("manufacturing_daily_reports")
      .select("actual_quantity")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .eq("manufacturing_product_id", row.manufacturing_product_id as string)
      .eq("production_line_id", row.planned_line_id as string)
      .is("deleted_at", null);

    if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load DPR actuals for plan line.", cause: result.error });
    return (result.data ?? []).reduce((total, report) => total + numberValue(report.actual_quantity), 0);
  }));

  return {
    lines: rows.map((row, index) => {
      const planned = numberValue(row.planned_quantity);
      const actual = actuals[index] ?? 0;
      return {
        achievementPercent: planned > 0 ? Math.round((actual / planned) * 10000) / 100 : 0,
        actualQuantity: actual,
        id: row.id as string,
        lineNumber: row.line_number as number,
        manufacturingProductId: row.manufacturing_product_id as string,
        plannedEnd: row.planned_end as string | null,
        plannedLineId: row.planned_line_id as string,
        plannedQuantity: planned,
        plannedShiftKey: row.planned_shift_key as string,
        plannedStart: row.planned_start as string | null,
        priority: (row.priority ?? "normal") as string,
        remainingQuantity: Math.max(planned - actual, 0),
        status: (row.status ?? "draft") as string,
      };
    }) satisfies PlanLineRecord[],
    lookups,
  };
}
