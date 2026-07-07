import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { MANUFACTURING_WORKSPACE_QUICK_ACTIONS } from "../../sprint3-foundation";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type ManufacturingWorkspaceSection = Readonly<{
  key: string;
  label: string;
  description: string;
  count: number;
  emptyMessage: string;
}>;

export type ManufacturingWorkspaceData = Readonly<{
  sections: readonly ManufacturingWorkspaceSection[];
  quickActions: typeof MANUFACTURING_WORKSPACE_QUICK_ACTIONS;
  lastUpdated: string;
}>;

const workspaceSections = [
  {
    countPermission: MANUFACTURING_PERMISSIONS.ordersView,
    description: "Manufacturing orders scheduled for today in the current branch.",
    emptyMessage: "No manufacturing orders are scheduled for today.",
    key: "todayOrders",
    label: "Today's Manufacturing Orders",
    table: "manufacturing_orders",
    todayFilterColumn: "planned_start_at",
  },
  {
    countPermission: MANUFACTURING_PERMISSIONS.operationsView,
    description: "Operation plans derived from routing references for active manufacturing orders.",
    emptyMessage: "No operation plans are available yet.",
    key: "operations",
    label: "Operations",
    table: "manufacturing_operation_plans",
  },
  {
    countPermission: MANUFACTURING_PERMISSIONS.crewView,
    description: "Effective-dated crew assignments referencing HR workers at operation level.",
    emptyMessage: "No crew assignments are available yet.",
    key: "crew",
    label: "Crew",
    table: "manufacturing_crew_assignments",
  },
  {
    countPermission: MANUFACTURING_PERMISSIONS.reportsView,
    description: "Document Engine-ready production reports for the current branch.",
    emptyMessage: "No production reports are available yet.",
    key: "productionReports",
    label: "Production Reports",
    table: "manufacturing_production_reports",
  },
  {
    countPermission: MANUFACTURING_PERMISSIONS.downtimeManage,
    description: "Downtime, scrap, and rework fact tables are ready for future capture workflows.",
    emptyMessage: "No downtime, scrap, or rework facts have been recorded yet.",
    key: "downtimeScrapRework",
    label: "Downtime / Scrap / Rework Readiness",
    table: "manufacturing_production_report_downtime",
  },
] as const;

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function endOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

export async function loadManufacturingWorkspace(): Promise<ManufacturingWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const sections = await Promise.all(
    workspaceSections.map(async (section) => {
      await requirePermission({ context, permission: section.countPermission });

      let request = supabase
        .from(section.table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .eq("branch_id", context.branchId)
        .is("deleted_at", null);

      if ("todayFilterColumn" in section && section.todayFilterColumn) {
        request = request.gte(section.todayFilterColumn, startOfTodayIso()).lte(section.todayFilterColumn, endOfTodayIso());
      }

      const { count, error } = await request;
      if (error) throw error;

      return {
        count: count ?? 0,
        description: section.description,
        emptyMessage: section.emptyMessage,
        key: section.key,
        label: section.label,
      };
    }),
  );

  return {
    lastUpdated: new Date().toISOString(),
    quickActions: MANUFACTURING_WORKSPACE_QUICK_ACTIONS,
    sections,
  };
}
