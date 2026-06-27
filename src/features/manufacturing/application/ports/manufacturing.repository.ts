import type { CursorPage, ManufacturingListQuery, ManufacturingMutationInput, ManufacturingRecord, ManufacturingResourceDefinition } from "../types";

export type ManufacturingRepository = Readonly<{
  list: (definition: ManufacturingResourceDefinition, query: ManufacturingListQuery) => Promise<CursorPage<ManufacturingRecord>>;
  findById: (definition: ManufacturingResourceDefinition, id: string) => Promise<ManufacturingRecord | null>;
  create: (definition: ManufacturingResourceDefinition, input: ManufacturingMutationInput) => Promise<ManufacturingRecord>;
  update: (definition: ManufacturingResourceDefinition, id: string, input: ManufacturingMutationInput) => Promise<ManufacturingRecord>;
  softDelete: (definition: ManufacturingResourceDefinition, id: string) => Promise<void>;
}>;
