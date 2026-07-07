export type ManufacturingRelationLabelContract = Readonly<{
  entityType: string;
  codeField: string;
  nameField: string;
  format: "code-name";
  example: string;
  owner?: string;
}>;

export const MANUFACTURING_RELATION_LABEL_CONTRACTS = {
  bom: {
    codeField: "bom_number",
    entityType: "manufacturing_bom",
    example: "BOM-001 — Widget Assembly v1",
    format: "code-name",
    nameField: "version_code",
  },
  crewAssignment: {
    codeField: "document_number",
    entityType: "manufacturing_crew_assignment",
    example: "CREW-001 — Sew Upper Crew",
    format: "code-name",
    nameField: "reason",
  },
  employee: {
    codeField: "employee_code",
    entityType: "hr_employee",
    example: "EMP-001 — Ahmed Hassan",
    format: "code-name",
    nameField: "name_en",
    owner: "hr",
  },
  machine: {
    codeField: "code",
    entityType: "manufacturing_machine",
    example: "MCH-001 — Injection Machine 01",
    format: "code-name",
    nameField: "name",
  },
  manufacturingOrder: {
    codeField: "order_number",
    entityType: "manufacturing_order",
    example: "MO-0001 — Widget Batch A",
    format: "code-name",
    nameField: "document_number",
  },
  operation: {
    codeField: "operation_code",
    entityType: "manufacturing_operation_plan",
    example: "OP-ASM — Assembly Operation",
    format: "code-name",
    nameField: "operation_name",
  },
  product: {
    codeField: "sku",
    entityType: "product",
    example: "SKU-100 — Widget Pro",
    format: "code-name",
    nameField: "name",
    owner: "product-master",
  },
  productVariant: {
    codeField: "variant_code",
    entityType: "product_variant",
    example: "VAR-RED — Widget Pro Red",
    format: "code-name",
    nameField: "name",
    owner: "product-master",
  },
  productionLine: {
    codeField: "code",
    entityType: "manufacturing_production_line",
    example: "LINE-01 — Assembly Line 01",
    format: "code-name",
    nameField: "name",
  },
  routing: {
    codeField: "routing_number",
    entityType: "manufacturing_routing",
    example: "RTG-001 — Widget Routing v1",
    format: "code-name",
    nameField: "version_code",
  },
  shift: {
    codeField: "shift_code",
    entityType: "hr_shift",
    example: "SHIFT-A — Morning Shift",
    format: "code-name",
    nameField: "name",
    owner: "hr-workforce",
  },
  uom: {
    codeField: "uom_key",
    entityType: "uom",
    example: "EA — Each",
    format: "code-name",
    nameField: "name",
    owner: "uom",
  },
  workCenter: {
    codeField: "code",
    entityType: "manufacturing_work_center",
    example: "WC-ASM — Assembly Work Center",
    format: "code-name",
    nameField: "name",
  },
  workstation: {
    codeField: "code",
    entityType: "manufacturing_workstation",
    example: "WS-01 — Assembly Station 01",
    format: "code-name",
    nameField: "name",
  },
} as const satisfies Record<string, ManufacturingRelationLabelContract>;

export function formatManufacturingRelationLabel(
  contract: ManufacturingRelationLabelContract,
  row: Readonly<Record<string, unknown>>,
): string {
  const code = String(row[contract.codeField] ?? row.code ?? row.id ?? "").trim();
  const name = String(row[contract.nameField] ?? row.name ?? row.label ?? "").trim();

  if (code && name) return `${code} — ${name}`;
  return code || name || "—";
}
