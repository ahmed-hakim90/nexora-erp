import { z } from "zod";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "../foundation-entities";

export const inventoryFoundationListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(64).optional(),
});

const optionalText = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);

function parseTagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n|,/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAttributeLines(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return { note1: trimmed };
    }
  }

  return Object.fromEntries(
    trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const separatorCandidates = [line.indexOf(":"), line.indexOf("=")].filter((position) => position > 0);
        const separatorIndex = separatorCandidates.length > 0 ? Math.min(...separatorCandidates) : -1;
        if (separatorIndex <= 0) return [`note${index + 1}`, line] as const;
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()] as const;
      })
      .filter(([key]) => key.length > 0),
  );
}

function fieldSchema(field: InventoryFoundationField): z.ZodTypeAny {
  if (field.type === "checkbox") {
    return z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean());
  }

  if (field.type === "number") {
    let schema = z.coerce.number();
    if (field.min !== undefined) schema = schema.min(field.min);
    return field.required ? schema : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }

  if (field.type === "select" && field.options) {
    const values = field.options.map((option) => option.value);
    const schema = z.enum(values as [string, ...string[]]);
    return field.required ? schema : z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
  }

  if (field.type === "date") {
    const schema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected a YYYY-MM-DD date.");
    return field.required ? schema : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }

  if (field.type === "json") {
    return z.preprocess((value) => {
      if (value === "" || value === undefined) return {};
      if (typeof value !== "string") return value;
      return parseAttributeLines(value);
    }, z.record(z.string(), z.unknown()));
  }

  if (field.type === "tags") {
    return z.preprocess(parseTagList, z.array(z.string().trim().min(1)).default([]));
  }

  return field.required ? requiredText : optionalText.optional();
}

export function buildInventoryFoundationMutationSchema(descriptor: InventoryFoundationDescriptor) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of descriptor.fields) {
    shape[field.name] = fieldSchema(field);
  }

  return z.object(shape).superRefine((input, context) => {
    if (descriptor.key === "lots") {
      const receivedDate = typeof input.receivedDate === "string" ? input.receivedDate : "";
      const expiryDate = typeof input.expiryDate === "string" ? input.expiryDate : "";
      if (receivedDate && expiryDate && expiryDate < receivedDate) {
        context.addIssue({ code: "custom", message: "Expiry date must be on or after received date.", path: ["expiryDate"] });
      }
      const barcode = typeof input.barcode === "string" ? input.barcode.trim() : "";
      if (!barcode) {
        context.addIssue({ code: "custom", message: "Barcode readiness requires a lot barcode.", path: ["barcode"] });
      }
    }

    if (descriptor.key === "reorder-rules") {
      const minimum = typeof input.minimumQuantity === "number" ? input.minimumQuantity : null;
      const maximum = typeof input.maximumQuantity === "number" ? input.maximumQuantity : null;
      if (minimum !== null && maximum !== null && maximum < minimum) {
        context.addIssue({ code: "custom", message: "Maximum quantity must be greater than or equal to minimum quantity.", path: ["maximumQuantity"] });
      }
    }

    if (descriptor.key === "locations") {
      const locationKind = String(input.locationKind ?? "");
      const barcode = typeof input.barcode === "string" ? input.barcode.trim() : "";
      if (!barcode) {
        context.addIssue({ code: "custom", message: "Barcode readiness requires a location barcode.", path: ["barcode"] });
      }

      if (locationKind === "receiving" && input.receivable !== true) {
        context.addIssue({ code: "custom", message: "Receiving locations must be receivable.", path: ["receivable"] });
      }
      if (locationKind === "shipping" && input.shippable !== true) {
        context.addIssue({ code: "custom", message: "Shipping locations must be shippable.", path: ["shippable"] });
      }
      if (locationKind === "qc_hold" && input.qcRequired !== true) {
        context.addIssue({ code: "custom", message: "QC hold locations must require QC.", path: ["qcRequired"] });
      }
    }

    if (descriptor.key === "handling-unit-types") {
      const level = typeof input.level === "number" ? input.level : Number(input.level);
      if (!Number.isFinite(level) || level < 0) {
        context.addIssue({ code: "custom", message: "Handling unit type level must be zero or greater.", path: ["level"] });
      }
    }

    if (descriptor.key === "handling-units") {
      const barcode = typeof input.barcode === "string" ? input.barcode.trim() : "";
      if (!barcode) {
        context.addIssue({ code: "custom", message: "Barcode readiness requires a handling unit barcode.", path: ["barcode"] });
      }

      const huStatus = String(input.huStatus ?? "");
      const lifecycleState = String(input.lifecycleState ?? "");
      const openedAt = typeof input.openedAt === "string" ? input.openedAt.trim() : "";
      const closedAt = typeof input.closedAt === "string" ? input.closedAt.trim() : "";
      const sealedAt = typeof input.sealedAt === "string" ? input.sealedAt.trim() : "";

      if (huStatus === "opened" && !openedAt) {
        context.addIssue({ code: "custom", message: "Opened handling units must record opened_at metadata.", path: ["openedAt"] });
      }
      if (huStatus === "closed" && !closedAt) {
        context.addIssue({ code: "custom", message: "Closed handling units must record closed_at metadata.", path: ["closedAt"] });
      }
      if (lifecycleState === "sealed" && !sealedAt) {
        context.addIssue({ code: "custom", message: "Sealed lifecycle state requires sealed_at metadata.", path: ["sealedAt"] });
      }
      if (lifecycleState === "opened" && !openedAt) {
        context.addIssue({ code: "custom", message: "Opened lifecycle state requires opened_at metadata.", path: ["openedAt"] });
      }
      if (lifecycleState === "closed" && !closedAt) {
        context.addIssue({ code: "custom", message: "Closed lifecycle state requires closed_at metadata.", path: ["closedAt"] });
      }
    }

    if (descriptor.key === "handling-unit-contents") {
      const contentType = String(input.contentType ?? "");
      const quantity = typeof input.quantity === "number" ? input.quantity : Number(input.quantity);
      const productId = typeof input.productId === "string" ? input.productId.trim() : "";
      const lotId = typeof input.lotId === "string" ? input.lotId.trim() : "";
      const serialId = typeof input.serialId === "string" ? input.serialId.trim() : "";
      const childHuId = typeof input.childHuId === "string" ? input.childHuId.trim() : "";
      const handlingUnitId = typeof input.handlingUnitId === "string" ? input.handlingUnitId.trim() : "";

      if (contentType === "product_quantity") {
        if (!productId) context.addIssue({ code: "custom", message: "Product quantity content requires a product.", path: ["productId"] });
        if (!Number.isFinite(quantity) || quantity <= 0) context.addIssue({ code: "custom", message: "Product quantity content requires a positive quantity.", path: ["quantity"] });
      }
      if (contentType === "lot_quantity") {
        if (!lotId) context.addIssue({ code: "custom", message: "Lot quantity content requires a lot.", path: ["lotId"] });
        if (!Number.isFinite(quantity) || quantity <= 0) context.addIssue({ code: "custom", message: "Lot quantity content requires a positive quantity.", path: ["quantity"] });
      }
      if (contentType === "serial_reference") {
        if (!serialId) context.addIssue({ code: "custom", message: "Serial reference content requires a serial.", path: ["serialId"] });
        if (quantity !== 1) context.addIssue({ code: "custom", message: "Serial reference content quantity must be exactly 1.", path: ["quantity"] });
      }
      if (contentType === "child_handling_unit") {
        if (!childHuId) context.addIssue({ code: "custom", message: "Child handling unit content requires a child handling unit.", path: ["childHuId"] });
        if (quantity !== 1) context.addIssue({ code: "custom", message: "Child handling unit content quantity must be exactly 1.", path: ["quantity"] });
        if (handlingUnitId && childHuId === handlingUnitId) {
          context.addIssue({ code: "custom", message: "A handling unit cannot contain itself.", path: ["childHuId"] });
        }
      }
    }
  });
}
