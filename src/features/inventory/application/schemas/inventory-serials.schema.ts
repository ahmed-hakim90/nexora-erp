import { z } from "zod";

import {
  INVENTORY_SERIAL_GENERATION_METHODS,
  INVENTORY_SERIAL_LIFECYCLE_STATES,
  INVENTORY_SERIAL_POLICY_RESET_SCOPES,
  INVENTORY_SERIAL_RESERVATION_STATUSES,
  INVENTORY_SERIAL_SOURCES,
  INVENTORY_SERIAL_STATUSES,
  INVENTORY_SERIAL_VERIFICATION_STATUSES,
  type InventorySerialLifecycleState,
  type InventorySerialProductPolicy,
  type InventorySerialSource,
  type InventorySerialStatus,
} from "../types/inventory-serials";

const optionalText = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());

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
    trimmed.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const splitAt = [line.indexOf(":"), line.indexOf("=")].filter((position) => position > 0);
      const separator = splitAt.length > 0 ? Math.min(...splitAt) : -1;
      if (separator <= 0) return [`note${index + 1}`, line] as const;
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as const;
    }),
  );
}

export const inventorySerialListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  lifecycleState: z.string().trim().max(64).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  productId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  serialSource: z.string().trim().max(64).optional(),
  serialStatus: z.string().trim().max(64).optional(),
  status: z.string().trim().max(64).optional(),
  verificationStatus: z.string().trim().max(64).optional(),
});

export const inventorySerialMutationSchema = z.object({
  barcode: z.string().trim().min(1),
  branchId: optionalText.optional(),
  currentCustodian: z.preprocess((value) => {
    if (value === "" || value === undefined) return {};
    if (typeof value !== "string") return value;
    return parseAttributeLines(value);
  }, z.record(z.string(), z.unknown()).default({})),
  currentHandlingUnitId: optionalText.optional(),
  currentLocationId: optionalText.optional(),
  currentWarehouseId: optionalText.optional(),
  firstActivationReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  generationMethod: z.enum(INVENTORY_SERIAL_GENERATION_METHODS),
  lifecycleState: z.enum(INVENTORY_SERIAL_LIFECYCLE_STATES),
  lotId: optionalText.optional(),
  notes: optionalText.optional(),
  policyId: optionalText.optional(),
  productId: z.string().trim().min(1),
  productVariantId: optionalText.optional(),
  qrPayload: z.preprocess((value) => {
    if (value === "" || value === undefined) return {};
    if (typeof value !== "string") return value;
    return parseAttributeLines(value);
  }, z.record(z.string(), z.unknown()).default({})),
  serialNumber: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  serialSource: z.enum(INVENTORY_SERIAL_SOURCES),
  serialStatus: z.enum(INVENTORY_SERIAL_STATUSES),
  serviceCaseReference: optionalText.optional(),
  serviceReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  soldDocumentReference: optionalText.optional(),
  sourceMetadata: z.preprocess((value) => {
    if (value === "" || value === undefined) return {};
    if (typeof value !== "string") return value;
    return parseAttributeLines(value);
  }, z.record(z.string(), z.unknown()).default({})),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
  traceabilityReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  verificationStatus: z.enum(INVENTORY_SERIAL_VERIFICATION_STATUSES),
  verificationTokenHash: optionalText.optional(),
  warrantyReady: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
}).superRefine((input, context) => {
  validateSerialSourcePayload(input, (message, path) => {
    context.addIssue({ code: "custom", message, path: [...path] });
  });
});

export const inventorySerialPolicyMutationSchema = z.object({
  allowManualOverride: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  digits: z.coerce.number().int().min(1).max(24),
  duplicateValidation: z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean()),
  generationTiming: z.enum(["on_receipt", "on_production_completion", "on_packing", "manual"]),
  pattern: z.string().trim().min(1),
  policyCode: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  prefix: optionalText.optional(),
  productId: optionalText.optional(),
  resetScope: z.enum(INVENTORY_SERIAL_POLICY_RESET_SCOPES),
  startNumber: z.coerce.number().int().min(1),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]),
}).superRefine((input, context) => {
  if (!validateSerialPolicyPattern(input.pattern)) {
    context.addIssue({ code: "custom", message: "Serial policy pattern must include {NUMBER} and only supported tokens.", path: ["pattern"] });
  }
});

export const inventorySerialSequenceReservationSchema = z.object({
  correlationId: optionalText.optional(),
  currentNumber: z.coerce.number().int().min(0).default(0),
  expiresAt: optionalText.optional(),
  idempotencyKey: z.string().trim().min(1),
  policyId: z.string().trim().min(1),
  reservationStatus: z.enum(INVENTORY_SERIAL_RESERVATION_STATUSES).default("pending"),
  reservedBy: optionalText.optional(),
  reservedFrom: z.coerce.number().int().min(1),
  reservedTo: z.coerce.number().int().min(1),
  sequenceKey: z.string().trim().min(1),
  status: z.enum(["draft", "active", "inactive", "locked", "archived"]).default("active"),
}).superRefine((input, context) => {
  if (input.reservedTo < input.reservedFrom) {
    context.addIssue({ code: "custom", message: "reserved_to must be greater than or equal to reserved_from.", path: ["reservedTo"] });
  }
});

export function productAllowsSerials(policy: InventorySerialProductPolicy) {
  return policy.trackingMode === "serial" || policy.trackingMode === "lot_serial";
}

export function validateSerialAgainstProductPolicy(
  input: Readonly<{
    serialSource: InventorySerialSource;
    lotId?: string | null;
    policyId?: string | null;
    serialNumber: string;
  }>,
  policy: InventorySerialProductPolicy,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (!productAllowsSerials(policy)) {
    reportIssue(`Product "${policy.name}" does not allow serials with tracking policy ${policy.trackingMode}.`, ["productId"]);
    return;
  }

  if (policy.trackingMode === "lot_serial" && !input.lotId) {
    reportIssue("Lot-tracked serial products require a lot reference.", ["lotId"]);
  }

  if (policy.serialSource && input.serialSource !== policy.serialSource && input.serialSource !== "imported") {
    reportIssue(`Serial source must match product serial policy (${policy.serialSource}).`, ["serialSource"]);
  }

  if (!policy.serialAllowManualOverride && input.serialSource === "manual") {
    reportIssue("Manual serial entry is not allowed by product serial policy.", ["serialSource"]);
  }
}

export function validateSerialSourcePayload(
  input: Readonly<{
    serialSource: InventorySerialSource;
    sourceMetadata?: Readonly<Record<string, unknown>>;
  }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.serialSource === "supplier" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Supplier serials require supplier metadata.", ["sourceMetadata"]);
  }
  if (input.serialSource === "imported" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Imported serials require import batch metadata.", ["sourceMetadata"]);
  }
  if (input.serialSource === "manual" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Manual serials require audit metadata.", ["sourceMetadata"]);
  }
  if (input.serialSource === "nexora_generated" && Object.keys(input.sourceMetadata ?? {}).length === 0) {
    reportIssue("Nexora-generated serials require future policy/range metadata.", ["sourceMetadata"]);
  }
}

export function validateSerialPolicyPattern(pattern: string) {
  if (!pattern.includes("{NUMBER}")) return false;
  const tokenPattern = /\{(PREFIX|COMPANY|BRANCH|PRODUCT|LOT|YEAR|MONTH|NUMBER)\}/gu;
  const stripped = pattern.replace(tokenPattern, "");
  return !/[{}]/.test(stripped);
}

export function validateSerialLifecycleStatus(
  input: Readonly<{ lifecycleState: InventorySerialLifecycleState; serialStatus: InventorySerialStatus }>,
  reportIssue: (message: string, path: readonly (string | number)[]) => void,
) {
  if (input.lifecycleState === "revoked" && input.serialStatus !== "archived" && input.serialStatus !== "blocked") {
    reportIssue("Revoked lifecycle requires blocked or archived serial status.", ["serialStatus"]);
  }
  if (input.serialStatus === "counterfeit_suspected" && input.lifecycleState !== "revoked") {
    reportIssue("Counterfeit suspected status should use revoked lifecycle.", ["lifecycleState"]);
  }
}

const sourceLabels: Record<InventorySerialSource, string> = {
  imported: "Imported",
  manual: "Manual",
  nexora_generated: "Nexora Generated",
  supplier: "Supplier",
};

function formatLifecycleLabel(lifecycleState?: InventorySerialLifecycleState) {
  if (lifecycleState === "available") return "Available";
  if (!lifecycleState) return "Draft";
  return lifecycleState.charAt(0).toUpperCase() + lifecycleState.slice(1).replaceAll("_", " ");
}

export function formatSerialLabel(input: Readonly<{
  serialNumber: string;
  productName: string;
  lotNumber?: string | null;
  lifecycleState?: InventorySerialLifecycleState;
  serialSource?: InventorySerialSource;
}>) {
  const lifecycleLabel = formatLifecycleLabel(input.lifecycleState);
  const sourceLabel = input.serialSource ? sourceLabels[input.serialSource] : undefined;
  if (input.lotNumber) {
    return `${input.serialNumber} — ${input.productName} — ${input.lotNumber} — ${lifecycleLabel}`;
  }
  if (sourceLabel) {
    return `${input.serialNumber} — ${input.productName} — ${sourceLabel} — ${lifecycleLabel}`;
  }
  return `${input.serialNumber} — ${input.productName} — ${lifecycleLabel}`;
}

export function isSerialCurrentlyInHandlingUnit(input: Readonly<{ currentHandlingUnitId?: string | null }>) {
  return Boolean(input.currentHandlingUnitId);
}

export function assertSerialHandlingUnitReadiness(
  input: Readonly<{ currentHandlingUnitId?: string | null; traceabilityReady: boolean }>,
) {
  return input.traceabilityReady || !input.currentHandlingUnitId;
}

export function assertSerialWarrantyServiceReadiness(input: Readonly<{
  firstActivationReady: boolean;
  serviceCaseReference?: string | null;
  serviceReady: boolean;
  soldDocumentReference?: string | null;
  warrantyReady: boolean;
}>) {
  if (input.warrantyReady && !input.firstActivationReady && !input.soldDocumentReference) return false;
  if (input.serviceCaseReference && !input.serviceReady) return false;
  if (input.soldDocumentReference && !input.warrantyReady) return false;
  return true;
}

export {
  INVENTORY_SERIAL_GENERATION_METHODS,
  INVENTORY_SERIAL_LIFECYCLE_STATES,
  INVENTORY_SERIAL_POLICY_PATTERN_TOKENS,
  INVENTORY_SERIAL_POLICY_RESET_SCOPES,
  INVENTORY_SERIAL_RESERVATION_STATUSES,
  INVENTORY_SERIAL_SOURCES,
  INVENTORY_SERIAL_STATUSES,
  INVENTORY_SERIAL_VERIFICATION_STATUSES,
} from "../types/inventory-serials";
