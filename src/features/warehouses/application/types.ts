export type MasterDataSortDirection = "asc" | "desc";

export type MasterDataListQuery = Readonly<{
  cursor?: string | null;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: MasterDataSortDirection;
}>;

export type CursorPage<TRecord> = Readonly<{
  records: readonly TRecord[];
  nextCursor: string | null;
  pageSize: number;
}>;

export type WarehouseRecord = Readonly<{
  id: string;
  tenantId: string;
  warehouseCode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  warehouseType: string | null;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type WarehouseCreateInput = Readonly<Record<string, unknown>>;
export type WarehouseUpdateInput = WarehouseCreateInput;
