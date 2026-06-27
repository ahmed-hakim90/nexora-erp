import { definePermissionKey } from "@/platform/permissions/public-api";

export const MANUFACTURING_PERMISSIONS = {
  assignmentsManage: definePermissionKey("manufacturing.assignments.manage"),
  bomManage: definePermissionKey("manufacturing.bom.manage"),
  bomView: definePermissionKey("manufacturing.bom.view"),
  linesManage: definePermissionKey("manufacturing.lines.manage"),
  linesView: definePermissionKey("manufacturing.lines.view"),
  manage: definePermissionKey("manufacturing.manage"),
  routingManage: definePermissionKey("manufacturing.routing.manage"),
  routingView: definePermissionKey("manufacturing.routing.view"),
  targetsManage: definePermissionKey("manufacturing.targets.manage"),
  view: definePermissionKey("manufacturing.view"),
  workCentersManage: definePermissionKey("manufacturing.work_centers.manage"),
  workCentersView: definePermissionKey("manufacturing.work_centers.view"),
  workersManage: definePermissionKey("manufacturing.workers.manage"),
  workersView: definePermissionKey("manufacturing.workers.view"),
} as const;

export const MANUFACTURING_PERMISSION_LIST = Object.values(MANUFACTURING_PERMISSIONS);
