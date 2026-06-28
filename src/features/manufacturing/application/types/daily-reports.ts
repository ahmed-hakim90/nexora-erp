export type ManufacturingDailyReportStatus =
  | "draft"
  | "active"
  | "released"
  | "completed"
  | "cancelled"
  | "inactive"
  | "locked"
  | "archived";

export type ManufacturingDailyReportRecord = Readonly<{
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  reportKey: string;
  reportDate: string;
  shiftKey: string;
  manufacturingProductId: string;
  productionLineId: string;
  supervisorRefId: string | null;
  plannedQuantity: number;
  actualQuantity: number;
  scrapQuantity: number;
  reworkQuantity: number;
  downtimeMinutes: number;
  workerOutput: readonly unknown[];
  notes: string | null;
  status: ManufacturingDailyReportStatus;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
}>;

export type ManufacturingDailyReportLookup = Readonly<{
  id: string;
  label: string;
  meta?: string;
}>;

export type ManufacturingDailyReportWorkspaceData = Readonly<{
  records: readonly ManufacturingDailyReportRecord[];
  nextCursor: string | null;
  pageSize: number;
  products: readonly ManufacturingDailyReportLookup[];
  lines: readonly ManufacturingDailyReportLookup[];
  workers: readonly ManufacturingDailyReportLookup[];
}>;
