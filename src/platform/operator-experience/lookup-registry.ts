export const FOUNDATION_LOOKUP_PROVIDER_KEYS = {
  branches: "platform.branches.lookup",
  categories: "inventory.categories.lookup",
  costCenters: "finance.cost-centers.lookup",
  handlingUnits: "inventory.handling-units.lookup",
  handlingUnitTypes: "inventory.handling-unit-types.lookup",
  locations: "inventory.locations.lookup",
  lots: "inventory.lots.lookup",
  managers: "platform.users.lookup",
  products: "inventory.products.lookup",
  serials: "inventory.serials.lookup",
  suppliers: "purchasing.suppliers.lookup",
  uomCategories: "inventory.uom-categories.lookup",
  uoms: "inventory.uoms.lookup",
  variants: "inventory.variants.lookup",
  warehouses: "inventory.warehouses.lookup",
} as const satisfies Readonly<Record<string, string>>;

export type FoundationLookupKey = keyof typeof FOUNDATION_LOOKUP_PROVIDER_KEYS;

export function resolveFoundationLookupProviderKey(lookupKey: string): string | null {
  return FOUNDATION_LOOKUP_PROVIDER_KEYS[lookupKey as FoundationLookupKey] ?? null;
}

export const HR_FOUNDATION_LOOKUP_PROVIDER_KEYS = {
  branches: "platform.branches.lookup",
  competencyCategories: "hr.competency-categories.lookup",
  employees: "hr.employees.lookup",
  grades: "hr.grades.lookup",
  jobFamilies: "hr.job-families.lookup",
  jobFunctions: "hr.job-functions.lookup",
  jobLevels: "hr.job-levels.lookup",
  jobs: "hr.jobs.lookup",
  orgUnits: "hr.org-units.lookup",
  positions: "hr.positions.lookup",
  skillCategories: "hr.skill-categories.lookup",
  skills: "hr.skills.lookup",
  workLocations: "hr.work-locations.lookup",
} as const satisfies Readonly<Record<string, string>>;

export const HR_FIELD_LOOKUP_PROVIDER_KEYS = {
  departmentId: "hr.org-units.lookup",
  employeeId: "hr.employees.lookup",
  managerEmployeeId: "hr.employees.lookup",
  orgUnitId: "hr.org-units.lookup",
  positionId: "hr.positions.lookup",
} as const satisfies Readonly<Record<string, string>>;

export function resolveHrLookupProviderKey(fieldName: string): string | null {
  return (
    HR_FOUNDATION_LOOKUP_PROVIDER_KEYS[fieldName as keyof typeof HR_FOUNDATION_LOOKUP_PROVIDER_KEYS]
    ?? HR_FIELD_LOOKUP_PROVIDER_KEYS[fieldName as keyof typeof HR_FIELD_LOOKUP_PROVIDER_KEYS]
    ?? null
  );
}

export const MANUFACTURING_FIELD_LOOKUP_PROVIDER_KEYS = {
  bomId: "manufacturing.boms.lookup",
  componentProductId: "manufacturing.products.lookup",
  defaultLineId: "manufacturing.lines.lookup",
  employeeId: "hr.employees.lookup",
  inventoryProductId: "inventory.products.lookup",
  lineId: "manufacturing.lines.lookup",
  manufacturingOrderId: "manufacturing.orders.lookup",
  manufacturingProductId: "manufacturing.products.lookup",
  operationId: "manufacturing.operations.lookup",
  planId: "manufacturing.plans.lookup",
  planLineId: "manufacturing.plan-lines.lookup",
  plannedLineId: "manufacturing.lines.lookup",
  productionLineId: "manufacturing.lines.lookup",
  productId: "inventory.products.lookup",
  routingId: "manufacturing.routings.lookup",
  uomId: "inventory.uoms.lookup",
  workCenterId: "manufacturing.work-centers.lookup",
  workstationId: "manufacturing.workstations.lookup",
} as const satisfies Readonly<Record<string, string>>;

export function resolveManufacturingLookupProviderKey(fieldName: string): string | null {
  return MANUFACTURING_FIELD_LOOKUP_PROVIDER_KEYS[fieldName as keyof typeof MANUFACTURING_FIELD_LOOKUP_PROVIDER_KEYS] ?? null;
}
