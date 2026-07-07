"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrShiftRuntimeService } from "../../application/services/hr-shift-runtime.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function shiftService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrShiftRuntimeService(supabase, context) };
}

export async function createShiftDefinitionAction(formData: FormData) {
  const { context, service } = await shiftService();
  await requirePermission({ context, permission: HR_PERMISSIONS.shiftsManage });

  await service.createShiftDefinition({
    code: String(formData.get("code") ?? ""),
    crossesMidnight: formData.get("crossesMidnight") === "on",
    endTime: String(formData.get("endTime") ?? "17:00"),
    name: String(formData.get("name") ?? ""),
    shiftKind: String(formData.get("shiftKind") ?? "morning"),
    startTime: String(formData.get("startTime") ?? "09:00"),
  });

  revalidatePath("/erp/hr/shifts");
}

export async function assignEmployeeShiftAction(formData: FormData) {
  const { context, service } = await shiftService();
  await requirePermission({ context, permission: HR_PERMISSIONS.shiftsManage });

  const employeeId = String(formData.get("employeeId") ?? "");
  const { data: profile } = await createRequestSupabaseClient({ accessToken: context.accessToken })
    .from("hr_employment_profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile) return;

  await service.assignEmployeeShiftSchedule({
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
    effectiveFrom: String(formData.get("effectiveFrom") ?? new Date().toISOString().slice(0, 10)),
    employeeId,
    employmentProfileId: String(profile.id),
    shiftId: String(formData.get("shiftId") ?? ""),
    weekIndex: Number(formData.get("weekIndex") ?? 0),
  });

  revalidatePath("/erp/hr/shifts");
}
