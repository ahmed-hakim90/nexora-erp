"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrAttendanceDeviceService } from "../../application/services/hr-attendance-device.service";
import { HrWorkforceRuntimeService } from "../../application/services/hr-workforce-runtime.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export {
  approveOvertimeRequestAction,
  createOvertimeRequestAction,
  rejectOvertimeRequestAction,
} from "./hr-overtime-runtime.actions";

export { createLateEarlyPolicyAction } from "./hr-late-early-runtime.actions";

async function workforceService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return {
    context,
    deviceService: new HrAttendanceDeviceService(supabase, context),
    service: new HrWorkforceRuntimeService(supabase, context),
  };
}

export async function createAttendanceDeviceAction(formData: FormData) {
  const { context, deviceService } = await workforceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  await deviceService.createDevice({
    code: String(formData.get("code") ?? ""),
    deviceType: String(formData.get("deviceType") ?? "api_import"),
    ipAddress: String(formData.get("ipAddress") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    workLocationId: String(formData.get("workLocationId") ?? "") || undefined,
  });
  revalidatePath("/erp/hr/attendance-devices");
}

export async function syncAttendanceDeviceAction(deviceId: string) {
  const { context, deviceService } = await workforceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesSync });
  await deviceService.startSync(deviceId);
  revalidatePath("/erp/hr/attendance-devices");
}
