export type FoundationEntity = Readonly<{
  key: string;
  title: string;
  description: string;
  primaryActions: readonly string[];
  fields: readonly string[];
  relationships: readonly string[];
  permissions: readonly string[];
  reconciliationItems?: readonly string[];
}>;

export type DashboardMetric = Readonly<{
  key: string;
  label: string;
  value: string;
  description: string;
}>;

export const reconciliationItems = [
  {
    key: "RI-01",
    title: "Finance platform and business finance definitions overlap",
    description: "Fiscal years, periods, currencies, taxes, payment terms, and dimensions exist in both finance_* and financial_* models with different field/status vocabulary.",
  },
  {
    key: "RI-02",
    title: "Inventory runtime still uses legacy master-data and stock tables",
    description: "The UX is designed against inventory_* contracts; legacy products/units/warehouses/stock_* remain compatibility layers.",
  },
  {
    key: "RI-03",
    title: "Manufacturing runtime does not yet consume Business App 3 contracts",
    description: "DPR, plans, MOs, WOs, machines, workstations, and target tables are contract-first UI models until runtime catches up.",
  },
  {
    key: "RI-04",
    title: "Tax definitions are split across three concepts",
    description: "finance_tax_definitions, financial_tax_*, and tax-profiles must be reconciled into a clear UX vocabulary.",
  },
  {
    key: "RI-05",
    title: "Production standards and Foundation targets both model targets",
    description: "production_standards is treated as compatibility; product, line, and worker target contracts are canonical for the UI.",
  },
  {
    key: "RI-06",
    title: "Terminology varies between legacy and Foundation models",
    description: "UOM vs Unit, code vs key, product_type vs product_kind, cost_center vs cost-center, and cycle_count vs cycle-count need a canonical glossary.",
  },
  {
    key: "RI-07",
    title: "Raw UUID inputs must become lookups",
    description: "All relationship fields move to EntityLookup/combobox UX with permission-aware query providers.",
  },
] as const;

export const financeEntities: readonly FoundationEntity[] = [
  {
    key: "chart-of-accounts",
    title: "Chart of Accounts",
    description: "Tree/table workspace for finance_accounts and finance_account_types.",
    fields: ["account_code", "name", "account_type_id", "parent_account_id", "currency_code", "cost_center_required", "dimension_requirements", "status"],
    relationships: ["Account Type", "Parent Account", "Currency", "Cost Centers", "Dimensions"],
    primaryActions: ["Create Account", "Import Accounts", "Bulk Activate", "Export CoA"],
    permissions: ["finance.accounts.view", "finance.accounts.manage"],
    reconciliationItems: ["RI-01"],
  },
  {
    key: "journals",
    title: "Journals",
    description: "Journal definition workspace; no journal-entry posting is introduced in this UI phase.",
    fields: ["journal_key", "name", "journal_kind", "default_currency_code", "requires_approval", "posting_enabled"],
    relationships: ["Currency", "Approval readiness", "Posting lifecycle readiness"],
    primaryActions: ["Create Journal", "Manage Approval Readiness", "Export"],
    permissions: ["finance.journals.view", "finance.journals.manage"],
    reconciliationItems: ["RI-01"],
  },
  {
    key: "fiscal-periods",
    title: "Fiscal Years & Periods",
    description: "Calendar timeline for fiscal years, opening/regular/adjustment/closing periods, and locks.",
    fields: ["fiscal_year_key", "fiscal_period_key", "starts_on", "ends_on", "period_kind", "status"],
    relationships: ["Company", "Accounting Period", "Posting Readiness"],
    primaryActions: ["Create Fiscal Year", "Generate Periods", "Lock Period", "Export Calendar"],
    permissions: ["finance.fiscal-periods.view", "finance.fiscal-periods.manage"],
    reconciliationItems: ["RI-01"],
  },
  {
    key: "dimensions",
    title: "Cost Centers & Dimensions",
    description: "Dimension management including cost center, branch, warehouse, employee, product, and custom references.",
    fields: ["dimension_key", "name", "dimension_kind", "reference_entity_type", "required_for_posting", "status"],
    relationships: ["Account dimension requirements", "Cost center links", "Reference entities"],
    primaryActions: ["Create Dimension", "Create Cost Center", "Bulk Lock", "Export"],
    permissions: ["finance.dimensions.view", "finance.dimensions.manage"],
    reconciliationItems: ["RI-01", "RI-06"],
  },
];

export const inventoryEntities: readonly FoundationEntity[] = [
  {
    key: "products",
    title: "Products & Variants",
    description: "Product master workspace with variants, tracking mode, reservation policy, lots/serials, and stock tabs.",
    fields: ["product_key", "sku", "name", "product_kind", "tracking_mode", "reservation_policy", "status"],
    relationships: ["Category", "UOM", "Variants", "Lots", "Serial Numbers", "Stock Balances"],
    primaryActions: ["Create Product", "Create Variant", "Import Products", "Export"],
    permissions: ["inventory.products.view", "inventory.products.manage"],
    reconciliationItems: ["RI-02", "RI-06"],
  },
  {
    key: "warehouses",
    title: "Warehouses & Locations",
    description: "Warehouse workspace with hierarchical locations and reservable bins.",
    fields: ["warehouse_key", "location_key", "location_kind", "branch_id", "reservable", "status"],
    relationships: ["Branch", "Parent Location", "Stock Balances", "Movements"],
    primaryActions: ["Create Warehouse", "Create Location", "Bulk Activate", "Export"],
    permissions: ["inventory.warehouses.view", "inventory.locations.view"],
    reconciliationItems: ["RI-02"],
  },
  {
    key: "stock",
    title: "Stock Balances & Movements",
    description: "Read-heavy inventory facts: on hand, reserved, available, movement documents, and drill-through to source.",
    fields: ["product_id", "variant_id", "warehouse_id", "location_id", "lot_id", "serial_id", "quantity_on_hand", "quantity_reserved", "quantity_available"],
    relationships: ["Product", "Variant", "Warehouse", "Location", "Lot", "Serial Number", "Movement"],
    primaryActions: ["View Movements", "Export Stock", "Print Snapshot"],
    permissions: ["inventory.stock.view", "inventory.movements.view"],
    reconciliationItems: ["RI-02"],
  },
  {
    key: "movement-documents",
    title: "Transfers, Adjustments & Opening Balances",
    description: "Unified document workspace for inventory_stock_movements with movement/transfer/adjustment/opening balance kinds.",
    fields: ["document_kind", "movement_type_id", "source_location_id", "destination_location_id", "status", "lines"],
    relationships: ["Movement Type", "Products", "Warehouses", "Locations", "Finance Posting Readiness"],
    primaryActions: ["New Transfer", "New Adjustment", "Import Opening Balances", "Complete"],
    permissions: ["inventory.movements.create", "inventory.transfers.request", "inventory.adjustments.create"],
    reconciliationItems: ["RI-02"],
  },
];

export const manufacturingEntities: readonly FoundationEntity[] = [
  {
    key: "daily-production-report",
    title: "Daily Production Report",
    description: "The heart of Manufacturing: one fast supervisor screen for production facts and KPI sources.",
    fields: ["report_key", "report_date", "shift_key", "manufacturing_product_id", "production_line_id", "worker_output", "planned_quantity", "actual_quantity", "scrap_quantity", "rework_quantity", "downtime_minutes"],
    relationships: ["Product", "Line", "Supervisor", "Workers", "Plan", "Work Order", "Inventory facts", "Cost facts", "Quality facts"],
    primaryActions: ["New DPR", "Submit DPR", "Attach Evidence", "Export Facts"],
    permissions: ["manufacturing.daily-reports.view", "manufacturing.daily-reports.manage"],
    reconciliationItems: ["RI-03", "RI-05"],
  },
  {
    key: "targets",
    title: "Product, Line & Worker Targets",
    description: "Visual target and achievement workspaces. Facts only; no incentive calculation.",
    fields: ["target_key", "target_period", "target_quantity", "actual_quantity", "achievement_percent", "worker_ref_id", "line_id", "product_id"],
    relationships: ["Product", "Line", "Worker", "Plan", "DPR"],
    primaryActions: ["Define Product Target", "Define Line Target", "Define Worker Target", "Export Achievement"],
    permissions: ["manufacturing.targets.view", "manufacturing.targets.manage", "manufacturing.kpis.view"],
    reconciliationItems: ["RI-05"],
  },
  {
    key: "orders",
    title: "Manufacturing Orders & Work Orders",
    description: "Execution document workspace linked to plans, routings, BOMs, lines, workers, and DPR facts.",
    fields: ["order_key", "work_order_key", "status", "planned_quantity", "actual_quantity", "routing_id", "bom_id"],
    relationships: ["Plan", "Product", "Routing", "BOM", "Work Center", "Line", "DPR"],
    primaryActions: ["Create Manufacturing Order", "Release Work Order", "Complete", "Cancel"],
    permissions: ["manufacturing.execution.view", "manufacturing.execution.manage"],
    reconciliationItems: ["RI-03"],
  },
  {
    key: "engineering",
    title: "Lines, Work Centers, Machines, Routing & BOM",
    description: "Engineering and factory structure for production readiness.",
    fields: ["line_key", "work_center_key", "machine_key", "operation_key", "routing_key", "bom_key", "status"],
    relationships: ["Product", "Work Center", "Line", "Machine", "Operation", "BOM Components"],
    primaryActions: ["Create Line", "Create Machine", "Create Routing", "Create BOM"],
    permissions: ["manufacturing.view", "manufacturing.manage", "manufacturing.machines.view"],
    reconciliationItems: ["RI-03"],
  },
];

export const financeDashboardMetrics: readonly DashboardMetric[] = [
  { key: "accounts", label: "Accounts", value: "CoA ready", description: "Tree, account type, currency, and dimension readiness." },
  { key: "periods", label: "Fiscal Periods", value: "Timeline", description: "Fiscal years and period locking visibility." },
  { key: "tax", label: "Tax Coverage", value: "Definitions", description: "Tax definitions visible with calculation readiness flags." },
];

export const inventoryDashboardMetrics: readonly DashboardMetric[] = [
  { key: "stock", label: "Stock Facts", value: "On hand / reserved", description: "Balance views by product, variant, warehouse, and location." },
  { key: "tracking", label: "Tracking", value: "Lots + serials", description: "Lot and serial facts become first-class lookup targets." },
  { key: "reorder", label: "Reorder", value: "Rules", description: "Min/max and reorder point readiness without demand document creation." },
];

export const manufacturingDashboardMetrics: readonly DashboardMetric[] = [
  { key: "dpr", label: "DPR Completion", value: "Daily facts", description: "Daily Production Report is the source of KPI facts." },
  { key: "achievement", label: "Achievement", value: "Target vs actual", description: "Product, line, worker, plan, and monthly achievement." },
  { key: "quality", label: "Quality Facts", value: "Scrap / rework", description: "Scrap, rework, and downtime exposed as facts only." },
];
