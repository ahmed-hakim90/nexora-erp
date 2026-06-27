import type { CursorPage, MasterDataListQuery, WarehouseLocationCreateInput, WarehouseLocationRecord, WarehouseLocationUpdateInput } from "../types";

export type WarehouseLocationRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<WarehouseLocationRecord>>;
  findById: (id: string) => Promise<WarehouseLocationRecord | null>;
  create: (input: WarehouseLocationCreateInput) => Promise<WarehouseLocationRecord>;
  update: (id: string, input: WarehouseLocationUpdateInput) => Promise<WarehouseLocationRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
