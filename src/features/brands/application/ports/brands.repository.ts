import type { CursorPage, MasterDataListQuery, BrandCreateInput, BrandRecord, BrandUpdateInput } from "../types";

export type BrandRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<BrandRecord>>;
  findById: (id: string) => Promise<BrandRecord | null>;
  create: (input: BrandCreateInput) => Promise<BrandRecord>;
  update: (id: string, input: BrandUpdateInput) => Promise<BrandRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
