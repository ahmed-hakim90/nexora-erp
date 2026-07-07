import { z } from "zod";

import {
  INVENTORY_FOUNDATION_DOCUMENT_KINDS,
  INVENTORY_INVENTORY_STATUSES,
  INVENTORY_OBJECT_TYPES,
  INVENTORY_PROJECTION_KINDS,
  type InventoryObjectRef,
  type InventoryObjectType,
} from "../types/inventory-documents";

const optionalId = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());

export const inventoryObjectRefSchema = z.object({
  childHandlingUnitId: optionalId.optional(),
  handlingUnitId: optionalId.optional(),
  label: optionalId.optional(),
  lotId: optionalId.optional(),
  objectType: z.enum(INVENTORY_OBJECT_TYPES),
  productId: optionalId.optional(),
  quantity: z.coerce.number().nullable().optional(),
  serialId: optionalId.optional(),
  traceabilityReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()).optional(),
  uomId: optionalId.optional(),
  variantId: optionalId.optional(),
});

export const inventoryDocumentLineSchema = z.object({
  destinationLocationId: optionalId.optional(),
  destinationWarehouseId: optionalId.optional(),
  inventoryStatus: z.enum(INVENTORY_INVENTORY_STATUSES),
  lineNumber: z.coerce.number().int().min(1),
  objectRef: inventoryObjectRefSchema,
  reasonCodeMetadata: z.record(z.string(), z.unknown()).default({}),
  snapshotMetadata: z.record(z.string(), z.unknown()).default({}),
  sourceLocationId: optionalId.optional(),
  sourceWarehouseId: optionalId.optional(),
  validationMetadata: z.record(z.string(), z.unknown()).default({}),
});

export const inventoryDocumentSnapshotSchema = z.object({
  actorLabel: optionalId.optional(),
  capturedAt: z.string().trim().min(1),
  correlationId: optionalId.optional(),
  destinationLocationLabel: optionalId.optional(),
  handlingUnitLabel: optionalId.optional(),
  huContentsSnapshot: z.record(z.string(), z.unknown()).default({}),
  lotLabel: optionalId.optional(),
  objectIdentity: z.record(z.string(), z.unknown()),
  productLabel: optionalId.optional(),
  quantity: z.coerce.number().nullable().optional(),
  serialLabel: optionalId.optional(),
  sourceLocationLabel: optionalId.optional(),
  uomLabel: optionalId.optional(),
});

export const inventoryCurrentStateProjectionSchema = z.object({
  correlationId: optionalId.optional(),
  custodian: z.record(z.string(), z.unknown()).default({}),
  derivedFromDocumentId: optionalId.optional(),
  handlingUnitId: optionalId.optional(),
  inventoryStatus: z.enum(INVENTORY_INVENTORY_STATUSES).nullable().optional(),
  locationId: optionalId.optional(),
  lotId: optionalId.optional(),
  objectType: z.enum(INVENTORY_OBJECT_TYPES),
  productId: optionalId.optional(),
  projectionKind: z.enum(INVENTORY_PROJECTION_KINDS),
  quantity: z.coerce.number().nullable().optional(),
  serialId: optionalId.optional(),
  uomId: optionalId.optional(),
  variantId: optionalId.optional(),
  warehouseId: optionalId.optional(),
});

export const inventoryFoundationDocumentKindSchema = z.enum(INVENTORY_FOUNDATION_DOCUMENT_KINDS);

export function validateInventoryObjectRef(
  input: InventoryObjectRef,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  const rules: Record<InventoryObjectType, () => void> = {
    child_handling_unit: () => {
      if (!input.childHandlingUnitId) reportIssue("Child handling unit reference requires child_handling_unit_id.", ["childHandlingUnitId"]);
      if (input.quantity != null && input.quantity !== 1) reportIssue("Child handling unit quantity must be 1 when provided.", ["quantity"]);
    },
    handling_unit: () => {
      if (!input.handlingUnitId) reportIssue("Handling unit reference requires handling_unit_id.", ["handlingUnitId"]);
    },
    lot_quantity: () => {
      if (!input.lotId) reportIssue("Lot quantity reference requires lot_id.", ["lotId"]);
      if (!input.quantity || input.quantity <= 0) reportIssue("Lot quantity reference requires quantity > 0.", ["quantity"]);
    },
    product_quantity: () => {
      if (!input.productId) reportIssue("Product quantity reference requires product_id.", ["productId"]);
      if (!input.quantity || input.quantity <= 0) reportIssue("Product quantity reference requires quantity > 0.", ["quantity"]);
    },
    serial: () => {
      if (!input.serialId) reportIssue("Serial reference requires serial_id.", ["serialId"]);
      if (input.quantity != null && input.quantity !== 1) reportIssue("Serial reference quantity must be 1.", ["quantity"]);
    },
  };

  rules[input.objectType]();

  if (!input.label?.trim()) {
    reportIssue("Inventory object reference must be label-ready.", ["label"]);
  }
  if (input.traceabilityReady !== true) {
    reportIssue("Inventory object reference must be traceability-ready.", ["traceabilityReady"]);
  }
}

export function validateInventoryDocumentLine(
  input: z.infer<typeof inventoryDocumentLineSchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  validateInventoryObjectRef(input.objectRef, (message, path) => {
    reportIssue(message, ["objectRef", ...path]);
  });

  if (input.objectRef.objectType === "serial" || input.objectRef.objectType === "handling_unit" || input.objectRef.objectType === "child_handling_unit") {
    if (input.objectRef.quantity != null && input.objectRef.quantity !== 1) {
      reportIssue("Serial and handling unit lines cannot carry quantity other than 1.", ["objectRef", "quantity"]);
    }
  }
}

export function validateDocumentSnapshot(
  input: z.infer<typeof inventoryDocumentSnapshotSchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (Object.keys(input.objectIdentity).length === 0) {
    reportIssue("Document snapshot must preserve object identity at document time.", ["objectIdentity"]);
  }
  if (!input.capturedAt) {
    reportIssue("Document snapshot requires captured_at timestamp.", ["capturedAt"]);
  }
  const hasLabel = Boolean(input.productLabel || input.lotLabel || input.serialLabel || input.handlingUnitLabel);
  if (!hasLabel) {
    reportIssue("Document snapshot must preserve at least one business label.", ["productLabel"]);
  }
}

export function validateProjectionContract(
  input: z.infer<typeof inventoryCurrentStateProjectionSchema>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.projectionKind === "serial_state" && !input.serialId) {
    reportIssue("Serial state projection requires serial_id.", ["serialId"]);
  }
  if (input.projectionKind === "handling_unit_state" && !input.handlingUnitId) {
    reportIssue("Handling unit state projection requires handling_unit_id.", ["handlingUnitId"]);
  }
  if ((input.projectionKind === "product_quantity" || input.projectionKind === "lot_quantity") && (input.quantity == null || input.quantity < 0)) {
    reportIssue("Quantity projections require non-negative quantity metadata.", ["quantity"]);
  }
  if (input.projectionKind === "availability" && !input.productId && !input.lotId && !input.serialId) {
    reportIssue("Availability projection requires an inventory object anchor.", ["productId"]);
  }
}

export function isProjectionOnlyIdentityField(table: string, column: string) {
  const projectionFields: ReadonlyArray<readonly [string, string]> = [
    ["inventory_serial_numbers", "current_handling_unit_id"],
    ["inventory_serial_numbers", "current_warehouse_id"],
    ["inventory_serial_numbers", "current_location_id"],
    ["inventory_serial_numbers", "current_custodian"],
    ["inventory_handling_units", "warehouse_id"],
    ["inventory_handling_units", "location_id"],
    ["inventory_handling_units", "current_custodian"],
  ];
  return projectionFields.some(([entryTable, entryColumn]) => entryTable === table && entryColumn === column);
}

export {
  INVENTORY_DOCUMENT_LIFECYCLE_STATES,
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_FOUNDATION_DOCUMENT_KINDS,
  INVENTORY_INVENTORY_STATUSES,
  INVENTORY_OBJECT_TYPES,
  INVENTORY_PROJECTION_KINDS,
} from "../types/inventory-documents";
