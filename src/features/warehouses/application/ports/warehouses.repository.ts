import type { CursorPage, MasterDataListQuery, WarehouseCreateInput, WarehouseRecord, WarehouseUpdateInput } from "../types";

export type WarehouseRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<WarehouseRecord>>;
  findById: (id: string) => Promise<WarehouseRecord | null>;
  create: (input: WarehouseCreateInput) => Promise<WarehouseRecord>;
  update: (id: string, input: WarehouseUpdateInput) => Promise<WarehouseRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
