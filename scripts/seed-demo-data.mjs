#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEMO_TENANT_ID", "DEMO_COMPANY_ID", "DEMO_BRANCH_ID"];
const missing = required.filter((key) => !process.env[key]);

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed is blocked when NODE_ENV=production.");
}

if (process.env.NEXORA_DEMO_SEED !== "confirm") {
  throw new Error("Set NEXORA_DEMO_SEED=confirm to load development/demo data.");
}

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const tenantId = process.env.DEMO_TENANT_ID;
const companyId = process.env.DEMO_COMPANY_ID;
const branchId = process.env.DEMO_BRANCH_ID;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const metadata = { demo_seed: true, development_only: true, seed_name: "erp-production-readiness" };

async function getOrCreate(table, match, payload) {
  let request = supabase.from(table).select("id").limit(1);
  for (const [key, value] of Object.entries(match)) request = request.eq(key, value);
  const existing = await request.maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;
  const inserted = await supabase.from(table).insert(payload).select("id").single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id;
}

async function main() {
  const uomCategoryId = await getOrCreate("inventory_uom_categories", { tenant_id: tenantId, company_id: companyId, category_key: "demo-quantity" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    category_key: "demo-quantity",
    name: "Demo Quantity",
    uom_kind: "quantity",
    metadata,
  });

  const eachUomId = await getOrCreate("inventory_uoms", { tenant_id: tenantId, company_id: companyId, uom_key: "each" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    uom_category_id: uomCategoryId,
    uom_key: "each",
    name: "Each",
    symbol: "ea",
    is_base_uom: true,
    metadata,
  });

  const productCategoryId = await getOrCreate("inventory_product_categories", { tenant_id: tenantId, company_id: companyId, category_key: "demo-finished-goods" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    category_key: "demo-finished-goods",
    name: "Demo Finished Goods",
    metadata,
  });

  const blenderInventoryId = await getOrCreate("inventory_products", { tenant_id: tenantId, company_id: companyId, product_key: "blender-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    product_category_id: productCategoryId,
    base_uom_id: eachUomId,
    product_key: "blender-001",
    sku: "BLENDER-001",
    name: "Sokany Blender 500W",
    product_kind: "stockable",
    tracking_mode: "none",
    reservation_policy: "soft",
    metadata,
  });

  const motorInventoryId = await getOrCreate("inventory_products", { tenant_id: tenantId, company_id: companyId, product_key: "motor-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    product_category_id: productCategoryId,
    base_uom_id: eachUomId,
    product_key: "motor-001",
    sku: "MOTOR-001",
    name: "Blender Motor Assembly",
    product_kind: "stockable",
    tracking_mode: "none",
    reservation_policy: "soft",
    metadata,
  });

  const warehouseId = await getOrCreate("inventory_warehouses", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, warehouse_key: "main-cairo" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    warehouse_key: "main-cairo",
    name: "Main Warehouse — Cairo",
    warehouse_type: "main",
    metadata,
  });

  await getOrCreate("inventory_locations", { tenant_id: tenantId, warehouse_id: warehouseId, location_key: "fg-a1" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    warehouse_id: warehouseId,
    location_key: "fg-a1",
    name: "Finished Goods A1",
    location_kind: "bin",
    metadata,
  });

  const blenderProductId = await getOrCreate("manufacturing_products", { tenant_id: tenantId, company_id: companyId, product_key: "blender-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    inventory_product_id: blenderInventoryId,
    product_key: "blender-001",
    name: "Sokany Blender 500W",
    status: "active",
    metadata,
  });

  const motorProductId = await getOrCreate("manufacturing_products", { tenant_id: tenantId, company_id: companyId, product_key: "motor-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    inventory_product_id: motorInventoryId,
    product_key: "motor-001",
    name: "Blender Motor Assembly",
    status: "active",
    metadata,
  });

  const workCenterId = await getOrCreate("manufacturing_work_centers", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, work_center_key: "wc-assembly-a" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    work_center_key: "wc-assembly-a",
    name: "Assembly Hall A",
    capacity: 120,
    status: "active",
    metadata,
  });

  const lineId = await getOrCreate("manufacturing_lines", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, line_key: "line-01" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    work_center_id: workCenterId,
    line_key: "line-01",
    name: "Line 01 — Assembly Hall A",
    status: "active",
    metadata,
  });

  const workstationId = await getOrCreate("manufacturing_workstations", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, workstation_key: "ws-assembly-01" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    work_center_id: workCenterId,
    line_id: lineId,
    workstation_key: "ws-assembly-01",
    name: "Assembly Station 01",
    status: "active",
    metadata,
  });

  const operationId = await getOrCreate("manufacturing_operations", { tenant_id: tenantId, company_id: companyId, operation_key: "assemble" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    operation_key: "assemble",
    name: "Final Assembly",
    operation_kind: "run",
    standard_minutes: 12,
    status: "active",
    metadata,
  });

  const employeeId = await getOrCreate("employees", { tenant_id: tenantId, employee_code: "DEMO-WORKER-001" }, {
    tenant_id: tenantId,
    branch_id: branchId,
    employee_code: "DEMO-WORKER-001",
    name_ar: "أحمد حسن",
    name_en: "Ahmed Hassan",
    employment_status: "active",
  });

  const workerId = await getOrCreate("manufacturing_profiles", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, manufacturing_code: "worker-ahmed" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    employee_id: employeeId,
    manufacturing_code: "worker-ahmed",
    default_line_id: lineId,
    default_role: "Production Worker",
    skill_level: "intermediate",
    production_enabled: true,
    metadata,
  });

  const bomId = await getOrCreate("manufacturing_boms", { tenant_id: tenantId, company_id: companyId, manufacturing_product_id: blenderProductId, bom_key: "bom-blender-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    manufacturing_product_id: blenderProductId,
    bom_key: "bom-blender-001",
    version_key: "v1",
    status: "draft",
    metadata,
  });

  await getOrCreate("manufacturing_bom_lines", { tenant_id: tenantId, bom_id: bomId, line_number: 1 }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    bom_id: bomId,
    line_number: 1,
    component_product_id: motorProductId,
    quantity: 1,
    uom_id: eachUomId,
    scrap_percent: 2,
    operation_id: operationId,
    metadata,
  });

  const routingId = await getOrCreate("manufacturing_routings", { tenant_id: tenantId, company_id: companyId, manufacturing_product_id: blenderProductId, routing_key: "routing-blender-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    manufacturing_product_id: blenderProductId,
    routing_key: "routing-blender-001",
    version_key: "v1",
    status: "draft",
    metadata,
  });

  await getOrCreate("manufacturing_routing_steps", { tenant_id: tenantId, routing_id: routingId, step_sequence: 10 }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: null,
    routing_id: routingId,
    step_sequence: 10,
    operation_id: operationId,
    work_center_id: workCenterId,
    workstation_id: workstationId,
    estimated_time_minutes: 15,
    setup_time_minutes: 3,
    run_time_minutes: 12,
    metadata,
  });

  const planId = await getOrCreate("manufacturing_plans", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, plan_key: "demo-plan-today" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    plan_key: "demo-plan-today",
    plan_date: new Date().toISOString().slice(0, 10),
    status: "draft",
    metadata,
  });

  const planLineId = await getOrCreate("manufacturing_plan_lines", { tenant_id: tenantId, plan_id: planId, line_number: 1 }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    plan_id: planId,
    manufacturing_product_id: blenderProductId,
    planned_line_id: lineId,
    line_number: 1,
    planned_quantity: 120,
    planned_shift_key: "shift-a",
    priority: "normal",
    status: "draft",
    metadata,
  });

  const orderId = await getOrCreate("manufacturing_orders", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, order_key: "mo-demo-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    plan_line_id: planLineId,
    manufacturing_product_id: blenderProductId,
    order_key: "mo-demo-001",
    planned_quantity: 120,
    status: "draft",
    metadata,
  });

  await getOrCreate("manufacturing_work_orders", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, work_order_key: "wo-demo-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    manufacturing_order_id: orderId,
    operation_id: operationId,
    work_order_key: "wo-demo-001",
    planned_quantity: 120,
    status: "draft",
    metadata,
  });

  await getOrCreate("manufacturing_daily_reports", { tenant_id: tenantId, company_id: companyId, branch_id: branchId, report_key: "dpr-demo-001" }, {
    tenant_id: tenantId,
    company_id: companyId,
    branch_id: branchId,
    report_key: "dpr-demo-001",
    report_date: new Date().toISOString().slice(0, 10),
    shift_key: "shift-a",
    manufacturing_product_id: blenderProductId,
    production_line_id: lineId,
    supervisor_ref_id: workerId,
    planned_quantity: 120,
    actual_quantity: 96,
    worker_output: [{ workerRefId: workerId, targetQuantity: 120, actualQuantity: 96 }],
    scrap_quantity: 3,
    rework_quantity: 2,
    downtime_minutes: 15,
    status: "draft",
    metadata,
  });

  console.log("Demo ERP production-readiness data loaded for tenant/company/branch scope.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
