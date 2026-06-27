import { definePermissionKey } from "@/platform/permissions/public-api";

export const WAREHOUSELOCATIONS_PERMISSIONS = {
  read: definePermissionKey("master-data.warehouse-locations.read"),
  create: definePermissionKey("master-data.warehouse-locations.create"),
  update: definePermissionKey("master-data.warehouse-locations.update"),
  delete: definePermissionKey("master-data.warehouse-locations.delete"),
} as const;

export const WAREHOUSELOCATIONS_PERMISSION_LIST = Object.values(WAREHOUSELOCATIONS_PERMISSIONS);
