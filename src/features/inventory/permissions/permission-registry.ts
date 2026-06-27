import { definePermissionKey } from "@/platform/permissions/public-api";

export const INVENTORY_PERMISSIONS = {
  eventsView: definePermissionKey("inventory.events.view"),
  eventsManage: definePermissionKey("inventory.events.manage"),
  integrationView: definePermissionKey("inventory.integration.view"),
  integrationManage: definePermissionKey("inventory.integration.manage"),
  stockView: definePermissionKey("inventory.stock.view"),
  stockPost: definePermissionKey("inventory.stock.post"),
  stockReverse: definePermissionKey("inventory.stock.reverse"),
  stockSnapshot: definePermissionKey("inventory.stock.snapshot"),
  stockManageRules: definePermissionKey("inventory.stock.manage_rules"),
  transactionView: definePermissionKey("inventory.transaction.view"),
  transactionCreate: definePermissionKey("inventory.transaction.create"),
  transactionUpdate: definePermissionKey("inventory.transaction.update"),
  transactionSubmit: definePermissionKey("inventory.transaction.submit"),
  transactionPost: definePermissionKey("inventory.transaction.post"),
  transactionCancel: definePermissionKey("inventory.transaction.cancel"),
  transactionReverse: definePermissionKey("inventory.transaction.reverse"),
  cycleCountView: definePermissionKey("inventory.cycle_count.view"),
  cycleCountManage: definePermissionKey("inventory.cycle_count.manage"),
  cycleCountPost: definePermissionKey("inventory.cycle_count.post"),
} as const;

export const INVENTORY_PERMISSION_LIST = Object.values(INVENTORY_PERMISSIONS);
