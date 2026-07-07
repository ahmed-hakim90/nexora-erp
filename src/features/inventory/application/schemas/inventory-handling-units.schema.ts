import { z } from "zod";

export const INVENTORY_HANDLING_UNIT_STATUSES = [
  "empty",
  "packed",
  "partial",
  "opened",
  "closed",
  "reserved",
  "picked",
  "shipped",
  "returned",
  "damaged",
  "scrapped",
  "archived",
] as const;

export const INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES = [
  "draft",
  "active",
  "sealed",
  "opened",
  "closed",
  "split_ready",
  "merge_ready",
  "repack_ready",
  "traceable",
  "archived",
] as const;

export const INVENTORY_HANDLING_UNIT_CONTENT_TYPES = [
  "product_quantity",
  "lot_quantity",
  "serial_reference",
  "child_handling_unit",
] as const;

export type InventoryHandlingUnitStatus = (typeof INVENTORY_HANDLING_UNIT_STATUSES)[number];
export type InventoryHandlingUnitLifecycleState = (typeof INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES)[number];
export type InventoryHandlingUnitContentType = (typeof INVENTORY_HANDLING_UNIT_CONTENT_TYPES)[number];

const handlingUnitStatusSchema = z.enum(INVENTORY_HANDLING_UNIT_STATUSES);
const handlingUnitLifecycleSchema = z.enum(INVENTORY_HANDLING_UNIT_LIFECYCLE_STATES);
const handlingUnitContentTypeSchema = z.enum(INVENTORY_HANDLING_UNIT_CONTENT_TYPES);

export const inventoryHandlingUnitTypeMutationSchema = z.object({
  typeKey: z.string().trim().min(1).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1),
  description: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  level: z.coerce.number().int().min(0),
  parentAllowed: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  childAllowed: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  defaultCapacity: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().min(0).nullable()),
  weightCapacity: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().min(0).nullable()),
  dimensionMetadata: z.record(z.string(), z.unknown()).default({}),
  reusable: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
});

export const inventoryHandlingUnitMutationSchema = z.object({
  huTypeId: z.string().trim().min(1),
  warehouseId: z.string().trim().min(1),
  locationId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  parentHuId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  lotId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  productId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  huNumber: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  huStatus: handlingUnitStatusSchema,
  lifecycleState: handlingUnitLifecycleSchema,
  barcode: z.string().trim().min(1),
  qrPayload: z.record(z.string(), z.unknown()).default({}),
  grossWeight: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().min(0).nullable()),
  netWeight: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().min(0).nullable()),
  dimensionsMetadata: z.record(z.string(), z.unknown()).default({}),
  sealedAt: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  openedAt: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  closedAt: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  currentCustodian: z.record(z.string(), z.unknown()).default({}),
  splitReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  mergeReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  repackReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  traceabilityReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
}).superRefine((input, context) => {
  validateHandlingUnitOpenClosedMetadata(input, (message, path) => {
    context.addIssue({ code: "custom", message, path: [...path] as (string | number)[] });
  });
});

export const inventoryHandlingUnitContentMutationSchema = z.object({
  handlingUnitId: z.string().trim().min(1),
  contentType: handlingUnitContentTypeSchema,
  productId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  lotId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  serialId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  childHuId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  quantity: z.coerce.number().min(0),
  uomId: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
  removedAt: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable()),
  reasonMetadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((input, context) => {
  validateHandlingUnitContentPayload(input, (message, path) => {
    context.addIssue({ code: "custom", message, path: [...path] as (string | number)[] });
  });
});

export function validateHandlingUnitOpenClosedMetadata(
  input: Readonly<{
    huStatus: InventoryHandlingUnitStatus;
    lifecycleState: InventoryHandlingUnitLifecycleState;
    openedAt?: string | null;
    closedAt?: string | null;
    sealedAt?: string | null;
  }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.huStatus === "opened" && !input.openedAt) {
    reportIssue("Opened handling units must record opened_at metadata.", ["openedAt"]);
  }
  if (input.huStatus === "closed" && !input.closedAt) {
    reportIssue("Closed handling units must record closed_at metadata.", ["closedAt"]);
  }
  if (input.lifecycleState === "sealed" && !input.sealedAt) {
    reportIssue("Sealed lifecycle state requires sealed_at metadata.", ["sealedAt"]);
  }
  if (input.lifecycleState === "opened" && !input.openedAt) {
    reportIssue("Opened lifecycle state requires opened_at metadata.", ["openedAt"]);
  }
  if (input.lifecycleState === "closed" && !input.closedAt) {
    reportIssue("Closed lifecycle state requires closed_at metadata.", ["closedAt"]);
  }
}

export function validateHandlingUnitContentPayload(
  input: Readonly<{
    contentType: InventoryHandlingUnitContentType;
    productId?: string | null;
    lotId?: string | null;
    serialId?: string | null;
    childHuId?: string | null;
    quantity: number;
    handlingUnitId?: string;
  }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.contentType === "product_quantity") {
    if (!input.productId) reportIssue("Product quantity content requires a product.", ["productId"]);
    if (input.quantity <= 0) reportIssue("Product quantity content requires a positive quantity.", ["quantity"]);
    if (input.lotId || input.serialId || input.childHuId) reportIssue("Product quantity content cannot reference lot, serial, or child handling unit.", ["contentType"]);
  }

  if (input.contentType === "lot_quantity") {
    if (!input.lotId) reportIssue("Lot quantity content requires a lot.", ["lotId"]);
    if (input.quantity <= 0) reportIssue("Lot quantity content requires a positive quantity.", ["quantity"]);
    if (input.productId || input.serialId || input.childHuId) reportIssue("Lot quantity content cannot reference product, serial, or child handling unit.", ["contentType"]);
  }

  if (input.contentType === "serial_reference") {
    if (!input.serialId) reportIssue("Serial reference content requires a serial.", ["serialId"]);
    if (input.quantity !== 1) reportIssue("Serial reference content quantity must be exactly 1.", ["quantity"]);
    if (input.productId || input.lotId || input.childHuId) reportIssue("Serial reference content cannot reference product, lot, or child handling unit.", ["contentType"]);
  }

  if (input.contentType === "child_handling_unit") {
    if (!input.childHuId) reportIssue("Child handling unit content requires a child handling unit.", ["childHuId"]);
    if (input.quantity !== 1) reportIssue("Child handling unit content quantity must be exactly 1.", ["quantity"]);
    if (input.handlingUnitId && input.childHuId === input.handlingUnitId) {
      reportIssue("A handling unit cannot contain itself.", ["childHuId"]);
    }
    if (input.productId || input.lotId || input.serialId) {
      reportIssue("Child handling unit content cannot reference product, lot, or serial.", ["contentType"]);
    }
  }
}

export function isCurrentHandlingUnitContent(content: Readonly<{ removedAt?: string | null }>) {
  return content.removedAt === null || content.removedAt === undefined || content.removedAt === "";
}

export function formatHandlingUnitLabel(input: Readonly<{
  huNumber: string;
  typeName: string;
  huStatus: InventoryHandlingUnitStatus;
  locationLabel?: string | null;
  childCount?: number | null;
}>) {
  const statusLabel = input.huStatus.charAt(0).toUpperCase() + input.huStatus.slice(1);
  if (typeof input.childCount === "number") {
    return `${input.huNumber} — ${input.typeName} — ${input.childCount} cartons`;
  }
  const locationSuffix = input.locationLabel ? ` — ${input.locationLabel}` : "";
  return `${input.huNumber} — ${input.typeName} — ${statusLabel}${locationSuffix}`;
}

export function assertSerialCurrentUniqueness(
  contents: readonly Readonly<{ contentType: InventoryHandlingUnitContentType; serialId?: string | null; removedAt?: string | null }>[],
) {
  const seen = new Set<string>();
  for (const row of contents) {
    if (row.contentType !== "serial_reference" || !row.serialId || !isCurrentHandlingUnitContent(row)) continue;
    if (seen.has(row.serialId)) return false;
    seen.add(row.serialId);
  }
  return true;
}

export function assertChildHuCurrentUniqueness(
  contents: readonly Readonly<{ contentType: InventoryHandlingUnitContentType; childHuId?: string | null; removedAt?: string | null }>[],
) {
  const seen = new Set<string>();
  for (const row of contents) {
    if (row.contentType !== "child_handling_unit" || !row.childHuId || !isCurrentHandlingUnitContent(row)) continue;
    if (seen.has(row.childHuId)) return false;
    seen.add(row.childHuId);
  }
  return true;
}
