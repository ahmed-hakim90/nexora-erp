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

export type SupplierRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  supplierCode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  phone: string | null;
  email: string | null;
  supplierType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type SupplierCreateInput = Readonly<Record<string, unknown>>;
export type SupplierUpdateInput = SupplierCreateInput;
