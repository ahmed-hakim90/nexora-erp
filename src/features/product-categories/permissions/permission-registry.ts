import { definePermissionKey } from "@/platform/permissions/public-api";

export const PRODUCTCATEGORIES_PERMISSIONS = {
  read: definePermissionKey("master-data.product-categories.read"),
  create: definePermissionKey("master-data.product-categories.create"),
  update: definePermissionKey("master-data.product-categories.update"),
  delete: definePermissionKey("master-data.product-categories.delete"),
} as const;

export const PRODUCTCATEGORIES_PERMISSION_LIST = Object.values(PRODUCTCATEGORIES_PERMISSIONS);
