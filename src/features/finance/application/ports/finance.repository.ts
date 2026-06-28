import type { FinanceCursorPage, FinanceListQuery, FinanceMutationInput, FinanceRecord } from "../types";

export type FinanceRepository = Readonly<{
  list: (query: FinanceListQuery) => Promise<FinanceCursorPage<FinanceRecord>>;
  listAll: (query: FinanceListQuery) => Promise<readonly FinanceRecord[]>;
  findById: (id: string) => Promise<FinanceRecord | null>;
  create: (input: FinanceMutationInput) => Promise<FinanceRecord>;
  update: (id: string, input: FinanceMutationInput) => Promise<FinanceRecord>;
  archive: (id: string) => Promise<void>;
  count: () => Promise<number>;
}>;
