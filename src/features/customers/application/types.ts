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

export type CustomerRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  customerCode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  phone: string | null;
  email: string | null;
  customerType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type CustomerCreateInput = Readonly<Record<string, unknown>>;
export type CustomerUpdateInput = CustomerCreateInput;
