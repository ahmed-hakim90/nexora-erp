import type { CursorPage, MasterDataListQuery, PriceListCreateInput, PriceListRecord, PriceListUpdateInput } from "../types";

export type PriceListRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<PriceListRecord>>;
  findById: (id: string) => Promise<PriceListRecord | null>;
  create: (input: PriceListCreateInput) => Promise<PriceListRecord>;
  update: (id: string, input: PriceListUpdateInput) => Promise<PriceListRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
