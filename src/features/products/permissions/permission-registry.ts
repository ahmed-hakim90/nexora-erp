import { definePermissionKey } from "@/platform/permissions/public-api";

export const PRODUCTS_PERMISSIONS = {
  read: definePermissionKey("master-data.products.read"),
  create: definePermissionKey("master-data.products.create"),
  update: definePermissionKey("master-data.products.update"),
  delete: definePermissionKey("master-data.products.delete"),
} as const;

export const PRODUCTS_PERMISSION_LIST = Object.values(PRODUCTS_PERMISSIONS);
