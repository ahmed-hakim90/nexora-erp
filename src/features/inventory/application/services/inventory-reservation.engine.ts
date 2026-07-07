import type {
  InventoryReservationAllocationRecord,
  InventoryReservationAllocationResult,
  InventoryReservationDefinition,
  InventoryReservationEngineState,
  InventoryReservationFoundationEventName,
  InventoryReservationFoundationStatus,
  InventoryReservationLineAllocation,
  InventoryReservationLineDefinition,
  InventoryReservationSnapshot,
  InventoryReservableAvailability,
  InventoryReservableAvailabilityQuery,
} from "../types/inventory-reservation";
import { buildProjectionAnchorKey, getAvailabilitySnapshot } from "./inventory-projection.engine";

export function createEmptyReservationEngineState(
  projectionState: InventoryReservationEngineState["projectionState"],
): InventoryReservationEngineState {
  return {
    activeHandlingUnitReservations: new Map(),
    activeLotReservedQuantity: new Map(),
    activeSerialReservations: new Map(),
    allocations: new Map(),
    projectionState,
    reservations: new Map(),
  };
}

function lotKey(lotId: string, warehouseId?: string | null, locationId?: string | null) {
  return [lotId, warehouseId ?? "", locationId ?? ""].join("|");
}

function matchesAvailabilityQuery(
  row: InventoryReservableAvailability,
  query: InventoryReservableAvailabilityQuery,
) {
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined || value === null || value === "") return true;
    return row[key as keyof InventoryReservableAvailability] === value;
  });
}

function applyReservationClaims(
  state: InventoryReservationEngineState,
  row: InventoryReservableAvailability,
  baseQuantity: number,
): InventoryReservableAvailability {
  const lotReserved = row.lotId ? state.activeLotReservedQuantity.get(lotKey(row.lotId, row.warehouseId, row.locationId)) ?? 0 : 0;
  const serialBlocked = row.serialId ? state.activeSerialReservations.has(row.serialId) : false;
  const huBlocked = row.handlingUnitId ? state.activeHandlingUnitReservations.has(row.handlingUnitId) : false;
  let availableQuantity = baseQuantity - lotReserved;
  if (serialBlocked || huBlocked) availableQuantity = 0;

  return {
    ...row,
    availableQuantity: Math.max(availableQuantity, 0),
  };
}

export function getReservableAvailability(
  state: InventoryReservationEngineState,
  query: InventoryReservableAvailabilityQuery = {},
): readonly InventoryReservableAvailability[] {
  const quantityRows = getAvailabilitySnapshot(state.projectionState, {
    locationId: query.locationId ?? undefined,
    lotId: query.lotId ?? undefined,
    productId: query.productId ?? undefined,
    warehouseId: query.warehouseId ?? undefined,
  }).map((row) => applyReservationClaims(state, {
    anchorKey: row.anchorKey,
    availableQuantity: row.quantity,
    handlingUnitId: row.handlingUnitId,
    inventoryStatus: row.inventoryStatus,
    locationId: row.locationId,
    lotId: row.lotId,
    objectType: row.objectType,
    productId: row.productId,
    serialId: row.serialId,
    warehouseId: row.warehouseId,
  }, row.quantity));

  const serialRows = [...state.projectionState.serialIdentity.entries()].map(([serialId, serial]) => applyReservationClaims(state, {
    anchorKey: buildProjectionAnchorKey({
      inventoryStatus: serial.inventoryStatus,
      locationId: serial.currentLocationId,
      objectType: "serial",
      projectionKind: "serial_state",
      serialId,
      warehouseId: serial.currentWarehouseId,
    }),
    availableQuantity: serial.inventoryStatus === "available" || serial.inventoryStatus === null ? 1 : 0,
    handlingUnitId: serial.currentHandlingUnitId,
    inventoryStatus: serial.inventoryStatus,
    locationId: serial.currentLocationId,
    lotId: null,
    objectType: "serial",
    productId: null,
    serialId,
    warehouseId: serial.currentWarehouseId,
  }, serial.inventoryStatus === "available" || serial.inventoryStatus === null ? 1 : 0));

  const handlingUnitRows = [...state.projectionState.handlingUnitIdentity.entries()].map(([handlingUnitId, handlingUnit]) => applyReservationClaims(state, {
    anchorKey: buildProjectionAnchorKey({
      handlingUnitId,
      inventoryStatus: handlingUnit.inventoryStatus,
      locationId: handlingUnit.locationId,
      objectType: "handling_unit",
      projectionKind: "handling_unit_state",
      warehouseId: handlingUnit.warehouseId,
    }),
    availableQuantity: handlingUnit.inventoryStatus === "available" || handlingUnit.inventoryStatus === null ? 1 : 0,
    handlingUnitId,
    inventoryStatus: handlingUnit.inventoryStatus,
    locationId: handlingUnit.locationId,
    lotId: null,
    objectType: "handling_unit",
    productId: null,
    serialId: null,
    warehouseId: handlingUnit.warehouseId,
  }, handlingUnit.inventoryStatus === "available" || handlingUnit.inventoryStatus === null ? 1 : 0));

  return [...quantityRows, ...serialRows, ...handlingUnitRows]
    .filter((row) => matchesAvailabilityQuery(row, query));
}

export function calculateShortage(requestedQuantity: number, availableQuantity: number) {
  return Math.max(requestedQuantity - Math.max(availableQuantity, 0), 0);
}

function deriveDemandStatus(lines: readonly InventoryReservationLineAllocation[]): InventoryReservationFoundationStatus {
  const totalRequested = lines.reduce((sum, line) => sum + line.requestedQuantity, 0);
  const totalReserved = lines.reduce((sum, line) => sum + line.reservedQuantity, 0);
  if (totalReserved <= 0) return "failed";
  if (totalReserved < totalRequested) return "partially_reserved";
  return "reserved";
}

function deriveEventName(status: InventoryReservationFoundationStatus): InventoryReservationFoundationEventName {
  if (status === "partially_reserved") return "InventoryReservationPartiallyReserved";
  if (status === "reserved") return "InventoryReservationCompleted";
  if (status === "failed") return "InventoryReservationFailed";
  return "InventoryReservationCreated";
}

function allocateLine(
  state: InventoryReservationEngineState,
  reservation: InventoryReservationDefinition,
  line: InventoryReservationLineDefinition,
): {
  allocation: InventoryReservationLineAllocation;
  nextState: InventoryReservationEngineState;
  records: InventoryReservationAllocationRecord[];
} {
  const availability = getReservableAvailability(state, {
    handlingUnitId: line.handlingUnitId,
    inventoryStatus: line.inventoryStatus ?? "available",
    locationId: line.locationId,
    lotId: line.lotId,
    productId: line.productId,
    serialId: line.serialId,
    warehouseId: line.warehouseId,
  });
  const availableQuantity = line.objectType === "serial" || line.objectType === "handling_unit" || line.objectType === "child_handling_unit"
    ? (availability[0]?.availableQuantity ?? 0) > 0 ? 1 : 0
    : availability.reduce((sum, row) => sum + row.availableQuantity, 0);

  if (line.serialId && state.activeSerialReservations.has(line.serialId)) {
    return {
      allocation: {
        allocationStrategy: line.allocationStrategy ?? "strict_serial",
        lineNumber: line.lineNumber,
        requestedQuantity: line.requestedQuantity,
        reservedQuantity: 0,
        shortageQuantity: line.requestedQuantity,
      },
      nextState: state,
      records: [],
    };
  }

  if (line.handlingUnitId && state.activeHandlingUnitReservations.has(line.handlingUnitId)) {
    return {
      allocation: {
        allocationStrategy: line.allocationStrategy ?? "manual",
        lineNumber: line.lineNumber,
        requestedQuantity: line.requestedQuantity,
        reservedQuantity: 0,
        shortageQuantity: line.requestedQuantity,
      },
      nextState: state,
      records: [],
    };
  }

  const reservedQuantity = line.objectType === "serial" || line.objectType === "handling_unit" || line.objectType === "child_handling_unit"
    ? availableQuantity >= 1 ? 1 : 0
    : Math.min(line.requestedQuantity, availableQuantity);
  const shortageQuantity = calculateShortage(line.requestedQuantity, reservedQuantity);

  const records: InventoryReservationAllocationRecord[] = [];
  let nextState = state;

  if (reservedQuantity > 0) {
    const anchorKey = buildProjectionAnchorKey({
      handlingUnitId: line.handlingUnitId,
      inventoryStatus: line.inventoryStatus ?? "available",
      locationId: line.locationId,
      lotId: line.lotId,
      objectType: line.objectType,
      productId: line.productId,
      projectionKind: line.objectType === "lot_quantity" ? "lot_quantity" : "availability",
      serialId: line.serialId,
      variantId: line.variantId,
      warehouseId: line.warehouseId,
    });

    const allocationId = `${reservation.reservationId}:${line.lineNumber}`;
    records.push({
      allocatedQuantity: reservedQuantity,
      allocationId,
      handlingUnitId: line.handlingUnitId ?? null,
      lineNumber: line.lineNumber,
      locationId: line.locationId ?? null,
      lotId: line.lotId ?? null,
      objectType: line.objectType,
      productId: line.productId ?? null,
      projectionAnchorKey: anchorKey,
      reservationId: reservation.reservationId,
      serialId: line.serialId ?? null,
      warehouseId: line.warehouseId ?? null,
    });

    const activeSerialReservations = new Map(nextState.activeSerialReservations);
    const activeHandlingUnitReservations = new Map(nextState.activeHandlingUnitReservations);
    const activeLotReservedQuantity = new Map(nextState.activeLotReservedQuantity);
    const allocations = new Map(nextState.allocations);

    if (line.serialId) activeSerialReservations.set(line.serialId, reservation.reservationId);
    if (line.handlingUnitId) activeHandlingUnitReservations.set(line.handlingUnitId, reservation.reservationId);
    if (line.lotId) {
      const key = lotKey(line.lotId, line.warehouseId, line.locationId);
      activeLotReservedQuantity.set(key, (activeLotReservedQuantity.get(key) ?? 0) + reservedQuantity);
    }
    allocations.set(allocationId, records[0]!);

    nextState = {
      ...nextState,
      activeHandlingUnitReservations,
      activeLotReservedQuantity,
      activeSerialReservations,
      allocations,
    };
  }

  return {
    allocation: {
      allocationStrategy: line.allocationStrategy ?? (line.objectType === "serial" ? "strict_serial" : line.objectType === "lot_quantity" ? "strict_lot" : "any_available"),
      lineNumber: line.lineNumber,
      requestedQuantity: line.requestedQuantity,
      reservedQuantity,
      shortageQuantity,
    },
    nextState,
    records,
  };
}

export function allocateReservation(
  state: InventoryReservationEngineState,
  reservation: InventoryReservationDefinition,
): { result: InventoryReservationAllocationResult; state: InventoryReservationEngineState } {
  let nextState = state;
  const lineAllocations: InventoryReservationLineAllocation[] = [];
  const allocations: InventoryReservationAllocationRecord[] = [];

  for (const line of reservation.lines) {
    const outcome = allocateLine(nextState, reservation, line);
    nextState = outcome.nextState;
    lineAllocations.push(outcome.allocation);
    allocations.push(...outcome.records);
  }

  const demandStatus = deriveDemandStatus(lineAllocations);
  const reservations = new Map(nextState.reservations);
  reservations.set(reservation.reservationId, { ...reservation, demandStatus });

  nextState = { ...nextState, reservations };

  return {
    result: {
      allocations,
      demandStatus,
      eventName: deriveEventName(demandStatus),
      lines: lineAllocations,
    },
    state: nextState,
  };
}

export function releaseReservation(
  state: InventoryReservationEngineState,
  reservationId: string,
  releaseReason: string | null = null,
): { state: InventoryReservationEngineState; released: boolean } {
  const reservation = state.reservations.get(reservationId);
  if (!reservation) return { released: false, state };

  const activeSerialReservations = new Map(state.activeSerialReservations);
  const activeHandlingUnitReservations = new Map(state.activeHandlingUnitReservations);
  const activeLotReservedQuantity = new Map(state.activeLotReservedQuantity);
  const allocations = new Map(state.allocations);

  for (const [allocationId, allocation] of state.allocations) {
    if (allocation.reservationId !== reservationId) continue;
    if (allocation.serialId) activeSerialReservations.delete(allocation.serialId);
    if (allocation.handlingUnitId) activeHandlingUnitReservations.delete(allocation.handlingUnitId);
    if (allocation.lotId) {
      const key = lotKey(allocation.lotId, allocation.warehouseId, allocation.locationId);
      activeLotReservedQuantity.set(key, Math.max((activeLotReservedQuantity.get(key) ?? 0) - allocation.allocatedQuantity, 0));
    }
    allocations.delete(allocationId);
  }

  const reservations = new Map(state.reservations);
  reservations.set(reservationId, {
    ...reservation,
    demandStatus: "released",
    releaseReason,
  });

  return {
    released: true,
    state: {
      ...state,
      activeHandlingUnitReservations,
      activeLotReservedQuantity,
      activeSerialReservations,
      allocations,
      reservations,
    },
  };
}

export function expireReservation(
  state: InventoryReservationEngineState,
  reservationId: string,
): { state: InventoryReservationEngineState; expired: boolean } {
  const released = releaseReservation(state, reservationId, "expired");
  if (!released.released) return { expired: false, state };
  const reservation = released.state.reservations.get(reservationId);
  if (!reservation) return { expired: false, state: released.state };
  const reservations = new Map(released.state.reservations);
  reservations.set(reservationId, { ...reservation, demandStatus: "expired" });
  return { expired: true, state: { ...released.state, reservations } };
}

export function getReservationSnapshot(
  reservation: InventoryReservationDefinition,
  lines: readonly InventoryReservationLineAllocation[],
): InventoryReservationSnapshot {
  return {
    lines,
    reservation,
    totalRequested: lines.reduce((sum, line) => sum + line.requestedQuantity, 0),
    totalReserved: lines.reduce((sum, line) => sum + line.reservedQuantity, 0),
    totalShortage: lines.reduce((sum, line) => sum + line.shortageQuantity, 0),
  };
}

export function isSerialAlreadyReserved(state: InventoryReservationEngineState, serialId: string) {
  return state.activeSerialReservations.has(serialId);
}

export function validateReservationObjectRules(
  line: InventoryReservationLineDefinition,
  state: InventoryReservationEngineState,
  reportIssue: (message: string) => void,
) {
  if (line.objectType === "serial") {
    if (!line.serialId) reportIssue("Serial reservations require serial_id.");
    if (line.serialId && isSerialAlreadyReserved(state, line.serialId)) {
      reportIssue("Serial is already reserved by another active reservation.");
    }
    if (line.requestedQuantity !== 1) reportIssue("Serial reservations must request quantity 1.");
  }
  if (line.objectType === "handling_unit" || line.objectType === "child_handling_unit") {
    if (!line.handlingUnitId) reportIssue("Handling unit reservations require handling_unit_id.");
    if (line.handlingUnitId && state.activeHandlingUnitReservations.has(line.handlingUnitId)) {
      reportIssue("Handling unit is already reserved by another active reservation.");
    }
  }
  if (line.objectType === "lot_quantity" && !line.lotId) {
    reportIssue("Lot reservations require lot_id.");
  }
  if (line.objectType === "product_quantity" && !line.productId) {
    reportIssue("Product quantity reservations require product_id.");
  }
}
