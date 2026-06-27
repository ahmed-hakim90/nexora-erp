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

export type PriceListRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  code: string | null;
  nameAr: string | null;
  nameEn: string | null;
  priceListType: string | null;
  currencyCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type PriceListCreateInput = Readonly<Record<string, unknown>>;
export type PriceListUpdateInput = PriceListCreateInput;
