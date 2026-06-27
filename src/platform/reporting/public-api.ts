export type ReportExecutionMode = "interactive" | "async";

export type ReportFieldType =
  | "text"
  | "number"
  | "currency"
  | "quantity"
  | "date"
  | "datetime"
  | "boolean";

export type ReportDatasetField = Readonly<{
  key: string;
  label: string;
  type: ReportFieldType;
  isDimension?: boolean;
  isMeasure?: boolean;
  isSensitive?: boolean;
}>;

export type ReportDataset = Readonly<{
  key: string;
  appKey: string;
  label: string;
  fields: readonly ReportDatasetField[];
  requiredPermission: string;
  defaultExecutionMode: ReportExecutionMode;
}>;

export type ReportFilterOperator =
  | "equals"
  | "contains"
  | "starts_with"
  | "between"
  | "gte"
  | "lte"
  | "in";

export type ReportBuilderFilter = Readonly<{
  fieldKey: string;
  operator: ReportFilterOperator;
  value?: unknown;
}>;

export type ReportLayout = Readonly<{
  type: "table" | "summary" | "chart" | "pivot";
  dimensionKeys: readonly string[];
  measureKeys: readonly string[];
  sort?: readonly { fieldKey: string; direction: "asc" | "desc" }[];
}>;

export type ReportBuilderSchema = Readonly<{
  datasetKey: string;
  filters: readonly ReportBuilderFilter[];
  layout: ReportLayout;
  allowExport: boolean;
  allowPrint: boolean;
}>;

export type ReportDefinition = Readonly<{
  key: string;
  datasetKey?: string;
  mode: ReportExecutionMode;
  requiredPermission: string;
  builderSchema?: ReportBuilderSchema;
}>;

export function defineReportDataset<TDataset extends ReportDataset>(
  dataset: TDataset,
): TDataset {
  return dataset;
}

export function defineReport<TReport extends ReportDefinition>(
  report: TReport,
): TReport {
  return report;
}
