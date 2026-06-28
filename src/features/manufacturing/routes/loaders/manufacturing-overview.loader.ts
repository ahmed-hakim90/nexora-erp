import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type ManufacturingOverviewMetric = Readonly<{
  key: string;
  label: string;
  value: number;
  description: string;
}>;

export type ManufacturingOverviewData = Readonly<{
  metrics: readonly ManufacturingOverviewMetric[];
  lastUpdated: string;
}>;

const manufacturingTables = [
  { key: "products", label: "Manufacturing Products", table: "manufacturing_products", permission: MANUFACTURING_PERMISSIONS.view, description: "Products enabled for manufacturing." },
  { key: "lines", label: "Production Lines", table: "manufacturing_lines", permission: MANUFACTURING_PERMISSIONS.linesView, description: "Production lines." },
  { key: "workCenters", label: "Work Centers", table: "manufacturing_work_centers", permission: MANUFACTURING_PERMISSIONS.workCentersView, description: "Manufacturing work centers." },
  { key: "workstations", label: "Workstations", table: "manufacturing_workstations", permission: MANUFACTURING_PERMISSIONS.workstationsView, description: "Line workstations." },
  { key: "boms", label: "BOM", table: "manufacturing_boms", permission: MANUFACTURING_PERMISSIONS.bomView, description: "Bill of material headers." },
  { key: "routings", label: "Routing", table: "manufacturing_routings", permission: MANUFACTURING_PERMISSIONS.routingView, description: "Routing plans." },
  { key: "plans", label: "Production Plans", table: "manufacturing_plans", permission: MANUFACTURING_PERMISSIONS.planningView, description: "Production plans." },
  { key: "orders", label: "Manufacturing Orders", table: "manufacturing_orders", permission: MANUFACTURING_PERMISSIONS.executionView, description: "Manufacturing orders." },
  { key: "workOrders", label: "Work Orders", table: "manufacturing_work_orders", permission: MANUFACTURING_PERMISSIONS.executionView, description: "Work orders." },
  { key: "dailyReports", label: "Daily Reports", table: "manufacturing_daily_reports", permission: MANUFACTURING_PERMISSIONS.dailyReportsView, description: "Daily production reports." },
  { key: "targets", label: "Targets", table: "manufacturing_product_targets", permission: MANUFACTURING_PERMISSIONS.targetsView, description: "Product target rows." },
] as const;

export async function loadManufacturingOverview(): Promise<ManufacturingOverviewData> {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const metrics = await Promise.all(
    manufacturingTables.map(async (item) => {
      await requirePermission({ context, permission: item.permission });
      let request = supabase
        .from(item.table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .is("deleted_at", null);

      if (item.table !== "manufacturing_products" && item.table !== "manufacturing_boms" && item.table !== "manufacturing_routings") {
        request = request.eq("branch_id", context.branchId);
      }

      const { count, error } = await request;

      if (error) throw error;

      return {
        description: item.description,
        key: item.key,
        label: item.label,
        value: count ?? 0,
      };
    }),
  );

  return { lastUpdated: new Date().toISOString(), metrics };
}
