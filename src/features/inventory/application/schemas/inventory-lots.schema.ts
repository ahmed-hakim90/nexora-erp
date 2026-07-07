import { z } from "zod";

import {
  INVENTORY_LOT_LIFECYCLE_STATES,
  INVENTORY_LOT_QC_STATUSES,
  INVENTORY_LOT_SOURCE_TYPES,
  type InventoryLotLifecycleState,
  type InventoryLotProductPolicy,
  type InventoryLotQcStatus,
  type InventoryLotSourceType,
} from "../types/inventory-lots";

const optionalText = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());
const optionalDate = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable());

function parseAttributeLines(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return { note: trimmed };
    }
  }
  return Object.fromEntries(
    trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const separatorIndex = [line.indexOf(":"), line.indexOf("=")].filter((position) => position > 0);
        const splitAt = separatorIndex.length > 0 ? Math.min(...separatorIndex) : -1;
        if (splitAt <= 0) return [`note${index + 1}`, line] as const;
        return [line.slice(0, splitAt).trim(), line.slice(splitAt + 1).trim()] as const;
      }),
  );
}

export const inventoryLotListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  lifecycleState: z.string().trim().max(64).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  productId: z.string().trim().optional(),
  qcStatus: z.string().trim().max(64).optional(),
  search: z.string().trim().max(120).optional(),
  sourceType: z.string().trim().max(64).optional(),
  status: z.string().trim().max(64).optional(),
});

export const inventoryLotMutationSchema = z.object({
  barcode: z.string().trim().min(1),
  branchId: optionalText.optional(),
  expiryDate: optionalDate,
  lifecycleState: z.enum(INVENTORY_LOT_LIFECYCLE_STATES),
  lotNumber: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  manufacturingDate: optionalDate,
  notes: optionalText.optional(),
  productId: z.string().trim().min(1),
  productVariantId: optionalText.optional(),
  qrPayload: z.preprocess((value) => {
    if (value === "" || value === undefined) return {};
    if (typeof value !== "string") return value;
    return parseAttributeLines(value);
  }, z.record(z.string(), z.unknown()).default({})),
  receivedDate: optionalDate,
  qcStatus: z.enum(INVENTORY_LOT_QC_STATUSES),
  sourceMetadata: z.preprocess((value) => {
    if (value === "" || value === undefined) return {};
    if (typeof value !== "string") return value;
    return parseAttributeLines(value);
  }, z.record(z.string(), z.unknown()).default({})),
  sourceReferenceId: optionalText.optional(),
  sourceReferenceType: optionalText.optional(),
  sourceType: z.enum(INVENTORY_LOT_SOURCE_TYPES),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
  supplierLotNumber: optionalText.optional(),
  supplierPartyId: optionalText.optional(),
  traceabilityReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
}).superRefine((input, context) => {
  validateLotSourcePayload(input, (message, path) => {
    context.addIssue({ code: "custom", message, path: [...path] });
  });
  validateLotLifecycleMetadata(input, (message, path) => {
    context.addIssue({ code: "custom", message, path: [...path] });
  });
});

export function productAllowsLots(policy: InventoryLotProductPolicy) {
  return policy.trackingMode === "lot" || policy.trackingMode === "lot_serial";
}

export function validateLotAgainstProductPolicy(
  input: Readonly<{
    sourceType: InventoryLotSourceType;
    supplierPartyId?: string | null;
    supplierLotNumber?: string | null;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
    qcStatus: InventoryLotQcStatus;
    lifecycleState: InventoryLotLifecycleState;
  }>,
  policy: InventoryLotProductPolicy,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (!productAllowsLots(policy)) {
    reportIssue(`Product "${policy.name}" does not allow lots with tracking policy ${policy.trackingMode}.`, ["productId"]);
    return;
  }

  if (input.sourceType === "supplier" && policy.lotSupplierSupported === false) {
    reportIssue("Supplier lots are not enabled on the product lot policy.", ["sourceType"]);
  }
  if (input.sourceType === "internal" && policy.lotInternalSupported === false) {
    reportIssue("Internal lots are not enabled on the product lot policy.", ["sourceType"]);
  }
  if (input.expiryDate && policy.lotExpirySupported === false) {
    reportIssue("Expiry dates are not enabled on the product lot policy.", ["expiryDate"]);
  }
  if (input.manufacturingDate && policy.lotManufacturingDateSupported === false) {
    reportIssue("Manufacturing dates are not enabled on the product lot policy.", ["manufacturingDate"]);
  }
  if (policy.lotQcRequired && input.qcStatus === "not_required") {
    reportIssue("Product lot policy requires QC metadata.", ["qcStatus"]);
  }
}

export function validateLotSourcePayload(
  input: Readonly<{
    sourceType: InventoryLotSourceType;
    sourceReferenceType?: string | null;
    sourceReferenceId?: string | null;
    supplierPartyId?: string | null;
    supplierLotNumber?: string | null;
    sourceMetadata?: Readonly<Record<string, unknown>>;
  }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.sourceType === "supplier" && !input.supplierPartyId && !input.supplierLotNumber) {
    reportIssue("Supplier lots require supplier party or supplier lot number metadata.", ["supplierPartyId"]);
  }
  if (input.sourceType === "manufacturing" && input.sourceReferenceType && !input.sourceReferenceId) {
    reportIssue("Manufacturing source references require a reference id when type is provided.", ["sourceReferenceId"]);
  }
  if (input.sourceType === "repack" && (!input.sourceReferenceType || !input.sourceReferenceId)) {
    reportIssue("Repack lots require a source reference to a previous lot or handling unit.", ["sourceReferenceType"]);
  }
  if (input.sourceType === "return" && !input.sourceReferenceType) {
    reportIssue("Return lots require a future return document reference type.", ["sourceReferenceType"]);
  }
  if (input.sourceType === "adjustment" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Adjustment lots require reason metadata.", ["sourceMetadata"]);
  }
  if (input.sourceType === "import" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Import lots require import batch metadata.", ["sourceMetadata"]);
  }
}

export function validateLotLifecycleMetadata(
  input: Readonly<{
    lifecycleState: InventoryLotLifecycleState;
    qcStatus: InventoryLotQcStatus;
    expiryDate?: string | null;
  }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.lifecycleState === "qc_pending" && input.qcStatus === "not_required") {
    reportIssue("QC pending lifecycle requires QC metadata.", ["qcStatus"]);
  }
  if (input.lifecycleState === "qc_hold" && !["hold", "failed", "pending"].includes(input.qcStatus)) {
    reportIssue("QC hold lifecycle requires hold or failed QC metadata.", ["qcStatus"]);
  }
  if (input.lifecycleState === "released" && !["passed", "released", "not_required"].includes(input.qcStatus)) {
    reportIssue("Released lifecycle requires passed or released QC metadata.", ["qcStatus"]);
  }
  if (input.lifecycleState === "expired" && !input.expiryDate) {
    reportIssue("Expired lifecycle requires an expiry date.", ["expiryDate"]);
  }
}

export function isLotIssueBlocked(input: Readonly<{ lifecycleState: InventoryLotLifecycleState; qcStatus: InventoryLotQcStatus }>) {
  return input.lifecycleState === "blocked"
    || input.lifecycleState === "qc_hold"
    || input.qcStatus === "failed"
    || input.qcStatus === "hold";
}

const sourceTypeLabels: Record<InventoryLotSourceType, string> = {
  adjustment: "Adjustment",
  import: "Import",
  internal: "Internal",
  manufacturing: "Manufacturing",
  repack: "Repack",
  return: "Return",
  supplier: "Supplier",
};

const qcStatusLabels: Record<InventoryLotQcStatus, string> = {
  failed: "QC Failed",
  hold: "QC Hold",
  not_required: "QC Not Required",
  passed: "QC Passed",
  pending: "QC Pending",
  released: "QC Released",
};

export function formatLotLabel(input: Readonly<{
  lotNumber: string;
  productName: string;
  sourceType: InventoryLotSourceType;
  qcStatus?: InventoryLotQcStatus;
  lifecycleState?: InventoryLotLifecycleState;
}>) {
  const qcLabel = input.qcStatus ? qcStatusLabels[input.qcStatus] : undefined;
  const lifecycleLabel = input.lifecycleState === "released" ? "Released" : qcLabel;
  return `${input.lotNumber} — ${input.productName} — ${sourceTypeLabels[input.sourceType]} — ${lifecycleLabel ?? "Draft"}`;
}

export const INVENTORY_LOT_TRACEABILITY_CHANNELS = [
  "supplier_receipt",
  "production_order",
  "qc",
  "handling_units",
  "serials",
  "shipments",
  "customers",
  "service_cases",
  "recalls",
] as const;

export {
  INVENTORY_LOT_LIFECYCLE_STATES,
  INVENTORY_LOT_QC_STATUSES,
  INVENTORY_LOT_SOURCE_TYPES,
} from "../types/inventory-lots";
