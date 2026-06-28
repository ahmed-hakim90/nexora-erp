import {
  createSearchProviderRegistry,
  defineAppKey,
  defineSearchProvider,
  executeSearch,
  type SearchContext,
  type SearchProvider,
  type SearchResult,
} from "@/platform/public-api";
// Import browser-safe constants directly: the inventory public-api barrel re-exports
// server-only adapters (service-factory), so importing it into this client-consumed
// model would leak `server-only` into the browser bundle.
// eslint-disable-next-line no-restricted-imports -- browser-safe constant only; public-api would leak server-only into the client bundle
import { INVENTORY_PERMISSIONS } from "@/features/inventory/permissions/permission-registry";

const INVENTORY_APP_KEY = defineAppKey("inventory");

export type ProductWorkspaceStatus = "active" | "inactive" | "draft" | "archived";
export type ProductWorkspaceType = "stockable" | "raw-material" | "spare-part" | "service" | "asset";
export type ProductTrackingMode = "none" | "lot" | "serial";
export type ProductReservationPolicy = "none" | "soft" | "hard";
export type ProductSortKey = "sku" | "name" | "category" | "stock" | "available" | "updatedAt";
export type ProductDensity = "compact" | "comfortable" | "spacious";
export type ProductGroupKey = "none" | "category" | "status" | "tracking" | "warehouse";

export type ProductWorkspaceRecord = Readonly<{
  key: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  type: ProductWorkspaceType;
  uom: string;
  tracking: ProductTrackingMode;
  reservationPolicy: ProductReservationPolicy;
  stock: number;
  reserved: number;
  available: number;
  incoming: number;
  outgoing: number;
  status: ProductWorkspaceStatus;
  updatedAt: string;
  imageTone: "emerald" | "blue" | "amber" | "rose" | "slate" | "violet";
  warehouse: string;
  location: string;
  costObject: string;
  financeDimension: string;
  tags: readonly string[];
  notes: string;
  variants: readonly ProductVariantRecord[];
  warehouses: readonly ProductBalanceRecord[];
  locations: readonly ProductBalanceRecord[];
  lots: readonly ProductLotRecord[];
  serials: readonly ProductSerialRecord[];
  reorderRules: readonly ProductReorderRuleRecord[];
  timeline: readonly ProductTimelineRecord[];
  audit: readonly ProductAuditRecord[];
  attachments: readonly ProductAttachmentRecord[];
  comments: readonly ProductCommentRecord[];
  relations: readonly ProductRelationRecord[];
}>;

export type ProductVariantRecord = Readonly<{
  key: string;
  sku: string;
  name: string;
  attributes: string;
  status: ProductWorkspaceStatus;
  stock: number;
}>;

export type ProductBalanceRecord = Readonly<{
  key: string;
  scope: string;
  stock: number;
  reserved: number;
  available: number;
  incoming: number;
  outgoing: number;
}>;

export type ProductLotRecord = Readonly<{
  lot: string;
  warehouse: string;
  expiresOn: string;
  available: number;
  status: "released" | "quarantine" | "expired";
}>;

export type ProductSerialRecord = Readonly<{
  serial: string;
  warehouse: string;
  location: string;
  status: "available" | "reserved" | "issued";
}>;

export type ProductReorderRuleRecord = Readonly<{
  warehouse: string;
  policy: string;
  minimum: number;
  maximum: number;
  reorderQuantity: number;
  status: ProductWorkspaceStatus;
}>;

export type ProductTimelineRecord = Readonly<{
  key: string;
  event: "Created" | "Updated" | "Imported" | "Movement" | "Status Change";
  description: string;
  at: string;
  actor: string;
}>;

export type ProductAuditRecord = Readonly<{
  key: string;
  action: string;
  actor: string;
  at: string;
  outcome: "allowed" | "denied";
}>;

export type ProductAttachmentRecord = Readonly<{
  key: string;
  name: string;
  type: string;
  size: string;
}>;

export type ProductCommentRecord = Readonly<{
  key: string;
  author: string;
  body: string;
  at: string;
}>;

export type ProductRelationRecord = Readonly<{
  key: string;
  type: string;
  label: string;
  status: string;
}>;

export type ProductWorkspaceFilters = Readonly<{
  search: string;
  category: string;
  status: string;
  warehouse: string;
  tracking: string;
  type: string;
  sort: ProductSortKey;
  direction: "asc" | "desc";
  groupBy: ProductGroupKey;
}>;

export type ProductWorkspaceKpi = Readonly<{
  key: string;
  label: string;
  value: string;
  description: string;
  tone: "neutral" | "success" | "warning" | "danger" | "accent";
}>;

export type ProductWorkspaceView = Readonly<{
  key: string;
  label: string;
  description: string;
  filters: Partial<ProductWorkspaceFilters>;
}>;

export const PRODUCT_WORKSPACE_TABS = [
  "Overview",
  "Variants",
  "Inventory",
  "Warehouses",
  "Locations",
  "Lots",
  "Serial Numbers",
  "Reorder Rules",
  "Attachments",
  "Timeline",
  "Audit",
  "Comments",
  "Relations",
] as const;

export const PRODUCT_WORKSPACE_COLUMNS = [
  "image",
  "sku",
  "name",
  "category",
  "type",
  "uom",
  "tracking",
  "stock",
  "reserved",
  "available",
  "status",
  "updatedAt",
  "actions",
] as const;

export const PRODUCT_SAVED_VIEWS: readonly ProductWorkspaceView[] = [
  {
    description: "All active stockable and service products.",
    filters: { status: "active" },
    key: "active-products",
    label: "Active Products",
  },
  {
    description: "Products below available stock threshold.",
    filters: { sort: "available", status: "active" },
    key: "low-stock",
    label: "Low Stock",
  },
  {
    description: "Lot and serial tracked products.",
    filters: { tracking: "tracked" },
    key: "tracked",
    label: "Tracked Products",
  },
  {
    description: "Archived or inactive products for review.",
    filters: { status: "inactive" },
    key: "inactive",
    label: "Inactive",
  },
];

export const PRODUCT_WORKSPACE_FORM_LOOKUPS = {
  brands: [
    { id: "brand-nexora", label: "Nexora Supply", meta: "Approved brand" },
    { id: "brand-atlas", label: "Atlas Components", meta: "Preferred vendor brand" },
    { id: "brand-orbit", label: "Orbit Industrial", meta: "Industrial line" },
  ],
  categories: [
    { id: "cat-finished", label: "Finished Goods", meta: "Stockable products" },
    { id: "cat-raw", label: "Raw Materials", meta: "Production inputs" },
    { id: "cat-spares", label: "Spare Parts", meta: "Maintenance inventory" },
    { id: "cat-services", label: "Service Items", meta: "Non-stock services" },
  ],
  costObjects: [
    { id: "cost-product", label: "Product Cost Object", meta: "Cost readiness only" },
    { id: "cost-batch", label: "Batch Cost Object", meta: "Future costing integration" },
  ],
  financeDimensions: [
    { id: "fin-inventory", label: "Inventory Dimension", meta: "Finance readiness only" },
    { id: "fin-maintenance", label: "Maintenance Dimension", meta: "Finance readiness only" },
  ],
  units: [
    { id: "uom-ea", label: "Each", meta: "EA" },
    { id: "uom-kg", label: "Kilogram", meta: "KG" },
    { id: "uom-l", label: "Liter", meta: "L" },
    { id: "uom-hr", label: "Hour", meta: "HR" },
  ],
} as const;

export const PRODUCTS: readonly ProductWorkspaceRecord[] = [
  {
    available: 926,
    barcode: "6221001100018",
    brand: "Nexora Supply",
    category: "Finished Goods",
    comments: [
      { at: "2026-06-24 09:12", author: "Inventory Controller", body: "Safety stock reviewed for Alexandria branch.", key: "comment-a1" },
    ],
    costObject: "Product Cost Object",
    description: "Shelf-ready finished product with lot tracking and replenishment controls.",
    financeDimension: "Inventory Dimension",
    imageTone: "emerald",
    incoming: 140,
    key: "prd-polymer-resin-a",
    location: "A1-R03-B04",
    lots: [
      { available: 410, expiresOn: "2027-02-28", lot: "LOT-26-011", status: "released", warehouse: "Main Warehouse" },
      { available: 96, expiresOn: "2027-03-15", lot: "LOT-26-017", status: "quarantine", warehouse: "Main Warehouse" },
    ],
    name: "Polymer Resin A",
    notes: "Primary SKU for high-volume production demand. Cost calculation is intentionally not implemented in this workspace.",
    outgoing: 42,
    relations: [
      { key: "rel-label", label: "Print Label Template", status: "Future print action", type: "Print" },
      { key: "rel-report", label: "Inventory Movement Summary", status: "Report ready", type: "Report" },
    ],
    reorderRules: [
      { maximum: 1300, minimum: 500, policy: "Min / Max", reorderQuantity: 600, status: "active", warehouse: "Main Warehouse" },
    ],
    reservationPolicy: "hard",
    reserved: 214,
    serials: [],
    sku: "FG-RESIN-A",
    status: "active",
    stock: 1140,
    tags: ["High velocity", "Lot tracked", "Exportable"],
    timeline: [
      { actor: "System Import", at: "2026-06-21 08:30", description: "Imported from approved product seed.", event: "Imported", key: "tl-a1" },
      { actor: "Inventory Controller", at: "2026-06-25 14:18", description: "Movement summary refreshed after stock receipt.", event: "Movement", key: "tl-a2" },
    ],
    audit: [
      { action: "inventory.products.view", actor: "Inventory Controller", at: "2026-06-26 11:04", key: "audit-a1", outcome: "allowed" },
      { action: "inventory.products.manage", actor: "Branch Operator", at: "2026-06-25 17:21", key: "audit-a2", outcome: "denied" },
    ],
    attachments: [
      { key: "att-a1", name: "Product specification.pdf", size: "248 KB", type: "PDF" },
      { key: "att-a2", name: "Safety certificate.pdf", size: "184 KB", type: "PDF" },
    ],
    tracking: "lot",
    type: "stockable",
    uom: "KG",
    updatedAt: "2026-06-26 11:04",
    variants: [
      { attributes: "Grade: Standard", key: "var-resin-a-standard", name: "Standard Grade", sku: "FG-RESIN-A-STD", status: "active", stock: 740 },
      { attributes: "Grade: Premium", key: "var-resin-a-premium", name: "Premium Grade", sku: "FG-RESIN-A-PRM", status: "active", stock: 400 },
    ],
    warehouse: "Main Warehouse",
    warehouses: [
      { available: 926, incoming: 140, key: "wh-main", outgoing: 42, reserved: 214, scope: "Main Warehouse", stock: 1140 },
      { available: 88, incoming: 0, key: "wh-alex", outgoing: 12, reserved: 24, scope: "Alexandria Branch", stock: 112 },
    ],
    locations: [
      { available: 520, incoming: 80, key: "loc-a1", outgoing: 22, reserved: 96, scope: "A1-R03-B04", stock: 616 },
      { available: 406, incoming: 60, key: "loc-a2", outgoing: 20, reserved: 118, scope: "A1-R04-B01", stock: 524 },
    ],
  },
  {
    available: 18,
    barcode: "6221001100049",
    brand: "Atlas Components",
    category: "Spare Parts",
    comments: [],
    costObject: "Product Cost Object",
    description: "Critical maintenance spare part with serial-level traceability.",
    financeDimension: "Maintenance Dimension",
    imageTone: "blue",
    incoming: 12,
    key: "prd-hydraulic-pump",
    location: "MRO-C02-S01",
    lots: [],
    name: "Hydraulic Pump Assembly",
    notes: "Low stock signal is informational only. Purchasing demand is not implemented.",
    outgoing: 3,
    relations: [
      { key: "rel-maintenance", label: "Maintenance Asset Group", status: "Related", type: "Asset readiness" },
    ],
    reorderRules: [
      { maximum: 50, minimum: 20, policy: "Reorder Point", reorderQuantity: 24, status: "active", warehouse: "Maintenance Warehouse" },
    ],
    reservationPolicy: "soft",
    reserved: 7,
    serials: [
      { location: "MRO-C02-S01", serial: "SN-PUMP-26001", status: "available", warehouse: "Maintenance Warehouse" },
      { location: "MRO-C02-S02", serial: "SN-PUMP-26002", status: "reserved", warehouse: "Maintenance Warehouse" },
    ],
    sku: "SP-HYD-PUMP",
    status: "active",
    stock: 25,
    tags: ["Critical spare", "Serial tracked", "Low stock"],
    timeline: [
      { actor: "Maintenance Lead", at: "2026-06-20 13:45", description: "Marked as critical spare.", event: "Status Change", key: "tl-b1" },
      { actor: "Inventory Controller", at: "2026-06-26 10:00", description: "Reserved seven units for planned maintenance.", event: "Movement", key: "tl-b2" },
    ],
    audit: [
      { action: "inventory.serials.view", actor: "Maintenance Lead", at: "2026-06-26 10:02", key: "audit-b1", outcome: "allowed" },
    ],
    attachments: [
      { key: "att-b1", name: "Installation drawing.dwg", size: "912 KB", type: "Drawing" },
    ],
    tracking: "serial",
    type: "spare-part",
    uom: "EA",
    updatedAt: "2026-06-26 10:00",
    variants: [
      { attributes: "Voltage: 220V", key: "var-pump-220", name: "220V Pump", sku: "SP-HYD-PUMP-220", status: "active", stock: 12 },
      { attributes: "Voltage: 380V", key: "var-pump-380", name: "380V Pump", sku: "SP-HYD-PUMP-380", status: "active", stock: 13 },
    ],
    warehouse: "Maintenance Warehouse",
    warehouses: [
      { available: 18, incoming: 12, key: "wh-maint", outgoing: 3, reserved: 7, scope: "Maintenance Warehouse", stock: 25 },
    ],
    locations: [
      { available: 10, incoming: 8, key: "loc-mro-c02", outgoing: 1, reserved: 4, scope: "MRO-C02-S01", stock: 14 },
      { available: 8, incoming: 4, key: "loc-mro-c03", outgoing: 2, reserved: 3, scope: "MRO-C02-S02", stock: 11 },
    ],
  },
  {
    available: 0,
    barcode: "SVC-CAL-STD",
    brand: "Orbit Industrial",
    category: "Service Items",
    comments: [
      { at: "2026-06-23 16:12", author: "Service Manager", body: "Service SKU approved for future service modules.", key: "comment-c1" },
    ],
    costObject: "Service Cost Object",
    description: "Non-stock service item for calibration work orders. No stock posting.",
    financeDimension: "Maintenance Dimension",
    imageTone: "violet",
    incoming: 0,
    key: "prd-calibration-service",
    location: "Not stocked",
    lots: [],
    name: "Calibration Service",
    notes: "Service item demonstrates the workspace pattern without implementing service operations.",
    outgoing: 0,
    relations: [
      { key: "rel-service", label: "Service module readiness", status: "Future", type: "Future app" },
    ],
    reorderRules: [],
    reservationPolicy: "none",
    reserved: 0,
    serials: [],
    sku: "SVC-CAL-STD",
    status: "active",
    stock: 0,
    tags: ["Service", "Non-stock"],
    timeline: [
      { actor: "Product Manager", at: "2026-06-19 09:20", description: "Created service item.", event: "Created", key: "tl-c1" },
    ],
    audit: [
      { action: "inventory.products.view", actor: "Service Manager", at: "2026-06-23 16:12", key: "audit-c1", outcome: "allowed" },
    ],
    attachments: [],
    tracking: "none",
    type: "service",
    uom: "HR",
    updatedAt: "2026-06-23 16:12",
    variants: [],
    warehouse: "Not stocked",
    warehouses: [],
    locations: [],
  },
  {
    available: 2860,
    barcode: "6221001100025",
    brand: "Nexora Supply",
    category: "Raw Materials",
    comments: [],
    costObject: "Batch Cost Object",
    description: "Bulk raw material stored by lot for manufacturing readiness.",
    financeDimension: "Inventory Dimension",
    imageTone: "amber",
    incoming: 500,
    key: "prd-steel-coil",
    location: "RM-YARD-02",
    lots: [
      { available: 1400, expiresOn: "N/A", lot: "COIL-26-041", status: "released", warehouse: "Raw Material Yard" },
      { available: 1460, expiresOn: "N/A", lot: "COIL-26-044", status: "released", warehouse: "Raw Material Yard" },
    ],
    name: "Steel Coil 2mm",
    notes: "Manufacturing consumption is intentionally outside this workspace.",
    outgoing: 120,
    relations: [
      { key: "rel-bom", label: "BOM readiness reference", status: "Future manufacturing use", type: "Manufacturing" },
    ],
    reorderRules: [
      { maximum: 5000, minimum: 2200, policy: "Min / Max", reorderQuantity: 1800, status: "active", warehouse: "Raw Material Yard" },
    ],
    reservationPolicy: "soft",
    reserved: 240,
    serials: [],
    sku: "RM-STEEL-2MM",
    status: "active",
    stock: 3100,
    tags: ["Raw material", "Lot tracked"],
    timeline: [
      { actor: "Inventory Controller", at: "2026-06-22 12:10", description: "Updated reorder threshold.", event: "Updated", key: "tl-d1" },
    ],
    audit: [
      { action: "inventory.lots.view", actor: "Production Planner", at: "2026-06-24 08:40", key: "audit-d1", outcome: "allowed" },
    ],
    attachments: [
      { key: "att-d1", name: "Material certificate.pdf", size: "310 KB", type: "PDF" },
    ],
    tracking: "lot",
    type: "raw-material",
    uom: "KG",
    updatedAt: "2026-06-24 08:40",
    variants: [],
    warehouse: "Raw Material Yard",
    warehouses: [
      { available: 2860, incoming: 500, key: "wh-rm", outgoing: 120, reserved: 240, scope: "Raw Material Yard", stock: 3100 },
    ],
    locations: [
      { available: 2860, incoming: 500, key: "loc-rm-yard", outgoing: 120, reserved: 240, scope: "RM-YARD-02", stock: 3100 },
    ],
  },
  {
    available: 156,
    barcode: "6221001100032",
    brand: "Orbit Industrial",
    category: "Finished Goods",
    comments: [],
    costObject: "Product Cost Object",
    description: "Configurable product with several sellable variants.",
    financeDimension: "Inventory Dimension",
    imageTone: "rose",
    incoming: 20,
    key: "prd-control-panel",
    location: "FG-B02-R01",
    lots: [],
    name: "Control Panel",
    notes: "Variant creation and editing are handled in drawers; inline editing is deliberately absent.",
    outgoing: 8,
    relations: [],
    reorderRules: [
      { maximum: 260, minimum: 120, policy: "Manual Review", reorderQuantity: 80, status: "active", warehouse: "Main Warehouse" },
    ],
    reservationPolicy: "hard",
    reserved: 44,
    serials: [
      { location: "FG-B02-R01", serial: "SN-CP-26001", status: "available", warehouse: "Main Warehouse" },
      { location: "FG-B02-R02", serial: "SN-CP-26002", status: "issued", warehouse: "Main Warehouse" },
    ],
    sku: "FG-CTRL-PANEL",
    status: "active",
    stock: 200,
    tags: ["Variant product", "Serial tracked"],
    timeline: [
      { actor: "Product Manager", at: "2026-06-18 10:11", description: "Created configurable product and variants.", event: "Created", key: "tl-e1" },
      { actor: "Inventory Controller", at: "2026-06-25 12:04", description: "Serial balance updated.", event: "Movement", key: "tl-e2" },
    ],
    audit: [
      { action: "inventory.products.manage", actor: "Product Manager", at: "2026-06-18 10:11", key: "audit-e1", outcome: "allowed" },
    ],
    attachments: [
      { key: "att-e1", name: "Panel label template.json", size: "18 KB", type: "Template" },
    ],
    tracking: "serial",
    type: "stockable",
    uom: "EA",
    updatedAt: "2026-06-25 12:04",
    variants: [
      { attributes: "Phase: Single", key: "var-panel-single", name: "Single Phase", sku: "FG-CTRL-PANEL-1P", status: "active", stock: 74 },
      { attributes: "Phase: Three", key: "var-panel-three", name: "Three Phase", sku: "FG-CTRL-PANEL-3P", status: "active", stock: 126 },
    ],
    warehouse: "Main Warehouse",
    warehouses: [
      { available: 156, incoming: 20, key: "wh-main-panel", outgoing: 8, reserved: 44, scope: "Main Warehouse", stock: 200 },
    ],
    locations: [
      { available: 91, incoming: 10, key: "loc-panel-1", outgoing: 4, reserved: 21, scope: "FG-B02-R01", stock: 112 },
      { available: 65, incoming: 10, key: "loc-panel-2", outgoing: 4, reserved: 23, scope: "FG-B02-R02", stock: 88 },
    ],
  },
  {
    available: 0,
    barcode: "6221001199999",
    brand: "Atlas Components",
    category: "Finished Goods",
    comments: [],
    costObject: "Product Cost Object",
    description: "Archived legacy product retained for audit and historical reporting.",
    financeDimension: "Inventory Dimension",
    imageTone: "slate",
    incoming: 0,
    key: "prd-legacy-kit",
    location: "Archived",
    lots: [],
    name: "Legacy Starter Kit",
    notes: "Archived products remain read-only in the workspace.",
    outgoing: 0,
    relations: [],
    reorderRules: [],
    reservationPolicy: "none",
    reserved: 0,
    serials: [],
    sku: "FG-LEGACY-KIT",
    status: "inactive",
    stock: 0,
    tags: ["Archived"],
    timeline: [
      { actor: "Product Manager", at: "2026-06-12 15:30", description: "Status changed to inactive.", event: "Status Change", key: "tl-f1" },
    ],
    audit: [
      { action: "inventory.products.manage", actor: "Product Manager", at: "2026-06-12 15:30", key: "audit-f1", outcome: "allowed" },
    ],
    attachments: [],
    tracking: "none",
    type: "stockable",
    uom: "EA",
    updatedAt: "2026-06-12 15:30",
    variants: [],
    warehouse: "Archived",
    warehouses: [],
    locations: [],
  },
];

export const DEFAULT_PRODUCT_WORKSPACE_FILTERS: ProductWorkspaceFilters = {
  category: "all",
  direction: "asc",
  groupBy: "none",
  search: "",
  sort: "sku",
  status: "all",
  tracking: "all",
  type: "all",
  warehouse: "all",
};

export function getProductWorkspaceKpis(products: readonly ProductWorkspaceRecord[]): readonly ProductWorkspaceKpi[] {
  const active = products.filter((product) => product.status === "active");
  const tracked = products.filter((product) => product.tracking !== "none");
  const lowStock = products.filter((product) => product.status === "active" && product.type !== "service" && product.available <= 25);
  const variants = products.reduce((total, product) => total + product.variants.length, 0);

  return [
    {
      description: "All product records visible to this workspace.",
      key: "total",
      label: "Total Products",
      tone: "accent",
      value: String(products.length),
    },
    {
      description: "Products available for transactions and discovery.",
      key: "active",
      label: "Active Products",
      tone: "success",
      value: String(active.length),
    },
    {
      description: "Available quantity is at or below review threshold.",
      key: "low-stock",
      label: "Low Stock",
      tone: lowStock.length > 0 ? "warning" : "success",
      value: String(lowStock.length),
    },
    {
      description: "Lot or serial traceability is enabled.",
      key: "tracked",
      label: "Tracked Products",
      tone: "neutral",
      value: String(tracked.length),
    },
    {
      description: "Inactive or archived products retained for audit.",
      key: "inactive",
      label: "Inactive Products",
      tone: "danger",
      value: String(products.filter((product) => product.status !== "active").length),
    },
    {
      description: "Variant records managed through drawers.",
      key: "variants",
      label: "Variants",
      tone: "neutral",
      value: String(variants),
    },
  ];
}

export function filterProducts(
  products: readonly ProductWorkspaceRecord[],
  filters: ProductWorkspaceFilters,
): readonly ProductWorkspaceRecord[] {
  const term = filters.search.trim().toLowerCase();

  return products
    .filter((product) => {
      const tracked = filters.tracking === "tracked" ? product.tracking !== "none" : product.tracking === filters.tracking;
      return (
        (!term || [product.sku, product.name, product.category, product.brand, product.barcode, product.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(term))
        && (filters.category === "all" || product.category === filters.category)
        && (filters.status === "all" || product.status === filters.status)
        && (filters.warehouse === "all" || product.warehouse === filters.warehouse)
        && (filters.tracking === "all" || tracked)
        && (filters.type === "all" || product.type === filters.type)
      );
    })
    .slice()
    .sort((left, right) => compareProducts(left, right, filters.sort, filters.direction));
}

export function groupProducts(
  products: readonly ProductWorkspaceRecord[],
  groupBy: ProductGroupKey,
): readonly { key: string; label: string; records: readonly ProductWorkspaceRecord[] }[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All Products", records: products }];
  }

  const groups = new Map<string, ProductWorkspaceRecord[]>();

  for (const product of products) {
    const value = groupBy === "category"
      ? product.category
      : groupBy === "status"
        ? product.status
        : groupBy === "tracking"
          ? trackingLabel(product.tracking)
          : product.warehouse;
    groups.set(value, [...(groups.get(value) ?? []), product]);
  }

  return [...groups.entries()]
    .map(([key, records]) => ({ key, label: key, records }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function createProductSearchProvider(
  products: readonly ProductWorkspaceRecord[] = PRODUCTS,
): SearchProvider {
  return defineSearchProvider({
    appKey: INVENTORY_APP_KEY,
    entityTypes: ["product"],
    key: "inventory.products.workspace",
    moduleKey: "inventory",
    permissionPolicy: {
      hideWhenUnauthorized: true,
      requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
      sensitivity: "internal",
    },
    requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
    searchableEntities: [{
      appKey: INVENTORY_APP_KEY,
      displayName: "Products",
      entityType: "product",
      indexPolicy: {
        enabled: true,
        fields: ["sku", "barcode", "name", "category", "brand", "tags"],
        languageReadiness: ["ar", "en"],
        refresh: "event-driven",
      },
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
        sensitivity: "internal",
      },
      quickSearchFields: ["sku", "barcode", "name", "category", "brand"],
      rankingStrategy: "weighted",
      resultType: "record",
    }],
    source: "app",
    supportedExperiences: ["erp"],
    search: (query) => {
      if (query.tokens.length === 0) return [];

      return products
        .filter((product) => query.tokens.every((token) =>
          [product.sku, product.barcode, product.name, product.category, product.brand, product.tags.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(token),
        ))
        .map<SearchResult>((product) => ({
          appKey: INVENTORY_APP_KEY,
          branchId: "foundation-branch",
          companyId: "foundation-company",
          entityId: product.key,
          entityType: "product",
          href: "/erp/inventory/products",
          metadata: {
            available: product.available,
            sku: product.sku,
            tracking: product.tracking,
          },
          moduleKey: "inventory",
          rank: product.status === "active" ? 20 : 5,
          requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
          sensitivity: product.tracking === "serial" ? "sensitive" : "internal",
          subtitle: `${product.sku} · ${product.category} · ${trackingLabel(product.tracking)}`,
          tenantId: "foundation-review-tenant",
          title: product.name,
          type: "record",
        }));
    },
  });
}

export async function searchProductsWithPlatformContracts(term: string): Promise<readonly SearchResult[]> {
  const registry = createSearchProviderRegistry([createProductSearchProvider()]);
  const context: SearchContext = {
    appKey: INVENTORY_APP_KEY,
    branchId: "foundation-branch",
    companyId: "foundation-company",
    entityPriorities: { product: 2 },
    experience: "erp",
    grantedPermissions: new Set([INVENTORY_PERMISSIONS.productsView]),
    tenantId: "foundation-review-tenant",
  };
  const page = await executeSearch(
    registry,
    {
      appKey: INVENTORY_APP_KEY,
      branchId: "foundation-branch",
      companyId: "foundation-company",
      experience: "erp",
      limit: 8,
      term,
      tenantId: "foundation-review-tenant",
    },
    context,
  );

  return page.records;
}

export function getProductWorkspaceOptions(products: readonly ProductWorkspaceRecord[]) {
  return {
    categories: unique(products.map((product) => product.category)),
    statuses: unique(products.map((product) => product.status)),
    trackingModes: ["tracked", ...unique(products.map((product) => product.tracking))],
    types: unique(products.map((product) => product.type)),
    warehouses: unique(products.map((product) => product.warehouse)),
  };
}

export function trackingLabel(value: ProductTrackingMode): string {
  return value === "none" ? "Not tracked" : value === "lot" ? "Lot tracked" : "Serial tracked";
}

export function typeLabel(value: ProductWorkspaceType): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function compareProducts(
  left: ProductWorkspaceRecord,
  right: ProductWorkspaceRecord,
  sort: ProductSortKey,
  direction: "asc" | "desc",
): number {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = sort === "name"
    ? left.name
    : sort === "category"
      ? left.category
      : sort === "stock"
        ? left.stock
        : sort === "available"
          ? left.available
          : sort === "updatedAt"
            ? left.updatedAt
            : left.sku;
  const rightValue = sort === "name"
    ? right.name
    : sort === "category"
      ? right.category
      : sort === "stock"
        ? right.stock
        : sort === "available"
          ? right.available
          : sort === "updatedAt"
            ? right.updatedAt
            : right.sku;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue).localeCompare(String(rightValue)) * multiplier;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
