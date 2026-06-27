import type { CursorPage, MasterDataListQuery, SupplierCreateInput, SupplierRecord, SupplierUpdateInput } from "../types";

export type SupplierRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<SupplierRecord>>;
  findById: (id: string) => Promise<SupplierRecord | null>;
  create: (input: SupplierCreateInput) => Promise<SupplierRecord>;
  update: (id: string, input: SupplierUpdateInput) => Promise<SupplierRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
