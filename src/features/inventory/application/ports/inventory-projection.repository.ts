import type { InventoryLedgerEntryDefinition } from "../types/inventory-ledger";
import type {
  InventoryHandlingUnitIdentityProjection,
  InventoryProjectionEngineState,
  InventoryProjectionRow,
  InventoryProjectionRuntimeState,
  InventorySerialIdentityProjection,
} from "../types/inventory-projection";

export type InventoryProjectionRepository = Readonly<{
  clearAppliedEntries(scope: InventoryProjectionScope): Promise<void>;
  clearProjections(scope: InventoryProjectionScope): Promise<void>;
  isLedgerEntryApplied(ledgerEntryId: string): Promise<boolean>;
  listLedgerEntriesForReplay(scope: InventoryProjectionScope): Promise<readonly InventoryLedgerEntryDefinition[]>;
  listProjectionRows(scope: InventoryProjectionScope): Promise<readonly InventoryProjectionRow[]>;
  loadRuntimeState(scope: InventoryProjectionScope): Promise<InventoryProjectionRuntimeState | null>;
  markLedgerEntryApplied(input: {
    causationId?: string | null;
    correlationId?: string | null;
    ledgerEntryId: string;
    projectionVersion: number;
    scope: InventoryProjectionScope;
  }): Promise<void>;
  saveRuntimeState(scope: InventoryProjectionScope, runtime: InventoryProjectionRuntimeState): Promise<void>;
  upsertProjections(rows: readonly InventoryProjectionRow[], scope: InventoryProjectionScope): Promise<void>;
  updateHandlingUnitIdentityProjections(
    updates: readonly InventoryHandlingUnitIdentityProjection[],
    scope: InventoryProjectionScope,
  ): Promise<void>;
  updateSerialIdentityProjections(
    updates: readonly InventorySerialIdentityProjection[],
    scope: InventoryProjectionScope,
  ): Promise<void>;
}>;

export type InventoryProjectionScope = Readonly<{
  branchId?: string | null;
  companyId: string;
  tenantId: string;
}>;

export type InventoryProjectionReadRepository = Readonly<{
  listProjectionRows(scope: InventoryProjectionScope): Promise<readonly InventoryProjectionRow[]>;
  loadEngineState(scope: InventoryProjectionScope): Promise<InventoryProjectionEngineState>;
}>;
