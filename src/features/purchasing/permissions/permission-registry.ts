import { definePermissionKey } from "@/platform/permissions/public-api";

export const PURCHASING_PERMISSIONS = {
  cancel: definePermissionKey("purchasing.cancel"),
  orderApprove: definePermissionKey("purchasing.order.approve"),
  orderConfirm: definePermissionKey("purchasing.order.confirm"),
  orderCreate: definePermissionKey("purchasing.order.create"),
  receiptCreate: definePermissionKey("purchasing.receipt.create"),
  receiptPost: definePermissionKey("purchasing.receipt.post"),
  requestApprove: definePermissionKey("purchasing.request.approve"),
  requestCreate: definePermissionKey("purchasing.request.create"),
  rfqManage: definePermissionKey("purchasing.rfq.manage"),
  view: definePermissionKey("purchasing.view"),
} as const;

export const PURCHASING_PERMISSION_LIST = Object.values(PURCHASING_PERMISSIONS);
