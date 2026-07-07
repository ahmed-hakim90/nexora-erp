import { z } from "zod";

import { INVENTORY_INVENTORY_STATUSES, INVENTORY_PROJECTION_KINDS } from "../types/inventory-documents";
import { INVENTORY_PROJECTION_REBUILD_STATUSES } from "../types/inventory-projection";

export const inventoryProjectionRuntimeStateSchema = z.object({
  lastProcessedLedgerEntryId: z.string().trim().min(1).nullable(),
  lastProcessedPostingTimestamp: z.string().trim().min(1).nullable(),
  projectionVersion: z.coerce.number().int().positive(),
  rebuildCompletedAt: z.string().trim().min(1).nullable(),
  rebuildMetadata: z.record(z.string(), z.unknown()).default({}),
  rebuildStartedAt: z.string().trim().min(1).nullable(),
  rebuildStatus: z.enum(INVENTORY_PROJECTION_REBUILD_STATUSES),
});

export const inventoryProjectionReadQuerySchema = z.object({
  handlingUnitId: z.string().trim().optional(),
  inventoryStatus: z.enum(INVENTORY_INVENTORY_STATUSES).optional(),
  locationId: z.string().trim().optional(),
  lotId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  serialId: z.string().trim().optional(),
  variantId: z.string().trim().optional(),
  warehouseId: z.string().trim().optional(),
});

export function validateProjectionEngineWriteBoundary(
  writeSetting: string | null | undefined,
  reportIssue: (message: string) => void,
) {
  if (writeSetting !== "true") {
    reportIssue("Inventory projections may only be written when app.inventory_projection_service is true.");
  }
}

export function validateProjectionReadOnlyApi(surface: "read" | "write", reportIssue: (message: string) => void) {
  if (surface === "write") {
    reportIssue("Inventory projection read APIs are read-only and must not mutate stock.");
  }
}

export {
  INVENTORY_PROJECTION_REBUILD_STATUSES,
  INVENTORY_PROJECTION_SHELL_STATUS_MAP,
} from "../types/inventory-projection";

export { INVENTORY_PROJECTION_KINDS };
