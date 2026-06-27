import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260625160000_manufacturing_foundation.sql");
const migration = readFileSync(migrationPath, "utf8");

const requiredTables = [
  "departments",
  "job_positions",
  "employees",
  "production_lines",
  "work_centers",
  "production_shifts",
  "production_calendars",
  "manufacturing_profiles",
  "manufacturing_line_assignments",
  "supervisor_line_assignments",
  "production_standards",
  "manufacturing_settings",
  "manufacturing_routing_plans",
  "manufacturing_routing_steps",
  "manufacturing_boms",
  "manufacturing_bom_lines",
];

const forbiddenTables = [
  "production_workers",
  "production_worker_targets",
  "production_sessions",
  "production_reports",
  "daily_production_reports",
  "work_orders",
  "production_plans",
  "production_attendance_records",
  "worker_performance_summaries",
  "production_postings",
  "material_consumption",
  "finished_goods_output",
  "hr_payroll",
  "payroll",
  "hr_attendance",
  "attendance_records",
  "leaves",
  "loans",
  "penalties",
  "contracts",
  "payslips",
  "salary_rules",
];

const requiredPermissions = [
  "manufacturing.view",
  "manufacturing.manage",
  "manufacturing.lines.view",
  "manufacturing.lines.manage",
  "manufacturing.work_centers.view",
  "manufacturing.work_centers.manage",
  "manufacturing.workers.view",
  "manufacturing.workers.manage",
  "manufacturing.assignments.manage",
  "manufacturing.targets.manage",
  "manufacturing.bom.view",
  "manufacturing.bom.manage",
  "manufacturing.routing.view",
  "manufacturing.routing.manage",
];

const requiredEvents = [
  "manufacturing.line.created",
  "manufacturing.line.updated",
  "manufacturing.worker.created",
  "manufacturing.worker.assigned",
  "manufacturing.bom.created",
  "manufacturing.routing.created",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table public.${table}`)) throw new Error(`Missing Sprint 12 table: ${table}`);
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled for ${table}`);
  if (!migration.includes(`alter table public.${table} force row level security`)) throw new Error(`RLS is not forced for ${table}`);
  if (!migration.includes(` on public.${table} for insert`) || !migration.includes("with check")) {
    throw new Error(`Missing WITH CHECK policy for ${table}`);
  }
}

for (const forbiddenTable of forbiddenTables) {
  const forbiddenCreate = new RegExp(`create\\s+table\\s+public\\.${forbiddenTable}\\b`, "i");
  if (forbiddenCreate.test(migration)) throw new Error(`Sprint 12 must not create forbidden table: ${forbiddenTable}`);
}

for (const permission of requiredPermissions) {
  if (!migration.includes(permission)) throw new Error(`Missing manufacturing permission: ${permission}`);
}

for (const event of requiredEvents) {
  if (!migration.includes(event)) throw new Error(`Missing durable manufacturing event policy: ${event}`);
}

for (const required of [
  "enforce_manufacturing_foundation_scope",
  "product + line + shift",
  "product + line",
  "product default manufacturing target placeholder",
  "target per worker = production standard daily target quantity / counted production workers",
  "manufacturing profile employee reference is tenant-safe",
  "line assignment manufacturing profile must belong to tenant",
  "supervisor employee reference is tenant-safe",
  "BOM product must be active, manufacturable, finished good or semi-finished",
  "BOM material must be active raw material or packaging product",
  "routing plan product must be active, manufacturable, finished good or semi-finished",
  "no_material_consumption",
  "no_inventory_posting",
]) {
  if (!migration.includes(required)) throw new Error(`Missing manufacturing foundation guard: ${required}`);
}

if (/insert\s+into\s+public\.stock_ledger_entries|update\s+public\.stock_balances|\.post\(/i.test(migration)) {
  throw new Error("Manufacturing foundation migration must not post inventory.");
}

const manufacturingProfilesDefinition = migration.match(/create table public\.manufacturing_profiles \(([\s\S]*?\n\);)/);
if (!manufacturingProfilesDefinition) throw new Error("manufacturing_profiles table definition was not found.");
for (const forbiddenColumn of ["name_ar", "name_en", "work_phone", "work_email", "department_id", "salary", "payroll", "personal"]) {
  if (manufacturingProfilesDefinition[1].includes(forbiddenColumn)) {
    throw new Error(`manufacturing_profiles must not duplicate employee personal/core data: ${forbiddenColumn}`);
  }
}

const srcFiles = listFiles(resolve("src")).filter((path) => /\.(ts|tsx)$/.test(path));
const manufacturingFiles = srcFiles.filter((path) => path.includes("/src/features/manufacturing/") || path.includes("/src/app/(erp)/erp/manufacturing/"));

for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");

  if (file.includes("/src/features/") && /@\/features\/[^/]+\/(application|infrastructure|routes|domain)\//.test(text)) {
    throw new Error(`Private cross-feature import found: ${file}`);
  }

  if (file.includes("/src/app/") && text.includes("createRequestSupabaseClient")) {
    throw new Error(`Supabase query/client found directly in UI route: ${file}`);
  }
}

for (const file of manufacturingFiles) {
  const text = readFileSync(file, "utf8");

  for (const forbidden of [
    "production_workers",
    "production_worker_targets",
    "production_sessions",
    "production_reports",
    "work_orders",
    "production_plans",
    "stock_balances",
    "stock_ledger_entries",
    "postInventory",
    "StockPostingService",
  ]) {
    if (text.includes(forbidden)) throw new Error(`Forbidden Sprint 12 execution concept found in ${file}: ${forbidden}`);
  }
}

const manufacturingService = readFileSync(resolve("src/features/manufacturing/application/services/manufacturing-foundation.service.ts"), "utf8");
if (!manufacturingService.includes("this.outbox.enqueue")) throw new Error("Manufacturing foundation events must use durable outbox.");
if (manufacturingService.includes("@/features/inventory") || manufacturingService.includes("StockPostingService")) {
  throw new Error("Manufacturing foundation services must not call inventory posting.");
}
for (const forbiddenServiceName of ["ProductionWorkerService", "WorkerAssignmentService", "WorkerTargetService"]) {
  if (manufacturingService.includes(forbiddenServiceName)) throw new Error(`Old manufacturing service name remains: ${forbiddenServiceName}`);
}
for (const requiredServiceName of ["ManufacturingProfileService", "ManufacturingLineAssignmentService", "ProductionStandardService"]) {
  if (!manufacturingService.includes(requiredServiceName)) throw new Error(`Corrected manufacturing service name missing: ${requiredServiceName}`);
}

for (const requiredPath of [
  "src/features/manufacturing/module.manifest.ts",
  "src/features/manufacturing/public-api.ts",
  "src/features/manufacturing/permissions/permission-registry.ts",
  "src/features/manufacturing/application/schemas/manufacturing.schema.ts",
  "src/features/manufacturing/domain/rules/manufacturing-foundation.rules.ts",
  "src/features/manufacturing/infrastructure/repositories/manufacturing.repository.ts",
  "src/features/manufacturing/application/services/manufacturing-foundation.service.ts",
  "src/features/manufacturing/routes/actions/manufacturing.actions.ts",
  "src/app/(erp)/erp/manufacturing/page.tsx",
]) {
  if (!existsSync(resolve(requiredPath))) throw new Error(`Missing manufacturing module file: ${requiredPath}`);
}

console.log("Sprint 12 manufacturing foundation verification passed.");

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return [path];
  });
}
