import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import type { PermissionKey } from "@/platform/permissions/public-api";
import { INVENTORY_PERMISSIONS } from "@/features/inventory/public-api";

import type { ManufacturingResourceDefinition } from "../../application/types";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type ManufacturingLookupOption = Readonly<{
  id: string;
  label: string;
  meta?: string;
}>;

export type ManufacturingLookupOptions = Readonly<Record<string, readonly ManufacturingLookupOption[]>>;

type LookupConfig = Readonly<{
  table: string;
  select: string;
  labelColumn: string;
  metaColumn: string;
  permission: PermissionKey;
  scope: "tenant" | "company" | "branch";
}>;

const lookupConfigs: Record<string, LookupConfig | readonly LookupConfig[]> = {
  bomId: {
    labelColumn: "bom_key",
    metaColumn: "version_key",
    permission: MANUFACTURING_PERMISSIONS.bomView,
    scope: "company",
    select: "id, bom_key, version_key",
    table: "manufacturing_boms",
  },
  defaultLineId: {
    labelColumn: "name",
    metaColumn: "line_key",
    permission: MANUFACTURING_PERMISSIONS.linesView,
    scope: "branch",
    select: "id, line_key, name",
    table: "manufacturing_lines",
  },
  employeeId: {
    labelColumn: "name_en",
    metaColumn: "employee_code",
    permission: MANUFACTURING_PERMISSIONS.workersView,
    scope: "tenant",
    select: "id, employee_code, name_en",
    table: "employees",
  },
  inventoryProductId: [
    {
      labelColumn: "name",
      metaColumn: "sku",
      permission: INVENTORY_PERMISSIONS.productsView,
      scope: "company",
      select: "id, sku, name",
      table: "inventory_products",
    },
    {
      labelColumn: "name_en",
      metaColumn: "sku",
      permission: INVENTORY_PERMISSIONS.productsView,
      scope: "tenant",
      select: "id, sku, name_en",
      table: "products",
    },
  ],
  lineId: {
    labelColumn: "name",
    metaColumn: "line_key",
    permission: MANUFACTURING_PERMISSIONS.linesView,
    scope: "branch",
    select: "id, line_key, name",
    table: "manufacturing_lines",
  },
  manufacturingOrderId: {
    labelColumn: "order_key",
    metaColumn: "status",
    permission: MANUFACTURING_PERMISSIONS.executionView,
    scope: "branch",
    select: "id, order_key, status",
    table: "manufacturing_orders",
  },
  manufacturingProductId: {
    labelColumn: "name",
    metaColumn: "product_key",
    permission: MANUFACTURING_PERMISSIONS.view,
    scope: "company",
    select: "id, product_key, name",
    table: "manufacturing_products",
  },
  manufacturingProfileId: {
    labelColumn: "manufacturing_code",
    metaColumn: "default_role",
    permission: MANUFACTURING_PERMISSIONS.workersView,
    scope: "branch",
    select: "id, manufacturing_code, default_role",
    table: "manufacturing_profiles",
  },
  operationId: {
    labelColumn: "name",
    metaColumn: "operation_key",
    permission: MANUFACTURING_PERMISSIONS.operationsView,
    scope: "company",
    select: "id, operation_key, name",
    table: "manufacturing_operations",
  },
  planId: {
    labelColumn: "plan_key",
    metaColumn: "status",
    permission: MANUFACTURING_PERMISSIONS.planningView,
    scope: "branch",
    select: "id, plan_key, status",
    table: "manufacturing_plans",
  },
  planLineId: {
    labelColumn: "line_number",
    metaColumn: "planned_shift_key",
    permission: MANUFACTURING_PERMISSIONS.planningView,
    scope: "branch",
    select: "id, line_number, planned_shift_key",
    table: "manufacturing_plan_lines",
  },
  productionLineId: {
    labelColumn: "name",
    metaColumn: "line_key",
    permission: MANUFACTURING_PERMISSIONS.linesView,
    scope: "branch",
    select: "id, line_key, name",
    table: "manufacturing_lines",
  },
  productId: {
    labelColumn: "name",
    metaColumn: "product_key",
    permission: MANUFACTURING_PERMISSIONS.view,
    scope: "company",
    select: "id, product_key, name",
    table: "manufacturing_products",
  },
  routingId: {
    labelColumn: "routing_key",
    metaColumn: "version_key",
    permission: MANUFACTURING_PERMISSIONS.routingView,
    scope: "company",
    select: "id, routing_key, version_key",
    table: "manufacturing_routings",
  },
  workCenterId: {
    labelColumn: "name",
    metaColumn: "work_center_key",
    permission: MANUFACTURING_PERMISSIONS.workCentersView,
    scope: "branch",
    select: "id, work_center_key, name",
    table: "manufacturing_work_centers",
  },
  workstationId: {
    labelColumn: "name",
    metaColumn: "workstation_key",
    permission: MANUFACTURING_PERMISSIONS.workstationsView,
    scope: "branch",
    select: "id, workstation_key, name",
    table: "manufacturing_workstations",
  },
};

function normalizeLookupConfigs(config: LookupConfig | readonly LookupConfig[]): readonly LookupConfig[] {
  if ("table" in config) return [config];
  return [...config];
}

function isMissingLookupSourceError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "PGRST205" || code === "PGRST204" || code === "42P01" || /could not find (the )?(table|column)/i.test(message);
}

function formatOption(row: Record<string, unknown>, config: LookupConfig): ManufacturingLookupOption {
  const label = String(row[config.labelColumn] ?? row.id);
  const metaValue = row[config.metaColumn];
  const meta = metaValue == null ? undefined : String(metaValue);

  return {
    id: String(row.id),
    label: meta ? `${meta} — ${label}` : label,
  };
}

export async function loadManufacturingFormLookups(definition: ManufacturingResourceDefinition): Promise<ManufacturingLookupOptions> {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const fieldConfigs = definition.formFields
    .map((field) => [field.name, lookupConfigs[field.name], field.isRequired] as const)
    .filter((entry): entry is readonly [string, LookupConfig | readonly LookupConfig[], boolean] => Boolean(entry[1]));

  const entries = await Promise.all(
    fieldConfigs.map(async ([fieldName, configOrConfigs, isRequired]) => {
      let lastError: unknown;

      for (const config of normalizeLookupConfigs(configOrConfigs)) {
        await requirePermission({ context, permission: config.permission });
        let request = supabase
          .from(config.table)
          .select(config.select)
          .eq("tenant_id", context.tenantId)
          .is("deleted_at", null)
          .order(config.labelColumn, { ascending: true })
          .limit(100);

        if (config.scope === "company" || config.scope === "branch") {
          request = request.eq("company_id", context.companyId);
        }

        if (config.scope === "branch") {
          request = request.eq("branch_id", context.branchId);
        }

        const { data, error } = await request;
        if (!error) {
          const rows = Array.isArray(data) ? data : [];
          return [fieldName, rows.map((row: unknown) => formatOption(row as Record<string, unknown>, config))] as const;
        }

        lastError = error;
        if (!isMissingLookupSourceError(error)) throw error;
      }

      if (isRequired && lastError) throw lastError;
      return [fieldName, []] as const;
    }),
  );

  return Object.fromEntries(entries);
}
