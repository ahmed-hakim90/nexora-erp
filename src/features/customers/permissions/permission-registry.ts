import { definePermissionKey } from "@/platform/permissions/public-api";

export const CUSTOMERS_PERMISSIONS = {
  read: definePermissionKey("master-data.customers.read"),
  create: definePermissionKey("master-data.customers.create"),
  update: definePermissionKey("master-data.customers.update"),
  delete: definePermissionKey("master-data.customers.delete"),
} as const;

export const CUSTOMERS_PERMISSION_LIST = Object.values(CUSTOMERS_PERMISSIONS);
