"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrAttendanceClosingCreateSchema,
  hrAttendanceExportBatchActionSchema,
  hrAttendanceExportExecuteSchema,
  hrAttendanceExportFilterSchema,
  hrAttendanceLockClosingSchema,
  hrAttendanceReopenSchema,
} from "../../application/schemas/hr-attendance-payroll-export.schema";
import { HrAttendancePayrollExportService } from "../../application/services/hr-attendance-payroll-export.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

const EXPORT_PATHS = ["/erp/hr/attendance-export", "/erp/hr/attendance-processing"] as const;

function revalidateExportPaths() {
  for (const path of EXPORT_PATHS) revalidatePath(path);
}

async function exportService(requiredPermission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: requiredPermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrAttendancePayrollExportService(supabase, context) };
}

export async function createAttendanceClosingAction(formData: FormData) {
  const parsed = hrAttendanceClosingCreateSchema.parse({
    branchId: String(formData.get("branchId") ?? "") || undefined,
    departmentId: String(formData.get("departmentId") ?? "") || undefined,
    payrollGroupId: String(formData.get("payrollGroupId") ?? "") || undefined,
    periodEnd: String(formData.get("periodEnd") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
    scope: String(formData.get("scope") ?? "monthly"),
  });

  const { service } = await exportService(HR_PERMISSIONS.attendanceLock);
  const closing = await service.createClosing(parsed);
  await service.refreshClosingReadiness(closing.id);
  revalidateExportPaths();
}

export async function lockAttendanceClosingAction(formData: FormData) {
  const parsed = hrAttendanceLockClosingSchema.parse({ closingId: String(formData.get("closingId") ?? "") });
  const { service } = await exportService(HR_PERMISSIONS.attendanceLock);
  await service.lockClosing(parsed.closingId);
  revalidateExportPaths();
}

export async function refreshAttendanceClosingAction(formData: FormData) {
  const parsed = hrAttendanceLockClosingSchema.parse({ closingId: String(formData.get("closingId") ?? "") });
  const { service } = await exportService(HR_PERMISSIONS.attendanceLock);
  await service.refreshClosingReadiness(parsed.closingId);
  revalidateExportPaths();
}

export async function previewAttendanceExportAction(formData: FormData) {
  const parsed = hrAttendanceExportFilterSchema.parse({
    branchId: String(formData.get("branchId") ?? "") || undefined,
    departmentId: String(formData.get("departmentId") ?? "") || undefined,
    employeeId: String(formData.get("employeeId") ?? "") || undefined,
    payrollGroupId: String(formData.get("payrollGroupId") ?? "") || undefined,
    periodEnd: String(formData.get("periodEnd") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
  });

  const { service } = await exportService(HR_PERMISSIONS.attendanceExport);
  return service.previewExport(parsed);
}

export async function executeAttendanceExportAction(formData: FormData) {
  const parsed = hrAttendanceExportExecuteSchema.parse({
    branchId: String(formData.get("branchId") ?? "") || undefined,
    closingId: String(formData.get("closingId") ?? "") || undefined,
    confirmed: formData.get("confirmed") === "1",
    departmentId: String(formData.get("departmentId") ?? "") || undefined,
    employeeId: String(formData.get("employeeId") ?? "") || undefined,
    payrollGroupId: String(formData.get("payrollGroupId") ?? "") || undefined,
    periodEnd: String(formData.get("periodEnd") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
  });

  const { service } = await exportService(HR_PERMISSIONS.attendanceExport);
  await service.executeExport(parsed);
  revalidateExportPaths();
}

export async function reopenAttendanceClosingAction(formData: FormData) {
  const parsed = hrAttendanceReopenSchema.parse({
    closingId: String(formData.get("closingId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });

  const { service } = await exportService(HR_PERMISSIONS.attendanceReopen);
  await service.reopenClosing(parsed);
  revalidateExportPaths();
}

export async function cancelAttendanceExportBatchAction(formData: FormData) {
  const parsed = hrAttendanceExportBatchActionSchema.parse({ batchId: String(formData.get("batchId") ?? "") });
  const { service } = await exportService(HR_PERMISSIONS.attendanceExport);
  await service.cancelExportBatch(parsed.batchId);
  revalidateExportPaths();
}

export async function markAttendanceExportDownloadedAction(formData: FormData) {
  const parsed = hrAttendanceExportBatchActionSchema.parse({ batchId: String(formData.get("batchId") ?? "") });
  const { service } = await exportService(HR_PERMISSIONS.attendanceExport);
  await service.markExportDownloaded(parsed.batchId);
  revalidateExportPaths();
}

export async function reExportAttendanceBatchAction(formData: FormData) {
  const parsed = hrAttendanceExportBatchActionSchema.parse({ batchId: String(formData.get("batchId") ?? "") });
  const { service } = await exportService(HR_PERMISSIONS.attendanceExport);
  await service.reExportBatch(parsed.batchId);
  revalidateExportPaths();
}
