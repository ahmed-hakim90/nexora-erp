import type { CursorPage, MasterDataListQuery, ProductCategoryCreateInput, ProductCategoryRecord, ProductCategoryUpdateInput } from "../types";

export type ProductCategoryRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<ProductCategoryRecord>>;
  findById: (id: string) => Promise<ProductCategoryRecord | null>;
  create: (input: ProductCategoryCreateInput) => Promise<ProductCategoryRecord>;
  update: (id: string, input: ProductCategoryUpdateInput) => Promise<ProductCategoryRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
