import type { CursorPage, MasterDataListQuery, ProductCreateInput, ProductRecord, ProductUpdateInput } from "../types";

export type ProductRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<ProductRecord>>;
  findById: (id: string) => Promise<ProductRecord | null>;
  create: (input: ProductCreateInput) => Promise<ProductRecord>;
  update: (id: string, input: ProductUpdateInput) => Promise<ProductRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
