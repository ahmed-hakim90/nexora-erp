import { definePermissionKey } from "@/platform/permissions/public-api";

export const BUSINESS_DOCUMENT_PERMISSIONS = {
  view: definePermissionKey("documents.view"),
  create: definePermissionKey("documents.create"),
  update: definePermissionKey("documents.update"),
  changeStatus: definePermissionKey("documents.change_status"),
  comment: definePermissionKey("documents.comment"),
  attach: definePermissionKey("documents.attach"),
  print: definePermissionKey("documents.print"),
  export: definePermissionKey("documents.export"),
  cancel: definePermissionKey("documents.cancel"),
  close: definePermissionKey("documents.close"),
} as const;

export const BUSINESS_DOCUMENT_PERMISSION_LIST = Object.values(BUSINESS_DOCUMENT_PERMISSIONS);
