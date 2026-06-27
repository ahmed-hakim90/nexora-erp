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

export type ProductRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  sku: string | null;
  barcode: string | null;
  nameAr: string | null;
  nameEn: string | null;
  categoryId: string | null;
  brandId: string | null;
  productType: string | null;
  unitId: string | null;
  defaultPurchaseUnitId: string | null;
  defaultSalesUnitId: string | null;
  costingSettings: Record<string, unknown>;
  salesSettings: Record<string, unknown>;
  purchaseSettings: Record<string, unknown>;
  inventorySettings: Record<string, unknown>;
  isManufacturable: boolean;
  isStockable: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
  imageMetadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type ProductCreateInput = Readonly<Record<string, unknown>>;
export type ProductUpdateInput = ProductCreateInput;
