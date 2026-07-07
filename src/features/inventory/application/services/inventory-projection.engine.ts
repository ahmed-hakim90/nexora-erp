import type {
  InventoryInventoryStatus,
  InventoryObjectType,
  InventoryProjectionKind,
} from "../types/inventory-documents";
import type { InventoryLedgerEntryDefinition } from "../types/inventory-ledger";
import type {
  InventoryAvailabilitySnapshotQuery,
  InventoryCurrentStockQuery,
  InventoryHandlingUnitIdentityProjection,
  InventoryLedgerBackedCurrentStateQuery,
  InventoryProjectionApplyResult,
  InventoryProjectionEngineState,
  InventoryProjectionEventInput,
  InventoryProjectionRebuildResult,
  InventoryProjectionRow,
  InventoryProjectionRuntimeState,
  InventoryProjectionShellStatus,
  InventorySerialIdentityProjection,
} from "../types/inventory-projection";
import {
  INVENTORY_PROJECTION_SHELL_STATUS_MAP,
} from "../types/inventory-projection";

export {
  INVENTORY_PROJECTION_REBUILD_STATUSES,
  INVENTORY_PROJECTION_SHELL_STATUS_MAP,
} from "../types/inventory-projection";

export function createEmptyProjectionEngineState(
  runtime: Partial<InventoryProjectionRuntimeState> = {},
): InventoryProjectionEngineState {
  return {
    appliedLedgerEntryIds: new Set(),
    handlingUnitIdentity: new Map(),
    rows: new Map(),
    runtime: {
      lastProcessedLedgerEntryId: runtime.lastProcessedLedgerEntryId ?? null,
      lastProcessedPostingTimestamp: runtime.lastProcessedPostingTimestamp ?? null,
      projectionVersion: runtime.projectionVersion ?? 1,
      rebuildCompletedAt: runtime.rebuildCompletedAt ?? null,
      rebuildMetadata: runtime.rebuildMetadata ?? {},
      rebuildStartedAt: runtime.rebuildStartedAt ?? null,
      rebuildStatus: runtime.rebuildStatus ?? "idle",
    },
    serialIdentity: new Map(),
  };
}

export function buildProjectionIdempotencyKey(ledgerEntryId: string) {
  return `inventory.projection.apply:${ledgerEntryId}`;
}

export function buildProjectionAnchorKey(input: {
  projectionKind: InventoryProjectionKind;
  objectType: InventoryObjectType;
  productId?: string | null;
  variantId?: string | null;
  lotId?: string | null;
  serialId?: string | null;
  handlingUnitId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  inventoryStatus?: InventoryInventoryStatus | null;
}) {
  return [
    input.projectionKind,
    input.objectType,
    input.productId ?? "",
    input.variantId ?? "",
    input.lotId ?? "",
    input.serialId ?? "",
    input.handlingUnitId ?? "",
    input.warehouseId ?? "",
    input.locationId ?? "",
    input.inventoryStatus ?? "",
  ].join("|");
}

function primaryProjectionKindForObject(objectType: InventoryObjectType): InventoryProjectionKind | null {
  if (objectType === "product_quantity") return "product_quantity";
  if (objectType === "lot_quantity") return "lot_quantity";
  if (objectType === "serial") return "serial_state";
  if (objectType === "handling_unit" || objectType === "child_handling_unit") return "handling_unit_state";
  return null;
}

function shellProjectionKindForStatus(status: string | null | undefined): InventoryProjectionKind | null {
  if (!status) return null;
  return INVENTORY_PROJECTION_SHELL_STATUS_MAP[status as InventoryProjectionShellStatus] ?? null;
}

function custodianFromEntry(entry: InventoryLedgerEntryDefinition) {
  const metadata = entry.eventMetadata ?? {};
  const custodian = metadata.custodianSnapshot;
  return typeof custodian === "object" && custodian !== null && !Array.isArray(custodian)
    ? custodian as Record<string, unknown>
    : {};
}

function shouldApplyLedgerEntry(entry: InventoryLedgerEntryDefinition) {
  return entry.eventType === "posted" || entry.eventType === "reversed";
}

function applyProjectionDelta(
  rows: ReadonlyMap<string, InventoryProjectionRow>,
  input: Omit<InventoryProjectionRow, "anchorKey" | "projectedAt" | "quantity"> & { quantity: number; projectedAt?: string },
) {
  const anchorKey = buildProjectionAnchorKey(input);
  const existing = rows.get(anchorKey);
  const row: InventoryProjectionRow = {
    anchorKey,
    causationId: input.causationId,
    correlationId: input.correlationId,
    custodian: input.custodian,
    derivedFromDocumentId: input.derivedFromDocumentId,
    derivedFromLedgerEntryId: input.derivedFromLedgerEntryId,
    handlingUnitId: input.handlingUnitId,
    inventoryStatus: input.inventoryStatus,
    locationId: input.locationId,
    lotId: input.lotId,
    objectType: input.objectType,
    productId: input.productId,
    projectedAt: input.projectedAt ?? new Date().toISOString(),
    projectionKind: input.projectionKind,
    projectionVersion: input.projectionVersion,
    quantity: (existing?.quantity ?? 0) + input.quantity,
    serialId: input.serialId,
    uomId: input.uomId,
    variantId: input.variantId,
    warehouseId: input.warehouseId,
  };
  const nextRows = new Map(rows);
  nextRows.set(anchorKey, row);
  return { row, rows: nextRows };
}

function deriveSerialIdentityProjection(entry: InventoryLedgerEntryDefinition): InventorySerialIdentityProjection | null {
  if (!entry.serialId) return null;
  return {
    causationId: entry.causationId ?? null,
    correlationId: entry.correlationId,
    currentCustodian: custodianFromEntry(entry),
    currentHandlingUnitId: entry.handlingUnitId ?? null,
    currentLocationId: entry.locationId ?? null,
    currentWarehouseId: entry.warehouseId ?? null,
    derivedFromLedgerEntryId: entry.ledgerEntryId,
    inventoryStatus: (entry.inventoryStatus as InventoryInventoryStatus | null | undefined) ?? null,
    serialId: entry.serialId,
  };
}

function deriveHandlingUnitIdentityProjection(entry: InventoryLedgerEntryDefinition): InventoryHandlingUnitIdentityProjection | null {
  const handlingUnitId = entry.handlingUnitId ?? entry.childHandlingUnitId;
  if (!handlingUnitId) return null;
  return {
    causationId: entry.causationId ?? null,
    correlationId: entry.correlationId,
    currentCustodian: custodianFromEntry(entry),
    derivedFromLedgerEntryId: entry.ledgerEntryId,
    handlingUnitId,
    inventoryStatus: (entry.inventoryStatus as InventoryInventoryStatus | null | undefined) ?? null,
    locationId: entry.locationId ?? null,
    warehouseId: entry.warehouseId ?? null,
  };
}

export function applyLedgerEntryToProjectionState(
  state: InventoryProjectionEngineState,
  entry: InventoryLedgerEntryDefinition,
): InventoryProjectionApplyResult {
  if (state.appliedLedgerEntryIds.has(entry.ledgerEntryId)) {
    return {
      applied: false,
      handlingUnitIdentityUpdates: [],
      serialIdentityUpdates: [],
      skippedReason: "already_applied",
      state,
      updatedRows: [],
    };
  }

  if (!shouldApplyLedgerEntry(entry)) {
    return {
      applied: false,
      handlingUnitIdentityUpdates: [],
      serialIdentityUpdates: [],
      skippedReason: "ignored_event_type",
      state,
      updatedRows: [],
    };
  }

  const updatedRows: InventoryProjectionRow[] = [];
  let rows = state.rows;
  const projectionVersion = state.runtime.projectionVersion;
  const objectType = entry.inventoryObjectType;
  const inventoryStatus = (entry.inventoryStatus as InventoryInventoryStatus | null | undefined) ?? null;
  const baseRow = {
    causationId: entry.causationId ?? null,
    correlationId: entry.correlationId,
    custodian: custodianFromEntry(entry),
    derivedFromDocumentId: entry.documentId ?? null,
    derivedFromLedgerEntryId: entry.ledgerEntryId,
    handlingUnitId: entry.handlingUnitId ?? entry.childHandlingUnitId ?? null,
    inventoryStatus,
    locationId: entry.locationId ?? null,
    lotId: entry.lotId ?? null,
    objectType,
    productId: entry.productId ?? null,
    projectionVersion,
    quantity: entry.quantityDelta,
    serialId: entry.serialId ?? null,
    uomId: entry.uomId ?? null,
    variantId: entry.variantId ?? null,
    warehouseId: entry.warehouseId ?? null,
  };

  const primaryKind = primaryProjectionKindForObject(objectType);
  if (primaryKind) {
    const primary = applyProjectionDelta(rows, { ...baseRow, projectionKind: primaryKind });
    rows = primary.rows;
    updatedRows.push(primary.row);
  }

  const shellKind = shellProjectionKindForStatus(inventoryStatus);
  if (shellKind && (objectType === "product_quantity" || objectType === "lot_quantity")) {
    const shell = applyProjectionDelta(rows, { ...baseRow, projectionKind: shellKind });
    rows = shell.rows;
    updatedRows.push(shell.row);
  }

  const serialIdentityUpdates: InventorySerialIdentityProjection[] = [];
  const handlingUnitIdentityUpdates: InventoryHandlingUnitIdentityProjection[] = [];
  const serialIdentity = new Map(state.serialIdentity);
  const handlingUnitIdentity = new Map(state.handlingUnitIdentity);

  const serialProjection = deriveSerialIdentityProjection(entry);
  if (serialProjection) {
    serialIdentity.set(serialProjection.serialId, serialProjection);
    serialIdentityUpdates.push(serialProjection);
  }

  const handlingUnitProjection = deriveHandlingUnitIdentityProjection(entry);
  if (handlingUnitProjection) {
    handlingUnitIdentity.set(handlingUnitProjection.handlingUnitId, handlingUnitProjection);
    handlingUnitIdentityUpdates.push(handlingUnitProjection);
  }

  const appliedLedgerEntryIds = new Set(state.appliedLedgerEntryIds);
  appliedLedgerEntryIds.add(entry.ledgerEntryId);

  const nextState: InventoryProjectionEngineState = {
    appliedLedgerEntryIds,
    handlingUnitIdentity,
    rows,
    runtime: {
      ...state.runtime,
      lastProcessedLedgerEntryId: entry.ledgerEntryId,
      lastProcessedPostingTimestamp: entry.postingTimestamp,
    },
    serialIdentity,
  };

  return {
    applied: true,
    handlingUnitIdentityUpdates,
    serialIdentityUpdates,
    state: nextState,
    updatedRows,
  };
}

export function sortLedgerEntriesForReplay(entries: readonly InventoryLedgerEntryDefinition[]) {
  return [...entries].sort((left, right) => {
    const timestampCompare = left.postingTimestamp.localeCompare(right.postingTimestamp);
    if (timestampCompare !== 0) return timestampCompare;
    return left.ledgerEntryId.localeCompare(right.ledgerEntryId);
  });
}

export function rebuildProjectionFromLedger(
  entries: readonly InventoryLedgerEntryDefinition[],
  runtime: Partial<InventoryProjectionRuntimeState> = {},
): InventoryProjectionRebuildResult {
  const startedAt = new Date().toISOString();
  let state = createEmptyProjectionEngineState({
    ...runtime,
    projectionVersion: (runtime.projectionVersion ?? 1) + 1,
    rebuildCompletedAt: null,
    rebuildMetadata: { entryCount: entries.length },
    rebuildStartedAt: startedAt,
    rebuildStatus: "rebuilding",
  });

  let processedCount = 0;
  let skippedCount = 0;

  for (const entry of sortLedgerEntriesForReplay(entries)) {
    const result = applyLedgerEntryToProjectionState(state, entry);
    state = result.state;
    if (result.applied) processedCount += 1;
    else skippedCount += 1;
  }

  return {
    processedCount,
    skippedCount,
    state: {
      ...state,
      runtime: {
        ...state.runtime,
        rebuildCompletedAt: new Date().toISOString(),
        rebuildStatus: "idle",
      },
    },
  };
}

export function processInventoryProjectionEvent(
  state: InventoryProjectionEngineState,
  input: InventoryProjectionEventInput,
): InventoryProjectionApplyResult {
  if (input.eventName === "LedgerPostingCompleted" || input.eventName === "LedgerEntryCreated" || input.eventName === "LedgerEntryReversed") {
    return applyLedgerEntryToProjectionState(state, input.ledgerEntry);
  }
  return {
    applied: false,
    handlingUnitIdentityUpdates: [],
    serialIdentityUpdates: [],
    skippedReason: "ignored_event_type",
    state,
    updatedRows: [],
  };
}

function matchesQuery(row: Record<string, unknown>, query: Record<string, string | null | undefined>) {
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined || value === null || value === "") return true;
    return row[key] === value;
  });
}

export function getCurrentStock(state: InventoryProjectionEngineState, query: InventoryCurrentStockQuery = {}) {
  return [...state.rows.values()].filter((row) =>
    (row.projectionKind === "product_quantity" || row.projectionKind === "lot_quantity")
    && matchesQuery(row, query),
  );
}

export function getSerialCurrentState(state: InventoryProjectionEngineState, serialId: string) {
  return state.serialIdentity.get(serialId) ?? null;
}

export function getHandlingUnitCurrentState(state: InventoryProjectionEngineState, handlingUnitId: string) {
  return state.handlingUnitIdentity.get(handlingUnitId) ?? null;
}

export function getAvailabilitySnapshot(state: InventoryProjectionEngineState, query: InventoryAvailabilitySnapshotQuery = {}) {
  return [...state.rows.values()].filter((row) =>
    row.projectionKind === "availability" && matchesQuery(row, query),
  );
}

export function getLedgerBackedCurrentState(state: InventoryProjectionEngineState, query: InventoryLedgerBackedCurrentStateQuery = {}) {
  return [...state.rows.values()].filter((row) => matchesQuery(row, query));
}
