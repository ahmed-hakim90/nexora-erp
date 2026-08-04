import "server-only";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  explodeBomLines,
  isApprovedBomStatus,
  type BomExplosionResult,
} from "../../domain/bom-explosion";
import { assessRoutingReadiness, type RoutingReadinessResult } from "../../domain/routing-readiness";
import {
  resolveProductionStandard,
  type ProductionStandardCandidate,
  type ProductionStandardResolveQuery,
} from "../../domain/production-standard-resolver";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export class ManufacturingEngineeringService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Explodes an approved/active BOM into theoretical material requirements.
   * Preview mode allows draft BOMs for engineering review without claiming approval.
   */
  async explodeBom(input: Readonly<{
    bomId: string;
    finishedQuantity: number;
    requireApproved?: boolean;
  }>): Promise<BomExplosionResult & Readonly<{ bomId: string; bomStatus: string; approved: boolean }>> {
    await requirePermission({ context: this.context, permission: MANUFACTURING_PERMISSIONS.bomView });

    const { data: bom, error: bomError } = await this.supabase
      .from("manufacturing_boms")
      .select("id, status, manufacturing_product_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.bomId)
      .is("deleted_at", null)
      .maybeSingle();

    if (bomError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load BOM for explosion.", cause: bomError });
    }
    if (!bom) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "BOM was not found." });
    }

    const bomStatus = String(bom.status ?? "");
    const approved = isApprovedBomStatus(bomStatus);
    if (input.requireApproved !== false && !approved) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Only an active (approved) BOM can be exploded for planning. Activate the BOM after adding component lines.",
      });
    }

    const { data: lines, error: lineError } = await this.supabase
      .from("manufacturing_bom_lines")
      .select("id, line_number, component_product_id, quantity, uom_id, scrap_percent, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("bom_id", input.bomId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("line_number", { ascending: true });

    if (lineError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load BOM lines for explosion.", cause: lineError });
    }

    try {
      const exploded = explodeBomLines(
        input.finishedQuantity,
        (lines ?? []).map((row) => ({
          componentProductId: String(row.component_product_id),
          lineId: String(row.id),
          lineNumber: numberValue(row.line_number),
          quantity: numberValue(row.quantity),
          scrapPercent: numberValue(row.scrap_percent),
          status: String(row.status ?? "draft"),
          uomId: String(row.uom_id),
        })),
      );

      if (exploded.lineCount < 1) {
        throw new ApplicationError({
          code: "VALIDATION_ERROR",
          message: "BOM has no explodable component lines.",
        });
      }

      return {
        ...exploded,
        approved,
        bomId: input.bomId,
        bomStatus,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "BOM explosion failed.",
      });
    }
  }

  async assessRouting(routingId: string): Promise<RoutingReadinessResult & Readonly<{ routingId: string; status: string }>> {
    await requirePermission({ context: this.context, permission: MANUFACTURING_PERMISSIONS.routingView });

    const { data: routing, error: routingError } = await this.supabase
      .from("manufacturing_routings")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", routingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (routingError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load routing.", cause: routingError });
    }
    if (!routing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Routing was not found." });
    }

    const { data: steps, error: stepError } = await this.supabase
      .from("manufacturing_routing_steps")
      .select("step_sequence, operation_id, work_center_id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("routing_id", routingId)
      .is("deleted_at", null)
      .order("step_sequence", { ascending: true });

    if (stepError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load routing steps.", cause: stepError });
    }

    const readiness = assessRoutingReadiness({
      status: String(routing.status ?? ""),
      steps: (steps ?? []).map((row) => ({
        operationId: String(row.operation_id ?? ""),
        status: String(row.status ?? "draft"),
        stepSequence: numberValue(row.step_sequence),
        workCenterId: String(row.work_center_id ?? ""),
      })),
    });

    return {
      ...readiness,
      routingId,
      status: String(routing.status ?? ""),
    };
  }

  async resolveStandard(query: ProductionStandardResolveQuery): Promise<ProductionStandardCandidate | null> {
    await requirePermission({ context: this.context, permission: MANUFACTURING_PERMISSIONS.workersView });

    let request = this.supabase
      .from("production_standards")
      .select("id, product_id, production_line_id, shift_id, daily_target_qty, standard_crew_size, effective_from, effective_to, is_active")
      .eq("tenant_id", this.context.tenantId)
      .eq("product_id", query.productId)
      .eq("production_line_id", query.productionLineId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (this.context.companyId) {
      request = request.eq("company_id", this.context.companyId);
    }

    const { data, error } = await request;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve production standard.", cause: error });
    }

    return resolveProductionStandard(
      (data ?? []).map((row) => ({
        dailyTargetQty: numberValue(row.daily_target_qty),
        effectiveFrom: String(row.effective_from ?? ""),
        effectiveTo: row.effective_to == null ? null : String(row.effective_to),
        id: String(row.id),
        isActive: row.is_active === true,
        productId: String(row.product_id),
        productionLineId: String(row.production_line_id),
        shiftId: row.shift_id == null ? null : String(row.shift_id),
        standardCrewSize: numberValue(row.standard_crew_size),
      })),
      query,
    );
  }
}
