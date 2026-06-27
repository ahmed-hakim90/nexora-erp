import { definePermissionKey } from "@/platform/permissions/public-api";

export const TAXPROFILES_PERMISSIONS = {
  read: definePermissionKey("master-data.tax-profiles.read"),
  create: definePermissionKey("master-data.tax-profiles.create"),
  update: definePermissionKey("master-data.tax-profiles.update"),
  delete: definePermissionKey("master-data.tax-profiles.delete"),
} as const;

export const TAXPROFILES_PERMISSION_LIST = Object.values(TAXPROFILES_PERMISSIONS);
