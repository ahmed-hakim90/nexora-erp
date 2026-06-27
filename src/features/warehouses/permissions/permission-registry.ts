import { definePermissionKey } from "@/platform/permissions/public-api";

export const WAREHOUSES_PERMISSIONS = {
  read: definePermissionKey("master-data.warehouses.read"),
  create: definePermissionKey("master-data.warehouses.create"),
  update: definePermissionKey("master-data.warehouses.update"),
  delete: definePermissionKey("master-data.warehouses.delete"),
} as const;

export const WAREHOUSES_PERMISSION_LIST = Object.values(WAREHOUSES_PERMISSIONS);
