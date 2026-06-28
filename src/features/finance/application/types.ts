import type { PermissionKey } from "@/platform/permissions/public-api";
import type { BusinessCodeConfig } from "@/shared/business-codes";

export type FinanceSortDirection = "asc" | "desc";

export type FinanceListQuery = Readonly<{
  cursor?: string | null;
  pageSize: number;
  search?: string;
  status?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: FinanceSortDirection;
}>;

export type FinanceCursorPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;

export type FinanceRecord = Readonly<Record<string, unknown>> & {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
};

export type FinanceMutationInput = Readonly<Record<string, unknown>>;

export type FinanceFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "tags";

export type FinanceFieldOption = Readonly<{ value: string; label: string }>;

export type FinanceFieldDescriptor = Readonly<{
  name: string;
  column: string;
  label: string;
  type: FinanceFieldType;
  required?: boolean;
  options?: readonly FinanceFieldOption[];
  transform?: "upper" | "lower";
  helpText?: string;
  step?: string;
  min?: number;
  max?: number;
  showInList?: boolean;
  autoCode?: BusinessCodeConfig;
}>;

export type FinanceRelationDescriptor = Readonly<{
  key: string;
  label: string;
  field: string;
  targetBasePath?: string;
}>;

export type FinanceEntityDescriptor = Readonly<{
  key: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  basePath: string;
  icon?: string;
  viewPermission: PermissionKey;
  managePermission: PermissionKey;
  searchColumns: readonly string[];
  fields: readonly FinanceFieldDescriptor[];
  statusField: "status" | "is_active";
  statusValues?: readonly string[];
  defaultStatus?: string;
  fixedFilter?: Readonly<{ column: string; value: string }>;
  relations?: readonly FinanceRelationDescriptor[];
  supportsTree?: boolean;
  treeParentField?: string;
  reconciliationNotes?: readonly string[];
}>;

export type FinanceEntityKey =
  | "account-types"
  | "chart-of-accounts"
  | "journals"
  | "fiscal-years"
  | "fiscal-periods"
  | "currencies"
  | "taxes"
  | "payment-terms"
  | "cost-centers"
  | "dimensions";

export type FinanceDashboardMetric = Readonly<{
  key: string;
  label: string;
  count: number;
  description: string;
  href: string;
}>;

export type FinanceDashboardData = Readonly<{
  metrics: readonly FinanceDashboardMetric[];
  errorMessage?: string;
}>;
