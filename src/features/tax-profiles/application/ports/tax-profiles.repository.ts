import type { CursorPage, MasterDataListQuery, TaxProfileCreateInput, TaxProfileRecord, TaxProfileUpdateInput } from "../types";

export type TaxProfileRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<TaxProfileRecord>>;
  findById: (id: string) => Promise<TaxProfileRecord | null>;
  create: (input: TaxProfileCreateInput) => Promise<TaxProfileRecord>;
  update: (id: string, input: TaxProfileUpdateInput) => Promise<TaxProfileRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
