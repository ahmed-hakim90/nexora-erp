import type { PermissionKey } from "@/platform/permissions/public-api";
import type { BusinessCodeConfig } from "@/shared/business-codes";

export type ManufacturingResourceKey =
  | "manufacturing-products"
  | "production-lines"
  | "work-centers"
  | "workstations"
  | "machines"
  | "operations"
  | "manufacturing-profiles"
  | "line-assignments"
  | "production-standards"
  | "boms"
  | "routing-plans"
  | "production-plans"
  | "manufacturing-orders"
  | "work-orders";

export type ManufacturingSortDirection = "asc" | "desc";

export type ManufacturingListQuery = Readonly<{
  cursor?: string | null;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: ManufacturingSortDirection;
}>;

export type CursorPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;

export type ManufacturingRecord = Readonly<Record<string, unknown> & {
  id: string;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type ManufacturingMutationInput = Readonly<Record<string, unknown>>;

export type ManufacturingFieldType = "checkbox" | "date" | "number" | "text" | "time";

export type ManufacturingFieldConfig = Readonly<{
  name: string;
  label: string;
  type: ManufacturingFieldType;
  isRequired: boolean;
  autoCode?: BusinessCodeConfig;
}>;

export type ManufacturingColumnConfig = Readonly<{
  key: string;
  header: string;
  field: string;
}>;

export type ManufacturingResourceDefinition = Readonly<{
  key: ManufacturingResourceKey;
  title: string;
  singularTitle: string;
  description: string;
  basePath: string;
  tableName: string;
  selectColumns: string;
  searchColumns: readonly string[];
  columns: readonly ManufacturingColumnConfig[];
  formFields: readonly ManufacturingFieldConfig[];
  readPermission: PermissionKey;
  managePermission: PermissionKey;
  createdEventName?: string;
  updatedEventName?: string;
  aggregateType: string;
  scope?: "tenant" | "company" | "branch";
}>;

export type ProductionStandardResolutionPriority = readonly [
  "product + line + shift",
  "product + line",
  "product default manufacturing target placeholder",
];
