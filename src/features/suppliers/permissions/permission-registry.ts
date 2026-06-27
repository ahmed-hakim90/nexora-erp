import { definePermissionKey } from "@/platform/permissions/public-api";

export const SUPPLIERS_PERMISSIONS = {
  read: definePermissionKey("master-data.suppliers.read"),
  create: definePermissionKey("master-data.suppliers.create"),
  update: definePermissionKey("master-data.suppliers.update"),
  delete: definePermissionKey("master-data.suppliers.delete"),
} as const;

export const SUPPLIERS_PERMISSION_LIST = Object.values(SUPPLIERS_PERMISSIONS);
