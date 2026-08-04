import { NextResponse } from "next/server";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HrAttendanceDeviceService } from "@/features/hr/server-api";
import { HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS } from "@/features/hr/server-api";
import { HR_PERMISSIONS } from "@/features/hr/server-api";
import type { HrAttendanceDeviceSyncStrategy } from "@/features/hr/server-api";

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const { searchParams } = new URL(request.url);
  const strategy = (searchParams.get("strategy") ?? "incremental") as HrAttendanceDeviceSyncStrategy;
  const branchContext = await resolveBranchRequestContext("erp");
  await requirePermission({ context: branchContext, permission: HR_PERMISSIONS.attendancePreview });
  const supabase = createRequestSupabaseClient({ accessToken: branchContext.accessToken });
  const service = new HrAttendanceDeviceService(supabase, branchContext);
  const payload = await service.getSyncStartContext(deviceId, {
    options: HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS,
    params: {},
    strategy,
  });
  return NextResponse.json(payload);
}
