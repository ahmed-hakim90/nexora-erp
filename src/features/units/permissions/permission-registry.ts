import { definePermissionKey } from "@/platform/permissions/public-api";

export const UNITS_PERMISSIONS = {
  read: definePermissionKey("master-data.units.read"),
  create: definePermissionKey("master-data.units.create"),
  update: definePermissionKey("master-data.units.update"),
  delete: definePermissionKey("master-data.units.delete"),
} as const;

export const UNITS_PERMISSION_LIST = Object.values(UNITS_PERMISSIONS);
