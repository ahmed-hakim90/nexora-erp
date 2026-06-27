import { definePermissionKey } from "@/platform/permissions/public-api";

export const PRICELISTS_PERMISSIONS = {
  read: definePermissionKey("master-data.price-lists.read"),
  create: definePermissionKey("master-data.price-lists.create"),
  update: definePermissionKey("master-data.price-lists.update"),
  delete: definePermissionKey("master-data.price-lists.delete"),
} as const;

export const PRICELISTS_PERMISSION_LIST = Object.values(PRICELISTS_PERMISSIONS);
