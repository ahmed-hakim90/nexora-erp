import { definePermissionKey } from "@/platform/permissions/public-api";

export const BRANDS_PERMISSIONS = {
  read: definePermissionKey("master-data.brands.read"),
  create: definePermissionKey("master-data.brands.create"),
  update: definePermissionKey("master-data.brands.update"),
  delete: definePermissionKey("master-data.brands.delete"),
} as const;

export const BRANDS_PERMISSION_LIST = Object.values(BRANDS_PERMISSIONS);
