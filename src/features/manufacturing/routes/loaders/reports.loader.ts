import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type ManufacturingReportMetric = Readonly<{
  key: string;
  label: string;
  value: string;
  description: string;
}>;

export type ManufacturingReportRow = Readonly<{
  key: string;
  label: string;
  planned: number;
  actual: number;
  scrap: number;
  rework: number;
  downtime: number;
  achievementPercent: number;
}>;

export type ManufacturingReportsData = Readonly<{
  metrics: readonly ManufacturingReportMetric[];
  lineRows: readonly ManufacturingReportRow[];
  productRows: readonly ManufacturingReportRow[];
  dailyRows: readonly ManufacturingReportRow[];
  downtimeRows: readonly ManufacturingReportRow[];
  planRows: readonly ManufacturingReportRow[];
  scrapRows: readonly ManufacturingReportRow[];
  workerRows: readonly ManufacturingReportRow[];
  lookups: Readonly<{
    lines: readonly { id: string; label: string }[];
    products: readonly { id: string; label: string }[];
  }>;
}>;

type ReportQuery = Readonly<{
  dateFrom?: string;
  dateTo?: string;
  manufacturingProductId?: string;
  productionLineId?: string;
  shiftKey?: string;
}>;

type DailyReportRow = Readonly<{
  id: string;
  report_key: string;
  report_date: string;
  shift_key: string;
  manufacturing_product_id: string;
  production_line_id: string;
  planned_quantity: number | string;
  actual_quantity: number | string;
  scrap_quantity: number | string;
  rework_quantity: number | string;
  downtime_minutes: number | string;
  worker_output?: unknown;
}>;

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function achievement(planned: number, actual: number) {
  return planned > 0 ? Math.round((actual / planned) * 10000) / 100 : 0;
}

function addToGroup(groups: Map<string, ManufacturingReportRow>, key: string, label: string, row: DailyReportRow) {
  const current = groups.get(key) ?? {
    actual: 0,
    achievementPercent: 0,
    downtime: 0,
    key,
    label,
    planned: 0,
    rework: 0,
    scrap: 0,
  };
  const next = {
    ...current,
    actual: current.actual + toNumber(row.actual_quantity),
    downtime: current.downtime + toNumber(row.downtime_minutes),
    planned: current.planned + toNumber(row.planned_quantity),
    rework: current.rework + toNumber(row.rework_quantity),
    scrap: current.scrap + toNumber(row.scrap_quantity),
  };

  groups.set(key, { ...next, achievementPercent: achievement(next.planned, next.actual) });
}

function parseQuery(query: unknown): ReportQuery {
  const params = typeof query === "object" && query ? query as Record<string, unknown> : {};
  return {
    dateFrom: typeof params.dateFrom === "string" && params.dateFrom ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" && params.dateTo ? params.dateTo : undefined,
    manufacturingProductId: typeof params.manufacturingProductId === "string" && params.manufacturingProductId ? params.manufacturingProductId : undefined,
    productionLineId: typeof params.productionLineId === "string" && params.productionLineId ? params.productionLineId : undefined,
    shiftKey: typeof params.shiftKey === "string" && params.shiftKey ? params.shiftKey : undefined,
  };
}

export async function loadManufacturingReports(query: unknown = {}): Promise<ManufacturingReportsData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.kpisView });
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.dailyReportsView });
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.targetsView });

  const parsed = parseQuery(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  let request = supabase
    .from("manufacturing_daily_reports")
    .select("id, report_key, report_date, shift_key, manufacturing_product_id, production_line_id, planned_quantity, actual_quantity, scrap_quantity, rework_quantity, downtime_minutes, worker_output")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .is("deleted_at", null)
    .order("report_date", { ascending: false })
    .limit(500);

  if (parsed.dateFrom) request = request.gte("report_date", parsed.dateFrom);
  if (parsed.dateTo) request = request.lte("report_date", parsed.dateTo);
  if (parsed.manufacturingProductId) request = request.eq("manufacturing_product_id", parsed.manufacturingProductId);
  if (parsed.productionLineId) request = request.eq("production_line_id", parsed.productionLineId);
  if (parsed.shiftKey) request = request.eq("shift_key", parsed.shiftKey);

  const [reportResult, productResult, lineResult, workerResult, planLineResult] = await Promise.all([
    request,
    supabase
      .from("manufacturing_products")
      .select("id, product_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("manufacturing_lines")
      .select("id, line_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("manufacturing_profiles")
      .select("id, manufacturing_code, default_role")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("manufacturing_code", { ascending: true }),
    supabase
      .from("manufacturing_plan_lines")
      .select("id, line_number, manufacturing_product_id, planned_line_id, planned_quantity, planned_shift_key")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .limit(500),
  ]);
  const { data, error } = reportResult;
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load manufacturing reports.", cause: error });
  }
  if (productResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load report product labels.", cause: productResult.error });
  }
  if (lineResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load report line labels.", cause: lineResult.error });
  }
  if (workerResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load report worker labels.", cause: workerResult.error });
  }
  if (planLineResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load plan vs actual facts.", cause: planLineResult.error });
  }

  const rows = (Array.isArray(data) ? data : []) as unknown as DailyReportRow[];
  const productLabels = new Map((productResult.data ?? []).map((row) => [row.id as string, `${row.product_key as string} — ${row.name as string}`]));
  const lineLabels = new Map((lineResult.data ?? []).map((row) => [row.id as string, `${row.line_key as string} — ${row.name as string}`]));
  const workerLabels = new Map((workerResult.data ?? []).map((row) => [row.id as string, `${row.manufacturing_code as string} — ${row.default_role as string}`]));
  const totalPlanned = rows.reduce((total, row) => total + toNumber(row.planned_quantity), 0);
  const totalActual = rows.reduce((total, row) => total + toNumber(row.actual_quantity), 0);
  const totalScrap = rows.reduce((total, row) => total + toNumber(row.scrap_quantity), 0);
  const totalRework = rows.reduce((total, row) => total + toNumber(row.rework_quantity), 0);
  const totalDowntime = rows.reduce((total, row) => total + toNumber(row.downtime_minutes), 0);
  const byLine = new Map<string, ManufacturingReportRow>();
  const byProduct = new Map<string, ManufacturingReportRow>();
  const byWorker = new Map<string, ManufacturingReportRow>();

  for (const row of rows) {
    addToGroup(byLine, row.production_line_id, lineLabels.get(row.production_line_id) ?? row.production_line_id, row);
    addToGroup(byProduct, row.manufacturing_product_id, productLabels.get(row.manufacturing_product_id) ?? row.manufacturing_product_id, row);
    const workerOutput = Array.isArray(row.worker_output) ? row.worker_output : [];
    for (const worker of workerOutput) {
      if (!worker || typeof worker !== "object" || Array.isArray(worker)) continue;
      const workerRefId = String((worker as Record<string, unknown>).workerRefId ?? "");
      if (!workerRefId) continue;
      const current = byWorker.get(workerRefId) ?? {
        actual: 0,
        achievementPercent: 0,
        downtime: 0,
        key: workerRefId,
        label: workerLabels.get(workerRefId) ?? workerRefId,
        planned: 0,
        rework: 0,
        scrap: 0,
      };
      const next = {
        ...current,
        actual: current.actual + toNumber((worker as Record<string, unknown>).actualQuantity),
        planned: current.planned + toNumber((worker as Record<string, unknown>).targetQuantity),
      };
      byWorker.set(workerRefId, { ...next, achievementPercent: achievement(next.planned, next.actual) });
    }
  }

  const planRows = (planLineResult.data ?? []).map((row) => {
    const actual = rows
      .filter((report) => report.manufacturing_product_id === row.manufacturing_product_id && report.production_line_id === row.planned_line_id)
      .reduce((total, report) => total + toNumber(report.actual_quantity), 0);
    const planned = toNumber(row.planned_quantity);
    return {
      actual,
      achievementPercent: achievement(planned, actual),
      downtime: 0,
      key: row.id as string,
      label: `${row.line_number as number} / ${productLabels.get(row.manufacturing_product_id as string) ?? row.manufacturing_product_id}`,
      planned,
      rework: 0,
      scrap: 0,
    };
  });

  return {
    dailyRows: rows.map((row) => ({
      actual: toNumber(row.actual_quantity),
      achievementPercent: achievement(toNumber(row.planned_quantity), toNumber(row.actual_quantity)),
      downtime: toNumber(row.downtime_minutes),
      key: row.id,
      label: `${row.report_key} / ${row.report_date}`,
      planned: toNumber(row.planned_quantity),
      rework: toNumber(row.rework_quantity),
      scrap: toNumber(row.scrap_quantity),
    })),
    downtimeRows: [...byLine.values()].map((row) => ({ ...row, actual: row.downtime, achievementPercent: 0, planned: 0, rework: 0, scrap: 0 })),
    lineRows: [...byLine.values()],
    lookups: {
      lines: (lineResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.line_key as string} — ${row.name as string}` })),
      products: (productResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.product_key as string} — ${row.name as string}` })),
    },
    metrics: [
      { description: "DPR rows included in the current filters.", key: "reports", label: "Reports", value: String(rows.length) },
      { description: "Actual quantity divided by planned quantity.", key: "achievement", label: "Achievement", value: `${achievement(totalPlanned, totalActual)}%` },
      { description: "Total scrap quantity captured as production facts.", key: "scrap", label: "Scrap", value: totalScrap.toLocaleString("en") },
      { description: "Total rework quantity captured as production facts.", key: "rework", label: "Rework", value: totalRework.toLocaleString("en") },
      { description: "Total downtime minutes captured as production facts.", key: "downtime", label: "Downtime", value: totalDowntime.toLocaleString("en") },
    ],
    planRows,
    productRows: [...byProduct.values()],
    scrapRows: [...byProduct.values()].map((row) => ({ ...row, actual: row.scrap, achievementPercent: 0, planned: 0, downtime: 0 })),
    workerRows: [...byWorker.values()],
  };
}
