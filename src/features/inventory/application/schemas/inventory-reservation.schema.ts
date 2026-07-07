import { z } from "zod";

import { INVENTORY_INVENTORY_STATUSES, INVENTORY_OBJECT_TYPES } from "../types/inventory-documents";
import {
  INVENTORY_RESERVATION_ALLOCATION_STRATEGIES,
  INVENTORY_RESERVATION_DEMAND_SOURCES,
  INVENTORY_RESERVATION_FOUNDATION_STATUSES,
} from "../types/inventory-reservation";
import { validateInventoryObjectRef } from "./inventory-documents.schema";

const optionalId = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());

export const inventoryReservationLineSchema = z.object({
  allocationStrategy: z.enum(INVENTORY_RESERVATION_ALLOCATION_STRATEGIES).nullable().optional(),
  handlingUnitId: optionalId.optional(),
  inventoryStatus: z.enum(INVENTORY_INVENTORY_STATUSES).nullable().optional(),
  lineNumber: z.coerce.number().int().positive(),
  locationId: optionalId.optional(),
  lotId: optionalId.optional(),
  objectLabel: z.string().trim().optional(),
  objectType: z.enum(INVENTORY_OBJECT_TYPES),
  productId: optionalId.optional(),
  quantity: z.coerce.number().positive().nullable().optional(),
  requestedQuantity: z.coerce.number().positive(),
  serialId: optionalId.optional(),
  snapshotMetadata: z.record(z.string(), z.unknown()).default({}),
  uomId: optionalId.optional(),
  validationMetadata: z.record(z.string(), z.unknown()).default({}),
  variantId: optionalId.optional(),
  warehouseId: optionalId.optional(),
});

export const inventoryReservationSchema = z.object({
  correlationId: z.string().trim().min(1),
  demandStatus: z.enum(INVENTORY_RESERVATION_FOUNDATION_STATUSES).default("draft"),
  expiresAt: z.string().trim().nullable().optional(),
  lines: z.array(inventoryReservationLineSchema).min(1),
  priority: z.coerce.number().int().default(0),
  releaseReason: optionalId.optional(),
  reservationId: z.string().trim().min(1),
  reservationNumber: z.string().trim().min(1),
  sourceDocumentId: optionalId.optional(),
  sourceDocumentLineId: optionalId.optional(),
  sourceDocumentType: z.string().trim().min(1),
  sourceModule: z.enum(INVENTORY_RESERVATION_DEMAND_SOURCES),
});

export const inventoryReservationListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  demandStatus: z.enum(INVENTORY_RESERVATION_FOUNDATION_STATUSES).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  sourceModule: z.enum(INVENTORY_RESERVATION_DEMAND_SOURCES).optional(),
});

function objectRefFromReservationLine(input: z.infer<typeof inventoryReservationLineSchema>) {
  return {
    childHandlingUnitId: null,
    handlingUnitId: input.handlingUnitId,
    label: input.objectLabel ?? "Reservation Object",
    lotId: input.lotId,
    objectType: input.objectType,
    productId: input.productId,
    quantity: input.objectType === "serial" || input.objectType === "handling_unit" || input.objectType === "child_handling_unit"
      ? 1
      : input.requestedQuantity,
    serialId: input.serialId,
    traceabilityReady: true,
    uomId: input.uomId,
    variantId: input.variantId,
  };
}

export function validateInventoryReservationLine(
  input: z.infer<typeof inventoryReservationLineSchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  validateInventoryObjectRef(objectRefFromReservationLine(input), (message, path) => {
    reportIssue(message, path);
  });
}

export function validateInventoryReservation(
  input: z.infer<typeof inventoryReservationSchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  input.lines.forEach((line, index) => {
    validateInventoryReservationLine(line, (message, path) => {
      reportIssue(message, ["lines", index, ...path]);
    });
  });
}

export function validateReservationEngineWriteBoundary(
  writeSetting: string | null | undefined,
  reportIssue: (message: string) => void,
) {
  if (writeSetting !== "true" && writeSetting !== "on") {
    reportIssue("Inventory reservations may only be written when app.inventory_reservation_engine is enabled.");
  }
}

export {
  INVENTORY_RESERVATION_ALLOCATION_STRATEGIES,
  INVENTORY_RESERVATION_DEMAND_SOURCES,
  INVENTORY_RESERVATION_FOUNDATION_STATUSES,
  INVENTORY_RESERVATION_FOUNDATION_EVENT_NAMES,
} from "../types/inventory-reservation";
