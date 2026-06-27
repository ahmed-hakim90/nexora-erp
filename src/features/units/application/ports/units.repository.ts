import type { CursorPage, MasterDataListQuery, UnitCreateInput, UnitRecord, UnitUpdateInput } from "../types";

export type UnitRepository = Readonly<{
  list: (query: MasterDataListQuery) => Promise<CursorPage<UnitRecord>>;
  findById: (id: string) => Promise<UnitRecord | null>;
  create: (input: UnitCreateInput) => Promise<UnitRecord>;
  update: (id: string, input: UnitUpdateInput) => Promise<UnitRecord>;
  softDelete: (id: string) => Promise<void>;
}>;
