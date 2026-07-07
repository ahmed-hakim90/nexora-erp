import { NextResponse } from "next/server";

import { formatDeviceDriverError } from "@/features/hr/application/device-drivers/device-driver-error";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/permissions/permission-registry";
import { advanceHrAttendanceDeviceSyncAction } from "@/features/hr/routes/actions/hr-attendance-device.actions";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
) {
  try {
    const { sessionId } = await context.params;
    const requestContext = await resolveBranchRequestContext("erp");
    await requirePermission({ context: requestContext, permission: HR_PERMISSIONS.attendanceDevicesSync });
    const progress = await advanceHrAttendanceDeviceSyncAction(sessionId);
    return NextResponse.json(progress);
  } catch (cause) {
    const message = formatDeviceDriverError(cause);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
