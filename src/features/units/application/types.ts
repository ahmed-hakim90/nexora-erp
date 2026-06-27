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

export type UnitRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  code: string | null;
  nameAr: string | null;
  nameEn: string | null;
  unitType: string | null;
  precisionScale: number;
  isBaseUnit: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type UnitCreateInput = Readonly<Record<string, unknown>>;
export type UnitUpdateInput = UnitCreateInput;
