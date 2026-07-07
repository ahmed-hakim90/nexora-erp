import { z } from "zod";

import {
  INVENTORY_LEDGER_BUSINESS_MODULES,
  INVENTORY_LEDGER_EVENT_TYPES,
  INVENTORY_LEDGER_MOVEMENT_DIRECTIONS,
  INVENTORY_LEDGER_MOVEMENT_TYPES,
  INVENTORY_LEDGER_OBJECT_TYPES,
  type InventoryLedgerEntryDefinition,
} from "../types/inventory-ledger";
import { validateInventoryObjectRef } from "./inventory-documents.schema";

const optionalId = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());

export const inventoryLedgerListQuerySchema = z.object({
  businessModule: z.string().trim().optional(),
  correlationId: z.string().trim().optional(),
  cursor: z.string().optional().nullable(),
  documentId: z.string().trim().optional(),
  documentType: z.string().trim().optional(),
  fromDate: z.string().trim().optional(),
  handlingUnitId: z.string().trim().optional(),
  inventoryObjectType: z.enum(INVENTORY_LEDGER_OBJECT_TYPES).optional(),
  locationId: z.string().trim().optional(),
  lotId: z.string().trim().optional(),
  movementType: z.enum(INVENTORY_LEDGER_MOVEMENT_TYPES).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  productId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  serialId: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
  warehouseId: z.string().trim().optional(),
});

export const inventoryLedgerEntrySchema = z.object({
  businessModule: z.enum(INVENTORY_LEDGER_BUSINESS_MODULES),
  causationId: optionalId.optional(),
  childHandlingUnitId: optionalId.optional(),
  correlationId: z.string().trim().min(1),
  documentId: optionalId.optional(),
  documentLineId: optionalId.optional(),
  documentType: z.string().trim().min(1),
  eventMetadata: z.record(z.string(), z.unknown()).default({}),
  eventType: z.enum(INVENTORY_LEDGER_EVENT_TYPES),
  handlingUnitId: optionalId.optional(),
  inventoryObjectType: z.enum(INVENTORY_LEDGER_OBJECT_TYPES),
  inventoryStatus: optionalId.optional(),
  locationId: optionalId.optional(),
  lotId: optionalId.optional(),
  movementDirection: z.enum(INVENTORY_LEDGER_MOVEMENT_DIRECTIONS),
  movementType: z.enum(INVENTORY_LEDGER_MOVEMENT_TYPES),
  parentEntryId: optionalId.optional(),
  postingTimestamp: z.string().trim().min(1),
  productId: optionalId.optional(),
  quantityDelta: z.coerce.number().refine((value) => value !== 0, "quantity_delta must not be zero."),
  serialId: optionalId.optional(),
  uomId: optionalId.optional(),
  variantId: optionalId.optional(),
  warehouseId: optionalId.optional(),
});

function objectRefFromLedgerEntry(input: z.infer<typeof inventoryLedgerEntrySchema>) {
  return {
    childHandlingUnitId: input.childHandlingUnitId,
    handlingUnitId: input.handlingUnitId,
    label: typeof input.eventMetadata.objectLabelSnapshot === "string" ? input.eventMetadata.objectLabelSnapshot : "Ledger Object",
    lotId: input.lotId,
    objectType: input.inventoryObjectType,
    productId: input.productId,
    quantity: input.inventoryObjectType === "serial" || input.inventoryObjectType === "handling_unit" || input.inventoryObjectType === "child_handling_unit" ? 1 : Math.abs(input.quantityDelta),
    serialId: input.serialId,
    traceabilityReady: true,
    uomId: input.uomId,
    variantId: input.variantId,
  };
}

export function validateInventoryLedgerEntry(
  input: z.infer<typeof inventoryLedgerEntrySchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  validateInventoryObjectRef(objectRefFromLedgerEntry(input), (message, path) => {
    reportIssue(message, path);
  });

  const systemAdjustment = input.eventMetadata.systemAdjustment === true;
  if (!input.documentId && !systemAdjustment) {
    reportIssue("Ledger entries require an inventory document unless system adjustment contract is declared.", ["documentId"]);
  }
  if (!input.documentLineId && !systemAdjustment) {
    reportIssue("Ledger entries require an inventory document line unless system adjustment contract is declared.", ["documentLineId"]);
  }

  if (input.eventType === "reversed" && !input.parentEntryId) {
    reportIssue("Reversal ledger entries must reference parent_entry_id.", ["parentEntryId"]);
  }

  if (input.movementDirection === "IN" && input.quantityDelta <= 0) {
    reportIssue("IN movement requires positive quantity_delta.", ["quantityDelta"]);
  }
  if (input.movementDirection === "OUT" && input.quantityDelta >= 0) {
    reportIssue("OUT movement requires negative quantity_delta.", ["quantityDelta"]);
  }
}

export function validateLedgerReversalPair(
  original: InventoryLedgerEntryDefinition,
  reversal: InventoryLedgerEntryDefinition,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (reversal.eventType !== "reversed") {
    reportIssue("Reversal entry must use reversed event type.", ["eventType"]);
  }
  if (reversal.parentEntryId !== original.ledgerEntryId) {
    reportIssue("Reversal entry must reference the original ledger entry.", ["parentEntryId"]);
  }
  if (reversal.quantityDelta !== original.quantityDelta * -1) {
    reportIssue("Reversal quantity_delta must negate the original entry.", ["quantityDelta"]);
  }
}

export function buildLedgerAuditChain(entries: readonly InventoryLedgerEntryDefinition[]) {
  const byId = new Map(entries.map((entry) => [entry.ledgerEntryId, entry]));
  return entries.map((entry) => ({
    causationId: entry.causationId ?? null,
    correlationId: entry.correlationId,
    entry,
    parent: entry.parentEntryId ? byId.get(entry.parentEntryId) ?? null : null,
  }));
}

export {
  INVENTORY_LEDGER_BUSINESS_MODULES,
  INVENTORY_LEDGER_EVENT_TYPES,
  INVENTORY_LEDGER_MOVEMENT_DIRECTIONS,
  INVENTORY_LEDGER_MOVEMENT_TYPES,
  INVENTORY_LEDGER_OBJECT_TYPES,
  INVENTORY_LEDGER_PROJECTION_EVENT_NAMES,
} from "../types/inventory-ledger";
