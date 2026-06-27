import type { CursorPage, MasterDataListQuery, CustomerCreateInput, CustomerRecord, CustomerUpdateInput } from "../types";

export type CustomerRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<CustomerRecord>>;
  findById: (id: string) => Promise<CustomerRecord | null>;
  create: (input: CustomerCreateInput) => Promise<CustomerRecord>;
  update: (id: string, input: CustomerUpdateInput) => Promise<CustomerRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
