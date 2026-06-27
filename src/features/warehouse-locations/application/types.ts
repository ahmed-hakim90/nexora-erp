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

export type WarehouseLocationRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  locationCode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  warehouseId: string | null;
  parentLocationId: string | null;
  locationType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type WarehouseLocationCreateInput = Readonly<Record<string, unknown>>;
export type WarehouseLocationUpdateInput = WarehouseLocationCreateInput;
